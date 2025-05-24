"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import type { Restaurant } from "@/types";
import type { Review as AppReviewType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import ReviewSummary from "./ReviewSummary";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReviewsFromFirestore,
  checkIfUserReviewed,
  type ReviewWithNumericTimestamp,
} from "@/lib/firestoreService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cuisines as allCuisines } from "@/data/cuisines";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { user, loadingAuthState } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const restaurantReviewsQueryKey = ["reviews", restaurant.id];
  const userReviewedQueryKey = ["userReviewed", restaurant.id, user?.uid];

  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
    error: reviewsError,
  } = useQuery<ReviewWithNumericTimestamp[], Error, AppReviewType[]>({
    queryKey: restaurantReviewsQueryKey,
    queryFn: () => getReviewsFromFirestore(restaurant.id),
    enabled: isDialogOpen,
    staleTime: 5 * 60 * 1000,
    select: (data) =>
      data.map((review) => ({
        ...review,
        timestamp: review.timestamp,
      })),
  });

  const {
    data: userHasAlreadyReviewed,
    isLoading: isLoadingUserReviewedCheck,
  } = useQuery<boolean, Error>({
    queryKey: userReviewedQueryKey,
    queryFn: () => checkIfUserReviewed(restaurant.id, user!.uid),
    enabled: isDialogOpen && !!user && !loadingAuthState,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (reviewsError) {
      toast({
        title: "Error",
        description:
          "No se pudieron cargar las opiniones. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive",
      });
    }
  }, [reviewsError, toast]);

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      return totalRating / reviews.length;
    }
    return 0;
  }, [reviews]);

  const reviewCount = useMemo(() => reviews.length, [reviews]);

  const handleReviewAdded = (newReview: AppReviewType) => {
    queryClient.invalidateQueries({ queryKey: restaurantReviewsQueryKey });
    queryClient.invalidateQueries({ queryKey: userReviewedQueryKey });
  };

  const showReviewForm = useMemo(() => {
    if (loadingAuthState || isLoadingUserReviewedCheck) return false;
    if (!user) return false;
    return !userHasAlreadyReviewed;
  }, [
    user,
    loadingAuthState,
    userHasAlreadyReviewed,
    isLoadingUserReviewedCheck,
  ]);

  const cuisineName = useMemo(() => {
    const foundCuisine = allCuisines.find((c) => c.id === restaurant.cuisine);
    return foundCuisine ? foundCuisine.name : restaurant.cuisine;
  }, [restaurant.cuisine]);

  const imageHint = useMemo(() => {
    if (restaurant.imageUrl.startsWith("https://placehold.co")) {
      const cuisineForHint = allCuisines.find(
        (c) => c.id === restaurant.cuisine
      );
      if (cuisineForHint && cuisineForHint.name) {
        return cuisineForHint.name.split(" ")[0].toLowerCase();
      }
      return "logo restaurante";
    }
    return undefined;
  }, [restaurant.imageUrl, restaurant.cuisine]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card
          className="flex items-center p-3 sm:p-4 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg w-full cursor-pointer"
          aria-label={`Ver detalles y opiniones de ${restaurant.name}`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsDialogOpen(true);
            }
          }}
        >
          <div className="flex-shrink-0">
            <Image
              src={restaurant.imageUrl}
              alt={`${restaurant.name} logo`}
              width={64}
              height={64}
              className="rounded-md object-cover aspect-square"
              data-ai-hint={imageHint}
            />
          </div>

          <div className="ml-3 sm:ml-4 flex-grow min-w-0 pr-2">
            <h3
              className="text-base sm:text-lg font-semibold truncate"
              title={restaurant.name}
            >
              {restaurant.name}
            </h3>
            <p
              className="text-xs sm:text-sm text-muted-foreground truncate"
              title={cuisineName}
            >
              {cuisineName}
            </p>
          </div>

          <div
            className="ml-auto flex-shrink-0 flex flex-col items-center text-center p-1 sm:p-2 h-auto"
            aria-label={`Ver detalles y opiniones de ${restaurant.name}`}
          >
            <StarRating rating={averageRating} readOnly size={16} />
            <span className="text-xs text-muted-foreground mt-0.5">
              ({reviewCount} opinion{reviewCount === 1 ? "" : "es"})
            </span>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{restaurant.name}</DialogTitle>
          <DialogDescription className="text-base">
            {cuisineName}
          </DialogDescription>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <MapPin size={14} className="mr-1.5 shrink-0" />
            <span>{restaurant.address}</span>
          </div>
          <div className="flex items-center pt-2">
            <StarRating rating={averageRating} readOnly />
            <span className="ml-2 text-sm text-muted-foreground">
              Basado en {reviewCount} opinion{reviewCount === 1 ? "" : "es"}
            </span>
          </div>
        </DialogHeader>
        <Separator className="my-4" />
        <div className="overflow-y-auto flex-grow pr-2 space-y-6">
          <ReviewSummary
            restaurantName={restaurant.name}
            reviews={reviews.map((r) => r.text)}
          />

          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              Opiniones
            </h3>
            {isLoadingReviews && (
              <div className="flex items-center justify-center p-4 my-4 min-h-[100px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">
                  Cargando opiniones...
                </p>
              </div>
            )}
            {!isLoadingReviews && reviewsError && (
              <p className="text-destructive">Error al cargar opiniones.</p>
            )}
            {!isLoadingReviews && !reviewsError && (
              <ReviewList reviews={reviews} />
            )}
          </div>

          {loadingAuthState && (
            <div className="flex items-center justify-center p-4 my-4 min-h-[50px]">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground text-sm">
                Verificando estado de autenticación...
              </p>
            </div>
          )}

          {!loadingAuthState && !user && (
            <p className="text-center text-sm p-4 bg-accent/10 text-accent-foreground rounded-md border border-accent/30">
              Inicia sesión para dejar tu opinión.
            </p>
          )}

          {!loadingAuthState && user && isLoadingUserReviewedCheck && (
            <div className="flex items-center justify-center p-4 my-4 min-h-[50px]">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground text-sm">
                Comprobando si ya opinaste...
              </p>
            </div>
          )}

          {!loadingAuthState &&
            user &&
            !isLoadingUserReviewedCheck &&
            showReviewForm && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  Deja tu Opinión
                </h3>
                <ReviewForm
                  restaurantId={restaurant.id}
                  onReviewAdded={handleReviewAdded}
                />
              </div>
            )}
          {!loadingAuthState &&
            user &&
            !isLoadingUserReviewedCheck &&
            !showReviewForm &&
            userHasAlreadyReviewed && (
              <p className="text-center text-sm p-4 bg-indigo-500 text-white rounded-md border border-accent/30 italic">
                Ya has dejado tu opinión en este restaurante. ¡Gracias por tu
                ayuda!
              </p>
            )}
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
