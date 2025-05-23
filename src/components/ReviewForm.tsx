'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import StarRating from './StarRating';
import type { Review } from '@/types';
import { getOrSetUserId, addReview as saveReviewToLocalStorage } from '@/lib/localStorageHelper';
import { useToast } from '@/hooks/use-toast';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  text: z.string().min(10, 'Review must be at least 10 characters').max(500, 'Review must be less than 500 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  restaurantId: string;
  onReviewAdded: (newReview: Review) => void;
}

export default function ReviewForm({ restaurantId, onReviewAdded }: ReviewFormProps) {
  const [currentRating, setCurrentRating] = useState(0);
  const { toast } = useToast();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      text: '',
    },
  });

  const onSubmit: SubmitHandler<ReviewFormData> = (data) => {
    const userId = getOrSetUserId();
    const newReview: Review = {
      id: new Date().toISOString(), // Simple unique ID
      userId,
      restaurantId,
      rating: data.rating,
      text: data.text,
      timestamp: Date.now(),
    };

    const result = saveReviewToLocalStorage(newReview);
    if (result.success) {
      toast({
        title: 'Review Submitted!',
        description: 'Thank you for your feedback.',
      });
      onReviewAdded(newReview);
      form.reset();
      setCurrentRating(0); 
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Could not submit review.',
        variant: 'destructive',
      });
    }
  };

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
                    setCurrentRating(rate);
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
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </form>
    </Form>
  );
}
