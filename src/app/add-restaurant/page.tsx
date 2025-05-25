
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import type { LatLngExpression, LatLng } from 'leaflet'; // Keep type import for LatLng
// Removed: import L from 'leaflet'; // Ensure no top-level L import
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Restaurant } from '@/types';
import { addRestaurantToFirestore } from '@/lib/firestoreService';
import { cuisines as allCuisines } from '@/data/cuisines';
import { Loader2, Camera, UploadCloud, VideoOff, ArrowLeft, MapPin } from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(mod => mod.useMapEvents), { ssr: false });


const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const DEFAULT_MAP_CENTER: LatLngExpression = [-12.046374, -77.042793];
const DEFAULT_MAP_ZOOM = 13;

const addRestaurantSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del restaurante debe tener al menos 2 caracteres.' }),
  cuisine: z.array(z.string()).min(1, { message: 'Por favor, selecciona al menos una categoría.' }),
  latitude: z.number({ required_error: "Por favor, selecciona una ubicación en el mapa." }),
  longitude: z.number({ required_error: "Por favor, selecciona una ubicación en el mapa." }),
  address: z.string().optional(),
  image: z
    .custom<File>()
    .refine((file) => !!file, "Se requiere una imagen.")
    .refine((file) => file?.size <= MAX_FILE_SIZE, `El tamaño máximo del archivo es 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type || ""),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    )
    .optional(),
});

type AddRestaurantFormData = z.infer<typeof addRestaurantSchema>;

function LocationMarker({ onPositionChange }: { onPositionChange: (latlng: LatLng) => void }) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const UseMapEvents = useMapEvents;

  if (!UseMapEvents) return null;

  const map = UseMapEvents({
    click(e) {
      setPosition(e.latlng);
      onPositionChange(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (!position && map) {
      // const initialCenter = map.getCenter();
    }
  }, [map, position, onPositionChange]);

  // Temporarily remove custom icon
  return position === null ? null : (
    <Marker position={position}>
      <Popup>Has seleccionado esta ubicación</Popup>
    </Marker>
  );
}


export default function AddRestaurantPage() {
  const { user, loadingAuthState } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [selectedMapPosition, setSelectedMapPosition] = useState<LatLngExpression | null>(null);

  // Temporarily remove L and ActualDefaultIcon state and effect
  // const [L, setL] = useState<typeof import('leaflet') | null>(null);
  // const [ActualDefaultIcon, setActualDefaultIcon] = useState<LeafletIcon | null>(null);

  const form = useForm<AddRestaurantFormData>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      name: '',
      cuisine: [],
      address: '',
      image: undefined,
    },
  });

   useEffect(() => {
    if (typeof window !== 'undefined') {
      setMapReady(true);
      // Temporarily remove L and ActualDefaultIcon setup
      // import('leaflet').then(leafletModule => {
      //   setL(leafletModule);
      //   const icon = leafletModule.icon({
      //     iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      //     shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      //     iconSize: [25, 41],
      //     iconAnchor: [12, 41],
      //     popupAnchor: [1, -34],
      //     shadowSize: [41, 41]
      //   });
      //   setActualDefaultIcon(icon);
      // });
    }
  }, []);


  useEffect(() => {
    if (!loadingAuthState && !user) {
      toast({
        title: 'Acceso Denegado',
        description: 'Debes iniciar sesión para agregar un restaurante.',
        variant: 'destructive',
      });
      router.replace('/');
    }
  }, [user, loadingAuthState, router, toast]);

  const getCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Cámara no Soportada',
        description: 'Tu navegador no soporta acceso a la cámara.',
      });
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setIsCameraOpen(false);
      toast({
        variant: 'destructive',
        title: 'Acceso a Cámara Denegado',
        description: 'Por favor, habilita los permisos de cámara en tu navegador o la cámara seleccionada no está disponible.',
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
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `restaurant-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            form.setValue('image', file, { shouldValidate: true });
            setImagePreview(URL.createObjectURL(file));
          }
        }, 'image/jpeg');
      }
      closeCamera();
      setIsTakingPhoto(false);
    }
  };

  useEffect(() => {
    return () => {
      if (stream && !isCameraOpen) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream, isCameraOpen]);

  const mutation = useMutation({
    mutationFn: (data: { restaurantData: Omit<Restaurant, 'id' | 'imageUrl' | 'description'>, imageFile?: File }) =>
      addRestaurantToFirestore(data.restaurantData, data.imageFile),
    onSuccess: (data) => {
      toast({
        title: '¡Restaurante Agregado!',
        description: `${data.name} ha sido agregado exitosamente a la lista.`,
      });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      form.reset();
      setImagePreview(null);
      setSelectedMapPosition(null);
      router.push('/');
    },
    onError: (error) => {
      toast({
        title: 'Error al Agregar Restaurante',
        description: error.message || 'No se pudo agregar el restaurante. Por favor, intenta de nuevo.',
        variant: 'destructive',
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
            description: "Por favor, toma una foto o sube una imagen para el restaurante.",
            variant: "destructive",
        });
        return;
    }
    if (restaurantData.latitude === undefined || restaurantData.longitude === undefined) {
      toast({
        title: "Ubicación Requerida",
        description: "Por favor, selecciona la ubicación del restaurante en el mapa.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ restaurantData, imageFile });
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('image', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('image', undefined);
      setImagePreview(null);
    }
    setIsTakingPhoto(false);
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
        <p className="text-muted-foreground">Por favor, inicia sesión para agregar un restaurante.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Ir a la Página Principal</Button>
      </div>
    );
  }

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
          <CardTitle className="text-2xl">Agregar un Nuevo Restaurante</CardTitle>
          <CardDescription>
            Completa los detalles a continuación para agregar un nuevo restaurante a nuestra lista.
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
                    <FormControl>
                       <div className="flex flex-wrap gap-2 pt-2">
                        {allCuisines.map((cuisineItem) => {
                          const isSelected = field.value?.includes(cuisineItem.id);
                          return (
                            <Button
                              key={cuisineItem.id}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={`rounded-full px-3 py-1 h-auto text-sm transition-colors duration-150 ease-in-out
                                          ${isSelected
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground'
                                          }`}
                              onClick={() => {
                                const currentValue = field.value || [];
                                if (isSelected) {
                                  field.onChange(currentValue.filter((id) => id !== cuisineItem.id));
                                } else {
                                  field.onChange([...currentValue, cuisineItem.id]);
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ubicación en el Mapa</FormLabel>
                     <FormDescription>
                       Haz clic en el mapa para seleccionar la ubicación del restaurante.
                     </FormDescription>
                    {mapReady ? ( // Simplified condition, relying on dynamic import for react-leaflet components
                      <MapContainer
                        center={selectedMapPosition || DEFAULT_MAP_CENTER}
                        zoom={DEFAULT_MAP_ZOOM}
                        scrollWheelZoom={true}
                        style={{ height: '300px', width: '100%', borderRadius: 'var(--radius)' }}
                        className="z-0"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker
                          onPositionChange={(latlng) => {
                            setSelectedMapPosition([latlng.lat, latlng.lng]);
                            form.setValue('latitude', latlng.lat, { shouldValidate: true });
                            form.setValue('longitude', latlng.lng, { shouldValidate: true });
                          }}
                        />
                      </MapContainer>
                    ) : (
                      <div className="h-[300px] w-full flex items-center justify-center bg-muted rounded-md">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2">Cargando mapa...</p>
                      </div>
                    )}
                    <FormMessage />
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
                      <Input placeholder="Ej: Calle Principal 123, Cualquier Ciudad" {...field} />
                    </FormControl>
                    <FormDescription>Puedes agregar una dirección textual como referencia.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isTakingPhoto && isCameraOpen ? (
                 <div className="space-y-4">
                   <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden border">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
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
                    <Button type="button" onClick={capturePhoto} className="w-full" disabled={hasCameraPermission === false}>
                        <Camera className="mr-2 h-4 w-4" /> Capturar Foto
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { closeCamera(); setIsTakingPhoto(false);}} className="w-full">
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
                        <div className="flex flex-col sm:flex-row gap-2">
                           <Button type="button" onClick={openCamera} variant="outline" className="flex-1">
                             <Camera className="mr-2 h-4 w-4" /> Tomar Foto
                           </Button>
                           <Button
                              type="button"
                              variant="outline"
                              className="flex-1"
                              onClick={() => fileUploadInputRef.current?.click()}
                            >
                              <UploadCloud className="mr-2 h-4 w-4" /> Subir Imagen
                            </Button>
                            <FormControl>
                              <Input
                                type="file"
                                className="sr-only"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                ref={(instance) => {
                                  fileUploadInputRef.current = instance;
                                  imageField.ref(instance);
                                }}
                                onChange={(e) => {
                                  handleImageFileChange(e);
                                  imageField.onChange(e.target.files?.[0]);
                                }}
                              />
                            </FormControl>
                        </div>
                        <FormDescription>
                          Toma una foto o sube una imagen (JPG, PNG, WebP, max 5MB).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {imagePreview && (
                    <div className="mt-4">
                      <FormLabel>Vista Previa de la Imagen</FormLabel>
                      <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
                        <Image src={imagePreview} alt="Vista previa de la imagen" fill style={{ objectFit: 'cover' }} />
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button type="submit" className="w-full" disabled={mutation.isPending || (isTakingPhoto && isCameraOpen)}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agregando...
                  </>
                ) : (
                  'Agregar Restaurante'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    