
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Restaurant } from '@/types';
import { addRestaurantToFirestore } from '@/lib/firestoreService';
import { cuisines } from '@/data/cuisines';
import { Loader2, Camera, UploadCloud, Video, VideoOff } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - Recommended to keep for uploads
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const addRestaurantSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del restaurante debe tener al menos 2 caracteres.' }),
  cuisine: z.string().min(1, { message: 'Por favor, selecciona una categoría.' }),
  address: z.string().min(5, { message: 'La dirección debe tener al menos 5 caracteres.' }),
  image: z
    .custom<File>() 
    .refine((file) => file?.size <= MAX_FILE_SIZE, `El tamaño máximo del archivo es 5MB.`)
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null); // Ref for the file input
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);


  const form = useForm<AddRestaurantFormData>({
    resolver: zodResolver(addRestaurantSchema),
    defaultValues: {
      name: '',
      cuisine: '',
      address: '',
      image: undefined,
    },
  });

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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
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
        description: 'Por favor, habilita los permisos de cámara en tu navegador.',
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
    setStream(null);
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);


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
                    <FormLabel>Cocina / Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={"Selecciona una categoría"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cuisines && cuisines.length > 0 ? (
                          cuisines.map((cuisineItem) => (
                            <SelectItem key={cuisineItem.id} value={cuisineItem.id}>
                              {cuisineItem.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="disabled" disabled>No hay cocinas disponibles</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Calle Principal 123, Cualquier Ciudad" {...field} />
                    </FormControl>
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
                    render={({ field: imageField }) => ( // Renamed field to imageField for clarity
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
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                ref={(instance) => {
                                  fileUploadInputRef.current = instance;
                                  imageField.ref(instance); // Connect RHF's ref
                                }}
                                onChange={(e) => {
                                  handleImageFileChange(e);
                                  // imageField.onChange(e.target.files?.[0]); // RHF can also track like this
                                }}
                                // name={imageField.name} // Not needed as Controller handles it
                                // onBlur={imageField.onBlur} // Not needed as Controller handles it
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
                        <Image src={imagePreview} alt="Vista previa de la imagen" layout="fill" objectFit="cover" />
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
