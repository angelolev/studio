
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import type { Restaurant, Review as AppReviewType } from '@/types'; // Renamed to avoid conflict
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import ReviewSummary from './ReviewSummary';
import { useAuth } from '@/contexts/AuthContext';
import { getReviewsFromFirestore, checkIfUserReviewed, type ReviewWithId as FirestoreReview } from '@/lib/firestoreService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, MapPin, Loader2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

// Helper to convert FirestoreReview to AppReviewType
const mapFirestoreReviewToAppReview = (firestoreReview: FirestoreReview): AppReviewType => {
  return {
    ...firestoreReview,
    // Firestore timestamp needs to be converted to number if your AppReviewType expects number
    // For now, assuming AppReviewType's timestamp can handle Firestore Timestamp or is updated
    timestamp: firestoreReview.timestamp, // Keep as Firestore Timestamp for formatDistanceToNow
  };
};


export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { user, loadingAuthState } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const restaurantReviewsQueryKey = ['reviews', restaurant.id];
  const userReviewedQueryKey = ['userReviewed', restaurant.id, user?.uid];

  const { data: reviews = [], isLoading: isLoadingReviews, error: reviewsError } = useQuery<FirestoreReview[], Error, AppReviewType[]>({
    queryKey: restaurantReviewsQueryKey,
    queryFn: () => getReviewsFromFirestore(restaurant.id),
    enabled: isDialogOpen, // Only fetch when dialog is open
    select: (data) => data.map(mapFirestoreReviewToAppReview),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: userHasAlreadyReviewed, isLoading: isLoadingUserReviewedCheck } = useQuery<boolean, Error>({
    queryKey: userReviewedQueryKey,
    queryFn: () => checkIfUserReviewed(restaurant.id, user!.uid),
    enabled: isDialogOpen && !!user && !loadingAuthState, // Only fetch if dialog is open and user is loaded
    staleTime: 5 * 60 * 1000,
  });
  
  useEffect(() => {
    if (reviewsError) {
      toast({
        title: "Error",
        description: "Could not load reviews. Please try again later.",
        variant: "destructive",
      });
    }
  }, [reviewsError, toast]);

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      return totalRating / reviews.length;
    }
    return 0;
  }, [reviews]);

  const reviewCount = useMemo(() => reviews.length, [reviews]);

  const handleReviewAdded = (newReview: AppReviewType) => {
    // Optimistically update reviews list or refetch
    queryClient.invalidateQueries({ queryKey: restaurantReviewsQueryKey });
    queryClient.invalidateQueries({ queryKey: userReviewedQueryKey });
  };

  const showReviewForm = useMemo(() => {
    if (loadingAuthState || isLoadingUserReviewedCheck) return false; // Don't show if loading
    if (!user) return false; // Don't show if not logged in
    return !userHasAlreadyReviewed;
  }, [user, loadingAuthState, userHasAlreadyReviewed, isLoadingUserReviewedCheck]);


  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <div className="relative w-full h-48 sm:h-56">
        <Image
          src={restaurant.imageUrl}
          alt={restaurant.name}
          layout="fill"
          objectFit="cover"
          data-ai-hint="restaurant food"
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">{restaurant.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">{restaurant.cuisine}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center mb-3">
          <StarRating rating={averageRating} readOnly size={18} />
          <span className="ml-2 text-sm text-muted-foreground">
            ({reviewCount} opinion{reviewCount === 1 ? '' : 'es'})
          </span>
        </div>
        <p className="text-sm text-foreground line-clamp-2 mb-1">{restaurant.description}</p>
        <div className="flex items-center text-xs text-muted-foreground mt-2">
          <MapPin size={14} className="mr-1.5 shrink-0" />
          <span>{restaurant.address}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <MessageSquare size={16} className="mr-2" /> Ver detalles y opiniones
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl">{restaurant.name}</DialogTitle>
              <DialogDescription className="text-base">{restaurant.cuisine} - {restaurant.address}</DialogDescription>
              <div className="flex items-center pt-2">
                <StarRating rating={averageRating} readOnly />
                <span className="ml-2 text-sm text-muted-foreground">
                  Basado en {reviewCount} opinion{reviewCount === 1 ? '' : 'es'}
                </span>
              </div>
            </DialogHeader>
            <Separator className="my-4" />
            <div className="overflow-y-auto flex-grow pr-2 space-y-6">
              <p className="text-foreground">{restaurant.description}</p>
              
              <ReviewSummary restaurantName={restaurant.name} reviews={reviews.map(r => r.text)} />

              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Reviews</h3>
                {isLoadingReviews && (
                  <div className="flex items-center justify-center p-4 my-4 min-h-[100px]">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Cargando opiniones...</p>
                  </div>
                )}
                {!isLoadingReviews && reviewsError && (
                  <p className="text-destructive">Error al cargar opiniones.</p>
                )}
                {!isLoadingReviews && !reviewsError && <ReviewList reviews={reviews} />}
              </div>

              {loadingAuthState && (
                 <div className="flex items-center justify-center p-4 my-4 min-h-[50px]">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground text-sm">Verificando estado de autenticación...</p>
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
                    <p className="ml-2 text-muted-foreground text-sm">Comprobando si ya opinaste...</p>
                  </div>
              )}

              {!loadingAuthState && user && !isLoadingUserReviewedCheck && showReviewForm && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Leave a Review</h3>
                  <ReviewForm restaurantId={restaurant.id} onReviewAdded={handleReviewAdded} />
                </div>
              )}
              {!loadingAuthState && user && !isLoadingUserReviewedCheck && !showReviewForm && userHasAlreadyReviewed && (
                <p className="text-center text-sm p-4 bg-accent/10 text-accent-foreground rounded-md border border-accent/30">
                  Ya has dejado tu opinión en este restaurante. Gracias por tu ayuda!
                </p>
              )}
            </div>
             <DialogFooter className="mt-auto pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
