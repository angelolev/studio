'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import type { Restaurant, Review } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import ReviewSummary from './ReviewSummary';
import { getReviews as getReviewsFromLocalStorage, hasUserReviewed, getOrSetUserId } from '@/lib/localStorageHelper';
import { MessageSquare, Users, MapPin } from 'lucide-react';
import { Separator } from './ui/separator';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [userHasAlreadyReviewed, setUserHasAlreadyReviewed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentUserId = getOrSetUserId();
      setUserId(currentUserId);
      
      if (isDialogOpen || !userId) { // Initial load or when dialog opens
        const storedReviews = getReviewsFromLocalStorage(restaurant.id);
        setReviews(storedReviews);
        setUserHasAlreadyReviewed(hasUserReviewed(restaurant.id, currentUserId));
      }
    }
  }, [restaurant.id, isDialogOpen, userId]);
  
  useEffect(() => {
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      setAverageRating(totalRating / reviews.length);
    } else {
      setAverageRating(0);
    }
  }, [reviews]);

  const handleReviewAdded = (newReview: Review) => {
    const updatedReviews = [...reviews, newReview];
    setReviews(updatedReviews);
    if (userId) {
      setUserHasAlreadyReviewed(hasUserReviewed(restaurant.id, userId));
    }
  };
  
  const reviewCount = useMemo(() => reviews.length, [reviews]);

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
            ({reviewCount} review{reviewCount === 1 ? '' : 's'})
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
              <MessageSquare size={16} className="mr-2" /> View Details & Reviews
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl">{restaurant.name}</DialogTitle>
              <DialogDescription className="text-base">{restaurant.cuisine} - {restaurant.address}</DialogDescription>
              <div className="flex items-center pt-2">
                <StarRating rating={averageRating} readOnly />
                <span className="ml-2 text-sm text-muted-foreground">
                  Based on {reviewCount} review{reviewCount === 1 ? '' : 's'}
                </span>
              </div>
            </DialogHeader>
            <Separator className="my-4" />
            <div className="overflow-y-auto flex-grow pr-2 space-y-6">
              <p className="text-foreground">{restaurant.description}</p>
              
              <ReviewSummary restaurantName={restaurant.name} reviews={reviews} />

              <div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">Reviews</h3>
                <ReviewList reviews={reviews} />
              </div>

              {!userHasAlreadyReviewed && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Leave a Review</h3>
                  <ReviewForm restaurantId={restaurant.id} onReviewAdded={handleReviewAdded} />
                </div>
              )}
              {userHasAlreadyReviewed && (
                <p className="text-center text-sm p-4 bg-accent/10 text-accent-foreground rounded-md border border-accent/30">
                  You've already reviewed this restaurant. Thanks for your feedback!
                </p>
              )}
            </div>
             <DialogFooter className="mt-auto pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
