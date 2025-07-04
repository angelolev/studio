
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription as UIFormDescription,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StarRating from "./StarRating";
import type { Review as AppReviewType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  addReviewToFirestore,
  type AddedReviewPlain,
  type ReviewFirestoreData,
} from "@/lib/firestoreService";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Camera, UploadCloud, VideoOff, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE_REVIEW = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const reviewSchema = z.object({
  rating: z.number().min(1, "La calificación es requerida").max(5),
  text: z
    .string()
    .min(10, "La opinión debe tener al menos 10 caracteres")
    .max(500, "La opinión debe tener menos de 500 caracteres"),
  image: z
    .custom<File>()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE_REVIEW,
      `El tamaño máximo del archivo es 5MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file?.type || ""),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    )
    .optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  restaurantId: string;
  onReviewAdded: (newReview: AppReviewType) => void;
}

// Type for the data passed to the mutationFn, aligning with addReviewToFirestore's payload
type AddReviewMutationPayload = Omit<ReviewFirestoreData, "timestamp" | "restaurantId"> & { imageUrl?: string };


export default function ReviewForm({
  restaurantId,
  onReviewAdded,
}: ReviewFormProps) {
  const { user, loadingAuthState } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [isUploadingClientSide, setIsUploadingClientSide] = useState(false);


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reviewFileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      text: "",
      image: undefined,
    },
  });

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
          .catch((err) => console.error("Error playing video for review:", err));
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
            const file = new File([blob], `review-capture-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
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

  const removeImage = () => {
    setImagePreview(null);
    form.setValue("image", undefined, { shouldValidate: true });
    if (reviewFileUploadInputRef.current) {
      reviewFileUploadInputRef.current.value = "";
    }
  };

  const addReviewMutation = useMutation({
    mutationFn: (payload: AddReviewMutationPayload) => 
      addReviewToFirestore(restaurantId, payload),
    onSuccess: (newPlainReview: AddedReviewPlain) => {
      toast({
        title: "¡Opinión Enviada!",
        description: "Gracias por tus comentarios.",
      });

      const newAppReview: AppReviewType = {
        id: newPlainReview.id,
        userId: newPlainReview.userId,
        userName: newPlainReview.userName,
        userPhotoUrl: newPlainReview.userPhotoUrl,
        restaurantId: newPlainReview.restaurantId,
        rating: newPlainReview.rating,
        text: newPlainReview.text,
        imageUrl: newPlainReview.imageUrl,
        timestamp: newPlainReview.timestamp,
      };

      onReviewAdded(newAppReview);
      form.reset();
      form.setValue("rating", 0);
      setImagePreview(null);
      setIsTakingPhoto(false);
      setIsCameraOpen(false);
      if(reviewFileUploadInputRef.current) reviewFileUploadInputRef.current.value = "";

      queryClient.invalidateQueries({ queryKey: ["reviews", restaurantId] });
      queryClient.invalidateQueries({
        queryKey: ["userReviewed", restaurantId, user?.uid],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la opinión.",
        variant: "destructive",
      });
    },
    onSettled: () => {
        setIsUploadingClientSide(false);
    }
  });

  const onSubmit: SubmitHandler<ReviewFormData> = async (data) => {
    if (!user) {
      toast({
        title: "Autenticación Requerida",
        description: "Por favor, inicia sesión para dejar una opinión.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingClientSide(true); 
    // addReviewMutation.setPending(); // This line was causing the error and has been removed

    const { image, ...reviewCoreData } = data;
    const imageFile = image instanceof File ? image : undefined;
    let reviewImageUrl: string | undefined = undefined;

    if (imageFile) {
      try {
        const imageName = `${uuidv4()}-${imageFile.name}`;
        const imageStoragePath = `review-images/${restaurantId}/${user.uid}/${imageName}`;
        const imageStorageRefInstance = storageRef(storage, imageStoragePath);
        
        toast({ title: "Subiendo imagen...", description: "Por favor espera."});
        const snapshot = await uploadBytes(imageStorageRefInstance, imageFile);
        reviewImageUrl = await getDownloadURL(snapshot.ref);
        toast({ title: "Imagen subida", description: "Tu imagen se ha subido con éxito."});
      } catch (error) {
        console.error("Error uploading review image to Firebase Storage: ", error);
        toast({
          title: "Error al Subir Imagen",
          description: "No se pudo subir la imagen. La opinión se enviará sin ella.",
          variant: "destructive",
        });
         // No need to set setIsUploadingClientSide(false) here, onSettled will handle it
      }
    }

    const reviewPayload: AddReviewMutationPayload = {
      userId: user.uid,
      userName: user.displayName,
      userPhotoUrl: user.photoURL,
      rating: reviewCoreData.rating,
      text: reviewCoreData.text,
      ...(reviewImageUrl && { imageUrl: reviewImageUrl }),
    };
    
    // If image upload failed but we want to proceed, or if no image, mutate directly.
    // If image upload succeeded, also mutate.
    // The isUploadingClientSide state will be reset by onSettled.
    addReviewMutation.mutate(reviewPayload);
  };


  if (loadingAuthState) {
    return (
      <div className="flex items-center justify-center p-4 my-4 min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando formulario...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-muted-foreground">
        Por favor, inicia sesión para dejar una opinión.
      </p>
    );
  }

  const isSubmitting = isUploadingClientSide || addReviewMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tu Calificación</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onRate={(rate) => {
                    field.onChange(rate);
                  }}
                  size={24} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tu Opinión</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cuéntanos sobre tu experiencia..."
                  {...field}
                  ref={(e) => {
                    field.ref(e);
                    textareaRef.current = e;
                  }}
                  rows={4}
                  className="bg-card focus-visible:border-primary"
                />
              </FormControl>
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
                <Alert
                  variant="destructive"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4"
                >
                  <VideoOff className="mr-2 h-5 w-5" />
                  <AlertTitle>Acceso a Cámara Denegado</AlertTitle>
                  <AlertDescription>
                    Revisa los permisos de cámara de tu navegador.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={capturePhoto}
                className="w-full"
                disabled={hasCameraPermission !== true || !currentStream || isSubmitting}
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
                disabled={isSubmitting}
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
                  <FormLabel>Agregar Foto (Opcional)</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={openCamera}
                      variant="default"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      <Camera className="mr-2 h-4 w-4" /> Tomar Foto
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      className="flex-1"
                      onClick={() => reviewFileUploadInputRef.current?.click()}
                      disabled={isSubmitting}
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
                           reviewFileUploadInputRef.current = instance; 
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          imageField.onChange(file || undefined); 
                          
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setImagePreview(null);
                          }
                          setIsTakingPhoto(false); 
                        }}
                        onBlur={imageField.onBlur}
                        name={imageField.name}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </div>
                  <UIFormDescription>
                    JPG, PNG, WebP, max 5MB.
                  </UIFormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {imagePreview && (
              <div className="mt-4">
                <FormLabel>Vista Previa</FormLabel>
                <div className="relative w-full aspect-video max-h-60 rounded-md overflow-hidden border group">
                  <Image
                    src={imagePreview}
                    alt="Vista previa de imagen para la opinión"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                   <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={removeImage}
                    aria-label="Eliminar imagen"
                    disabled={isSubmitting}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isSubmitting || (isTakingPhoto && isCameraOpen && !currentStream)}
          variant="default"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Opinión"
          )}
        </Button>
      </form>
    </Form>
  );
}
