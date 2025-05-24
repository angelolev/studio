"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import StarRating from "./StarRating";
import type { Review as AppReviewType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  addReviewToFirestore,
  type AddedReviewPlain,
} from "@/lib/firestoreService";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const reviewSchema = z.object({
  rating: z.number().min(1, "La calificación es requerida").max(5),
  text: z
    .string()
    .min(10, "La opinión debe tener al menos 10 caracteres")
    .max(500, "La opinión debe tener menos de 500 caracteres"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  restaurantId: string;
  onReviewAdded: (newReview: AppReviewType) => void;
}

export default function ReviewForm({
  restaurantId,
  onReviewAdded,
}: ReviewFormProps) {
  const { user, loadingAuthState } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      text: "",
    },
  });

  const addReviewMutation = useMutation({
    mutationFn: (
      reviewData: Omit<ReviewFirestoreData, "timestamp" | "restaurantId">
    ) => addReviewToFirestore(restaurantId, reviewData),
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
        timestamp: newPlainReview.timestamp,
      };

      onReviewAdded(newAppReview);
      form.reset();
      form.setValue("rating", 0);

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
  });

  const onSubmit: SubmitHandler<ReviewFormData> = (data) => {
    if (!user) {
      toast({
        title: "Autenticación Requerida",
        description: "Por favor, inicia sesión para dejar una opinión.",
        variant: "destructive",
      });
      return;
    }

    const reviewData: Omit<ReviewFirestoreData, "timestamp" | "restaurantId"> =
      {
        userId: user.uid,
        userName: user.displayName,
        userPhotoUrl: user.photoURL,
        rating: data.rating,
        text: data.text,
      };
    addReviewMutation.mutate(reviewData);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-2">
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
                  rows={4}
                  className="bg-card"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={addReviewMutation.isPending}
        >
          {addReviewMutation.isPending ? (
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
