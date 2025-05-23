
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import StarRating from './StarRating';
import type { Review as AppReviewType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { addReviewToFirestore, ReviewFirestoreData } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  text: z.string().min(10, 'Review must be at least 10 characters').max(500, 'Review must be less than 500 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  restaurantId: string;
  onReviewAdded: (newReview: AppReviewType) => void;
}

export default function ReviewForm({ restaurantId, onReviewAdded }: ReviewFormProps) {
  const { user, loadingAuthState } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      text: '',
    },
  });

  const addReviewMutation = useMutation({
    mutationFn: (reviewData: Omit<ReviewFirestoreData, 'timestamp' | 'restaurantId'>) => addReviewToFirestore(restaurantId, reviewData),
    onSuccess: (newFirestoreReview) => {
      toast({
        title: 'Review Submitted!',
        description: 'Thank you for your feedback.',
      });
      // Map FirestoreReview (which has Firestore Timestamp) to AppReviewType
      const newAppReview: AppReviewType = {
        ...newFirestoreReview,
        // Assuming newFirestoreReview.timestamp is already a Firestore Timestamp object
        timestamp: newFirestoreReview.timestamp, 
      };
      onReviewAdded(newAppReview);
      form.reset();
      form.setValue('rating', 0); // Reset star rating display explicitly if needed
      
      // Invalidate queries to refetch reviews and user reviewed status
      queryClient.invalidateQueries({ queryKey: ['reviews', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['userReviewed', restaurantId, user?.uid] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Could not submit review.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit: SubmitHandler<ReviewFormData> = (data) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to leave a review.',
        variant: 'destructive',
      });
      return;
    }

    const reviewData: Omit<ReviewFirestoreData, 'timestamp' | 'restaurantId'> = {
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
        <p className="ml-2 text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by parent component disabling/hiding the form
    // but as a fallback:
    return <p className="text-muted-foreground">Please sign in to leave a review.</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Rating</FormLabel>
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
              <FormLabel>Your Review</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us about your experience..." {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={addReviewMutation.isPending}>
          {addReviewMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : 'Submit Review'}
        </Button>
      </form>
    </Form>
  );
}
