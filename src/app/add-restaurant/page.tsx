
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Map as LeafletMapType,
  Icon as LeafletIconType,
} from "leaflet";
import dynamic from "next/dynamic";

// Import marker images for explicit path usage
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
  FormDescription as UIFormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Alert as UIAlert,
  AlertDescription as UIAlertDescription,
  AlertTitle as UIAlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant } from "@/types";
import { addRestaurantToFirestore, checkRestaurantExistsByName } from "@/lib/firestoreService";
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
      <div className="h-[250px] w-full flex items-center justify-center bg-muted rounded-md">
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
const DynamicLeafletMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const DynamicLeafletPopup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);


interface LocationMarkerProps {
  position: LatLng | null;
  onMapClick: (latlng: LatLng) => void;
  icon: LeafletIconType | null;
  MarkerComponent: typeof DynamicLeafletMarker | null; // Allow null for conditional rendering
  PopupComponent: typeof DynamicLeafletPopup | null; // Allow null
  L: typeof import('leaflet') | null;
}

function LocationMarker({
  position,
  onMapClick,
  icon,
  MarkerComponent,
  PopupComponent,
  L
}: LocationMarkerProps) {
  const { useMapEvents } = require("react-leaflet");

  useMapEvents({
    click(e) {
      if (L) { // Ensure L is available
        onMapClick(L.latLng(e.latlng.lat, e.latlng.lng));
      }
    },
  });

  if (!position || !icon || !MarkerComponent || !PopupComponent || !L) {
    return null;
  }

  return (
    <MarkerComponent position={position} icon={icon}>
      <PopupComponent>Has seleccionado esta ubicación</PopupComponent>
    </MarkerComponent>
  );
}


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

