'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
  className?: string;
}

export default function StarRating({
  rating,
  onRate,
  readOnly = false,
  size = 20,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const handleMouseOver = (index: number) => {
    if (!readOnly) {
      setHoverRating(index + 1);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  const handleClick = (index: number) => {
    if (!readOnly && onRate) {
      const newRating = index + 1;
      setCurrentRating(newRating);
      onRate(newRating);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating || currentRating);
        return (
          <button
            key={index}
            type="button"
            disabled={readOnly}
            onMouseOver={() => handleMouseOver(index)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index)}
            className={cn(
              'p-0 bg-transparent border-none cursor-default',
              !readOnly && 'cursor-pointer'
            )}
            aria-label={`Rate ${starValue} out of 5 stars`}
          >
            <Star
              size={size}
              className={cn(
                'transition-colors',
                isFilled ? 'text-accent fill-accent' : 'text-muted-foreground'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
