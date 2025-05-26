
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import type {
  LatLngExpression,
  LatLng,
  // Icon as LeafletIconType, // Not needed if using L.Icon.Default
  Map as LeafletMapType,
} from "leaflet";
import type leaflet from "leaflet";
import dynamic from "next/dynamic";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant } from "@/types";
import { addRestaurantToFirestore } from "@/lib/firestoreService";
import { cuisines as allCuisines } from "@/data/cuisines";
import {
  Loader2,
  Camera,
  UploadCloud,
  VideoOff,
  ArrowLeft,
  LocateFixed,
} from "lucide-react";

const LeafletMapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full flex items-center justify-center bg-muted rounded-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando mapa...</p>
      </div>
    ),
  }
);
const LeafletTileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const LeafletMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const LeafletPopup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const useMapEvents = dynamic(
  () => import("react-leaflet").then((mod) => mod.useMapEvents),
  { ssr: false }
);

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const DEFAULT_MAP_CENTER_LIMA: LatLngExpression = [-12.046374, -77.042793];
const DEFAULT_MAP_ZOOM = 15;

const addRestaurantSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre del restaurante debe tener al menos 2 caracteres.",
  }),
  cuisine: z
    .array(z.string())
    .min(1, { message: "Por favor, selecciona al menos una categoría." }),
  latitude: z.number({
    required_error: "Por favor, selecciona una ubicación en el mapa.",
    invalid_type_error: "La latitud debe ser un número.",
  }),
  longitude: z.number({
    required_error: "Por favor, selecciona una ubicación en el mapa.",
    invalid_type_error: "La longitud debe ser un número.",
  }),
  address: z.string().optional(),
  image: z
    .custom<File>()
    .refine((file) => !!file, "Se requiere una imagen.")
    .refine(
      (file) => file?.size <= MAX_FILE_SIZE,
      `El tamaño máximo del archivo es 5MB.`
    )
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type || ""),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    )
    .optional(),
});

type AddRestaurantFormData = z.infer<typeof addRestaurantSchema>;

interface LocationMarkerProps {
  onPositionChange: (latlng: LatLng) => void;
  initialPosition?: LatLng | null;
  L: typeof leaflet | null;
  // ConfiguredIcon prop is removed; LocationMarker will use L.Icon.Default if L is available
}

function LocationMarker({
  onPositionChange,
  initialPosition,
  L,
}: LocationMarkerProps) {
  const [markerPosition, setMarkerPosition] = useState<LatLng | null>(
    initialPosition || null
  );
  const MapEventsHook = useMapEvents;

  MapEventsHook
    ? MapEventsHook({
        click(e) {
          if (!L) return;
          const newPosition = e.latlng as LatLng;
          setMarkerPosition(newPosition);
          onPositionChange(newPosition);
        },
      })
    : null;

  useEffect(() => {
    if (initialPosition) {
      setMarkerPosition(initialPosition);
    } else {
      setMarkerPosition(null);
    }
  }, [initialPosition]);

  if (!L || !markerPosition || !LeafletMarker || !LeafletPopup) {
    return null;
  }
  // Directly use L.Icon.Default assuming it's configured globally
  const icon = new L.Icon.Default();

  return (
    <LeafletMarker position={markerPosition} icon={icon}>
      <LeafletPopup>Has seleccionado esta ubicación</LeafletPopup>
    </LeafletMarker>
  );
}