export default function AddRestaurantPage() {
  const { user, loadingAuthState } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [L, setL] = useState<typeof import('leaflet') | null>(null);
  const [mapMarkerIcon, setMapMarkerIcon] = useState<LeafletIconType | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
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
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const [selectedMapPosition, setSelectedMapPosition] = useState<LatLng | null>(null);

  const [isDuplicateAlertOpen, setIsDuplicateAlertOpen] = useState(false);
  const [restaurantDataForSubmission, setRestaurantDataForSubmission] = useState<AddRestaurantFormData | null>(null);

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
    if (!mapReady) {
      import('leaflet')
        .then((leafletModule) => {
          if (!isMounted) return;
          // Explicitly configure default icon paths
          const icon = new leafletModule.Icon({
            iconUrl: '/images/leaflet/marker-icon.png',
            iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
            shadowUrl: '/images/leaflet/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });
          
          setL(leafletModule);
          setMapMarkerIcon(icon); // Use the created icon instance
          setMapReady(true); 
        })
        .catch(error => {
          console.error("Failed to load Leaflet module or create icon in AddRestaurantPage", error);
          if (isMounted) {
            toast({ title: "Error del Mapa", description: "No se pudo cargar la librería del mapa.", variant: "destructive" });
          }
        });
    }
    return () => { 
      isMounted = false; 
    };
  }, [mapReady, toast]);


  useEffect(() => {
    let isMounted = true;
    if (
      mapReady && 
      L && 
      navigator.geolocation &&
      !form.getValues("latitude") && 
      !form.getValues("longitude")
    ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          const userLatLng = L.latLng( // Use L here
            position.coords.latitude,
            position.coords.longitude
          );
          setCurrentMapCenter([userLatLng.lat, userLatLng.lng]);
          if (mapRef.current) {
            mapRef.current.flyTo(userLatLng, DEFAULT_MAP_ZOOM + 2);
          }
        },
        (error) => {
          if (!isMounted) return;
          console.warn(`Error obteniendo geolocalización: ${error.message}`);
           if (mapRef.current && L) { // Ensure L is available
            mapRef.current.flyTo(DEFAULT_MAP_CENTER_LIMA, DEFAULT_MAP_ZOOM);
          }
        },
        { timeout: 10000 }
      );
    }
    return () => { isMounted = false; };
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

  const requestCameraAccess = async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        variant: "destructive",
        title: "Cámara no Soportada",
        description: "Tu navegador no soporta acceso a la cámara.",
      });
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      setIsTakingPhoto(false);
      return null;
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setHasCameraPermission(true);
      return newStream;
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      setIsTakingPhoto(false);
      toast({
        variant: "destructive",
        title: "Acceso a Cámara Denegado",
        description:
          "Por favor, habilita los permisos de cámara en tu navegador o la cámara seleccionada no está disponible.",
      });
      return null;
    }
  };

  const openCamera = async () => {
    setIsTakingPhoto(true);
    setIsCameraOpen(true);
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      setCurrentStream(null);
    }
    const newStream = await requestCameraAccess();
    if (newStream) {
      setCurrentStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current
          .play()
          .catch((err) => console.error("Error playing video:", err));
      }
    }
  };

  const closeCamera = () => {
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      setCurrentStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && currentStream) {
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
    const streamToClean = currentStream;
    return () => {
      if (streamToClean) {
        streamToClean.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentStream]);

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
       if (mapRef.current && L) { // Ensure L is available
        mapRef.current.setView(DEFAULT_MAP_CENTER_LIMA, DEFAULT_MAP_ZOOM);
      }
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

  const proceedWithSubmission = (data: AddRestaurantFormData) => {
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
  }

  const onSubmit: SubmitHandler<AddRestaurantFormData> = async (data) => {
    const exists = await checkRestaurantExistsByName(data.name);
    if (exists) {
      setRestaurantDataForSubmission(data);
      setIsDuplicateAlertOpen(true);
    } else {
      proceedWithSubmission(data);
    }
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
     if (!mapReady || !L) { 
      toast({
        title: "Mapa no listo",
        description: "Por favor, espera a que el mapa cargue.",
        variant: "default",
      });
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
            description:
              "No se pudo obtener tu ubicación actual. " + error.message,
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

  const handleMapClick = useCallback(
    (latlng: LatLng) => {
      setSelectedMapPosition(latlng);
      form.setValue("latitude", latlng.lat, {
        shouldValidate: true,
      });
      form.setValue("longitude", latlng.lng, {
        shouldValidate: true,
      });
    },
    [form]
  );

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
    
  const canRenderMap = mapReady && L && mapMarkerIcon && LeafletMapContainer && LeafletTileLayer && DynamicLeafletMarker && DynamicLeafletPopup;


  return (
    <div className="max-w-2xl mx-auto pb-28 relative"> {/* pb-28 for fixed buttons */}
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
            <form onSubmit={form.handleSubmit(onSubmit)} id="add-restaurant-form" className="space-y-6">
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
                    <UIFormDescription>
                      Selecciona una o más categorías para el restaurante.
                    </UIFormDescription>
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
                              variant={isSelected ? "default" : "secondary"}
                              size="sm"
                              className={`rounded-full px-3 py-1 h-auto text-sm transition-colors duration-150 ease-in-out`}
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
                    <div className="flex justify-between items-center mb-1">
                      <FormLabel>Ubicación en el Mapa</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={centerMapOnUser}
                        className="gap-1.5"
                        disabled={!mapReady || !L}
                      >
                        <LocateFixed size={16} />
                        Usar mi ubicación
                      </Button>
                    </div>
                    <UIFormDescription>
                      Haz clic en el mapa para seleccionar la ubicación del
                      restaurante.
                    </UIFormDescription>
                     {canRenderMap ? (
                      <LeafletMapContainer
                        center={displayCenter}
                        zoom={DEFAULT_MAP_ZOOM}
                        style={{
                          height: "250px",
                          width: "100%",
                          borderRadius: "6px",
                          zIndex: 0, 
                        }}
                        scrollWheelZoom={true}
                        ref={mapRef}
                      >
                        <LeafletTileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker
                          position={selectedMapPosition}
                          onMapClick={handleMapClick}
                          icon={mapMarkerIcon}
                          MarkerComponent={DynamicLeafletMarker}
                          PopupComponent={DynamicLeafletPopup}
                          L={L}
                        />
                      </LeafletMapContainer>
                    ) : (
                      <div className="h-[250px] w-full flex items-center justify-center bg-muted rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2">Cargando mapa...</p>
                      </div>
                    )}
                    {latitudeFieldState.error && (
                      <FormMessage>
                        {latitudeFieldState.error.message}
                      </FormMessage>
                    )}
                    {form.formState.errors.longitude &&
                      !latitudeFieldState.error && (
                        <FormMessage>
                          {form.formState.errors.longitude.message}
                        </FormMessage>
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
                    <UIFormDescription>
                      Puedes agregar una dirección textual como referencia.
                    </UIFormDescription>
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
                     { !(hasCameraPermission) && (
                        <UIAlert variant="destructive" className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
                            <VideoOff className="mr-2 h-5 w-5" />
                            <UIAlertTitle>Acceso a Cámara Denegado</UIAlertTitle>
                            <UIAlertDescription>
                                Revisa los permisos de cámara de tu navegador.
                            </UIAlertDescription>
                        </UIAlert>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="w-full"
                      disabled={hasCameraPermission !== true || !currentStream}
                      variant="outline"
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
                    render={({ field: imageField }) => (
                      <FormItem>
                        <FormLabel>Imagen del Restaurante</FormLabel>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={openCamera}
                            variant="default"
                            className="flex-1"
                          >
                            <Camera className="mr-2 h-4 w-4" /> Tomar Foto
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            className="flex-1"
                            onClick={() => fileUploadInputRef.current?.click()}
                          >
                            <UploadCloud className="mr-2 h-4 w-4" /> Subir Imagen
                          </Button>
                          <FormControl>
                            <Input
                              type="file"
                              className="sr-only"
                              accept={ACCEPTED_IMAGE_TYPES.join(",")}
                              ref={(instance) => {
                                imageField.ref(instance);
                                fileUploadInputRef.current = instance;
                              }}
                              onChange={(e) => {
                                handleImageFileChange(e);
                                if (typeof imageField.onChange === "function") {
                                  const files = e.target.files;
                                  imageField.onChange(
                                    files ? files[0] : undefined
                                  );
                                }
                              }}
                              onBlur={imageField.onBlur}
                              name={imageField.name}
                            />
                          </FormControl>
                        </div>
                        <UIFormDescription>
                          Toma una foto o sube una imagen (JPG, PNG, WebP, max 5MB).
                        </UIFormDescription>
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
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg z-30
                      md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
          <Button
            type="submit"
            form="add-restaurant-form" 
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90" 
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
          <Button
            variant="destructive" 
            onClick={() => router.push("/")}
            className="w-full sm:w-auto" 
          >
            Cerrar
          </Button>
        </div>
      </div>
      
      <AlertDialog open={isDuplicateAlertOpen} onOpenChange={setIsDuplicateAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurante Duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Ya existe un restaurante con el nombre "{restaurantDataForSubmission?.name}".
              ¿Estás seguro de que quieres agregarlo de todas formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setRestaurantDataForSubmission(null)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restaurantDataForSubmission) {
                  proceedWithSubmission(restaurantDataForSubmission);
                }
                setIsDuplicateAlertOpen(false);
                setRestaurantDataForSubmission(null);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
