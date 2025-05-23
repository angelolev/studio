'use client';

import type { Review } from '@/types';
import StarRating from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';

interface ReviewListProps {
  reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews || reviews.length === 0) {
    return <p className="text-muted-foreground italic">No reviews yet. Be the first to share your thoughts!</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.sort((a,b) => b.timestamp - a.timestamp).map((review) => (
        <div key={review.id} className="p-4 border rounded-lg bg-card/50">
          <div className="flex items-center mb-2">
            <Avatar className="h-8 w-8 mr-3">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${review.userId.substring(0,5)}`} alt="User avatar" />
              <AvatarFallback>{review.userId.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm text-foreground">Anonymous User</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
          <StarRating rating={review.rating} readOnly size={16} className="mb-1" />
          <p className="text-sm text-foreground leading-relaxed">{review.text}</p>
        </div>
      ))}
    </div>
  );
}