export default function AddRestaurantPage() {
  const { user, loadingAuthState } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [L, setL] = useState<typeof leaflet | null>(null);
  const [isLeafletConfigured, setIsLeafletConfigured] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [currentMapCenter, setCurrentMapCenter] = useState<LatLngExpression>(
    DEFAULT_MAP_CENTER_LIMA
  );
  const mapRef = useRef<LeafletMapType | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [selectedMapPosition, setSelectedMapPosition] = useState<LatLng | null>(
    null
  );

  const form = useForm<AddRestaurantFormData>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      name: "",
      cuisine: [],
      address: "",
      image: undefined,
    },
  });

  useEffect(() => {
    let isMounted = true;
    if (!isLeafletConfigured) {
      import("leaflet").then((leafletModule) => {
        if (!isMounted) return;
        if (!leafletModule.Icon.Default.prototype._iconInit) {
          delete (leafletModule.Icon.Default.prototype as any)._getIconUrl;
          leafletModule.Icon.Default.mergeOptions({
            iconRetinaUrl: markerIcon2x.src,
            iconUrl: markerIcon.src,
            shadowUrl: markerShadow.src,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });
          leafletModule.Icon.Default.prototype._iconInit = true;
        }
        setL(leafletModule);
        setIsLeafletConfigured(true);
      }).catch(err => console.error("Error loading Leaflet in AddRestaurantPage:", err));
    }
    return () => {
      isMounted = false;
    };
  }, [isLeafletConfigured]); // Only re-run if isLeafletConfigured changes (e.g. from false to true)

  useEffect(() => {
    if (isLeafletConfigured) {
      setMapReady(true);
    }
  }, [isLeafletConfigured]);

  useEffect(() => {
    if (mapReady && L && navigator.geolocation) {
      if (form.getValues("latitude") === undefined && form.getValues("longitude") === undefined) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLatLng = L.latLng(
              position.coords.latitude,
              position.coords.longitude
            );
            setCurrentMapCenter([userLatLng.lat, userLatLng.lng]);
            if (mapRef.current) {
              mapRef.current.flyTo(userLatLng, DEFAULT_MAP_ZOOM + 2);
            }
          },
          (error) => {
            console.warn(`Error obteniendo geolocalización: ${error.message}`);
            setCurrentMapCenter(DEFAULT_MAP_CENTER_LIMA);
            if (mapRef.current) {
                 mapRef.current.flyTo(DEFAULT_MAP_CENTER_LIMA, DEFAULT_MAP_ZOOM);
            }
          },
          { timeout: 10000 }
        );
      }
    }
  }, [mapReady, L, form]);

  useEffect(() => {
    if (!loadingAuthState && !user) {
      toast({
        title: "Acceso Denegado",
        description: "Debes iniciar sesión para agregar un restaurante.",
        variant: "destructive",
      });
      router.replace("/");
    }
  }, [user, loadingAuthState, router, toast]);

  const getCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        variant: "destructive",
        title: "Cámara no Soportada",
        description: "Tu navegador no soporta acceso a la cámara.",
      });
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      toast({
        variant: "destructive",
        title: "Acceso a Cámara Denegado",
        description:
          "Por favor, habilita los permisos de cámara en tu navegador o la cámara seleccionada no está disponible.",
      });
    }
  };

  const openCamera = async () => {
    setIsTakingPhoto(true);
    setIsCameraOpen(true);
    if (hasCameraPermission === null || hasCameraPermission === false) {
      await getCameraPermission();
    } else if (hasCameraPermission === true && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File(
              [blob],
              `restaurant-capture-${Date.now()}.jpg`,
              { type: "image/jpeg" }
            );
            form.setValue("image", file, { shouldValidate: true });
            setImagePreview(URL.createObjectURL(file));
          }
        }, "image/jpeg");
      }
      closeCamera();
      setIsTakingPhoto(false);
    }
  };

  useEffect(() => {
    return () => {
      if (stream && !isCameraOpen) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream, isCameraOpen]);

  const mutation = useMutation({
    mutationFn: (data: {
      restaurantData: Omit<Restaurant, "id" | "imageUrl" | "description">;
      imageFile?: File;
    }) => addRestaurantToFirestore(data.restaurantData, data.imageFile),
    onSuccess: (data) => {
      toast({
        title: "¡Restaurante Agregado!",
        description: `${data.name} ha sido agregado exitosamente a la lista.`,
      });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      form.reset();
      setImagePreview(null);
      setSelectedMapPosition(null);
      setCurrentMapCenter(DEFAULT_MAP_CENTER_LIMA);
      if (mapRef.current)
        mapRef.current.setView(DEFAULT_MAP_CENTER_LIMA, DEFAULT_MAP_ZOOM);
      router.push("/");
    },
    onError: (error) => {
      toast({
        title: "Error al Agregar Restaurante",
        description:
          error.message ||
          "No se pudo agregar el restaurante. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit: SubmitHandler<AddRestaurantFormData> = (data) => {
    if (!user) return;
    const { image, ...restaurantData } = data;
    const imageFile = image instanceof File ? image : undefined;

    if (!imageFile && !imagePreview) {
      toast({
        title: "Imagen Requerida",
        description:
          "Por favor, toma una foto o sube una imagen para el restaurante.",
        variant: "destructive",
      });
      return;
    }
    if (
      restaurantData.latitude === undefined ||
      restaurantData.longitude === undefined
    ) {
      toast({
        title: "Ubicación Requerida",
        description:
          "Por favor, selecciona la ubicación del restaurante en el mapa.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ restaurantData, imageFile });
  };

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("image", file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("image", undefined, { shouldValidate: true });
      setImagePreview(null);
    }
    setIsTakingPhoto(false);
  };

  const centerMapOnUser = () => {
    if (!L || !isLeafletConfigured) { // Check isLeafletConfigured
      toast({ title: "Mapa no listo", description: "Por favor, espera a que el mapa cargue.", variant: "default" });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLatLng = L.latLng(
            position.coords.latitude,
            position.coords.longitude
          );
          form.setValue("latitude", userLatLng.lat, { shouldValidate: true });
          form.setValue("longitude", userLatLng.lng, { shouldValidate: true });
          setSelectedMapPosition(userLatLng);
          if (mapRef.current) {
            mapRef.current.flyTo(userLatLng, 18);
          }
        },
        (error) => {
          toast({
            title: "Error de Geolocalización",
            description: "No se pudo obtener tu ubicación actual. " + error.message,
            variant: "destructive",
          });
        },
        { timeout: 10000 }
      );
    } else {
      toast({
        title: "Geolocalización no Soportada",
        description: "Tu navegador no soporta geolocalización.",
        variant: "destructive",
      });
    }
  };

  if (loadingAuthState) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg">Cargando estado de autenticación...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <p className="text-lg text-destructive">Acceso Denegado.</p>
        <p className="text-muted-foreground">
          Por favor, inicia sesión para agregar un restaurante.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4">
          Ir a la Página Principal
        </Button>
      </div>
    );
  }

  const displayCenter = selectedMapPosition
    ? ([selectedMapPosition.lat, selectedMapPosition.lng] as LatLngExpression)
    : currentMapCenter;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <Link href="/" passHref legacyBehavior>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Página Principal
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Agregar un Nuevo Restaurante
          </CardTitle>
          <CardDescription>
            Completa los detalles a continuación para agregar un nuevo
            restaurante a nuestra lista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Restaurante</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: El Lugar Gourmet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cocina / Categorías</FormLabel>
                    <FormDescription>
                      Selecciona una o más categorías para el restaurante.
                    </FormDescription>
                    <FormControl>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {allCuisines.map((cuisineItem) => {
                          const isSelected = field.value?.includes(
                            cuisineItem.id
                          );
                          return (
                            <Button
                              key={cuisineItem.id}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`rounded-full px-3 py-1 h-auto text-sm transition-colors duration-150 ease-in-out
                                          ${
                                            isSelected
                                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                              : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                                          }`}
                              onClick={() => {
                                const currentValue = field.value || [];
                                if (isSelected) {
                                  field.onChange(
                                    currentValue.filter(
                                      (id) => id !== cuisineItem.id
                                    )
                                  );
                                } else {
                                  field.onChange([
                                    ...currentValue,
                                    cuisineItem.id,
                                  ]);
                                }
                              }}
                            >
                              {cuisineItem.name}
                            </Button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="latitude"
                render={({ fieldState: latitudeFieldState }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Ubicación en el Mapa</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={centerMapOnUser}
                        className="gap-1.5"
                        disabled={!isLeafletConfigured} // Disable if Leaflet not ready
                      >
                        <LocateFixed size={16} />
                        Usar mi ubicación
                      </Button>
                    </div>
                    <FormDescription>
                      Haz clic en el mapa para seleccionar la ubicación del
                      restaurante.
                    </FormDescription>
                    {mapReady && LeafletMapContainer && LeafletTileLayer && L && isLeafletConfigured ? (
                      <LeafletMapContainer
                        center={displayCenter}
                        zoom={DEFAULT_MAP_ZOOM}
                        scrollWheelZoom={true}
                        style={{
                          height: "300px",
                          width: "100%",
                          borderRadius: "var(--radius)",
                        }}
                        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
                      >
                        <LeafletTileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {MapEventsHook && (
                          <LocationMarker
                            onPositionChange={(latlng) => {
                              setSelectedMapPosition(latlng);
                              form.setValue("latitude", latlng.lat, {
                                shouldValidate: true,
                              });
                              form.setValue("longitude", latlng.lng, {
                                shouldValidate: true,
                              });
                            }}
                            initialPosition={selectedMapPosition}
                            L={L}
                          />
                        )}
                      </LeafletMapContainer>
                    ) : (
                      <div className="h-[300px] w-full flex items-center justify-center bg-muted rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2">Cargando mapa...</p>
                      </div>
                    )}
                    {latitudeFieldState.error && (
                      <FormMessage>
                        {latitudeFieldState.error.message}
                      </FormMessage>
                    )}
                    {form.formState.errors.longitude && !latitudeFieldState.error && (
                       <FormMessage>{form.formState.errors.longitude.message}</FormMessage>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Calle Principal 123, Cualquier Ciudad"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Puedes agregar una dirección textual como referencia.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isTakingPhoto && isCameraOpen ? (
                <div className="space-y-4">
                  <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden border">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                    />
                    {hasCameraPermission === false && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
                        <Alert variant="destructive">
                          <VideoOff className="mr-2 h-5 w-5" />
                          <AlertTitle>Acceso a Cámara Denegado</AlertTitle>
                          <AlertDescription>
                            Revisa los permisos de cámara de tu navegador.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full"
                      disabled={hasCameraPermission === false}
                    >
                      <Camera className="mr-2 h-4 w-4" /> Capturar Foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        closeCamera();
                        setIsTakingPhoto(false);
                      }}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="image"
                    render={(
                      { field: imageField }
                    ) => (
                      <FormItem>
                        <FormLabel>Imagen del Restaurante</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            onClick={openCamera}
                            variant="outline"
                            className="flex-1"
                          >
                            <Camera className="mr-2 h-4 w-4" /> Tomar Foto
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => fileUploadInputRef.current?.click()}
                          >
                            <UploadCloud className="mr-2 h-4 w-4" /> Subir
                            Imagen
                          </Button>
                          <FormControl>
                            <Input
                              type="file"
                              className="sr-only"
                              accept={ACCEPTED_IMAGE_TYPES.join(",")}
                              ref={(instance) => {
                                fileUploadInputRef.current = instance;
                                if (typeof imageField.ref === "function") {
                                  imageField.ref(instance);
                                }
                              }}
                              onChange={(e) => {
                                handleImageFileChange(e);
                                if (typeof imageField.onChange === "function") {
                                   const files = e.target.files;
                                   imageField.onChange(files ? files[0] : undefined);
                                }
                              }}
                              onBlur={imageField.onBlur}
                              name={imageField.name}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>
                          Toma una foto o sube una imagen (JPG, PNG, WebP, max
                          5MB).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {imagePreview && (
                    <div className="mt-4">
                      <FormLabel>Vista Previa de la Imagen</FormLabel>
                      <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
                        <Image
                          src={imagePreview}
                          alt="Vista previa de la imagen"
                          fill
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending || (isTakingPhoto && isCameraOpen)}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  "Agregar Restaurante"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
