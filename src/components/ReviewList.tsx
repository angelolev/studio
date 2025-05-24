"use client";

import type { Review } from "@/types";
import StarRating from "./StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale"; // Import Spanish locale

interface ReviewListProps {
  reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <p className="text-muted-foreground italic text-sm">
        Aún no hay opiniones. ¡Sé el primero en compartir tus ideas!
      </p>
    );
  }

  const getDateFromTimestamp = (timestampInMillis: number): Date => {
    return new Date(timestampInMillis);
  };

  return (
    <div className="space-y-6">
      {reviews
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((review) => (
          <div key={review.id} className="p-4 border rounded-lg bg-card/50">
            <div className="flex items-center mb-2">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage
                  src={
                    review.userPhotoUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${review.userId.substring(
                      0,
                      10
                    )}`
                  }
                  alt="Avatar de usuario"
                />
                <AvatarFallback>
                  {review.userName
                    ? review.userName.charAt(0).toUpperCase()
                    : review.userId.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {review.userName || "Usuario Anónimo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(getDateFromTimestamp(review.timestamp), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>
            <StarRating
              rating={review.rating}
              readOnly
              size={16}
              className="mb-1"
            />
            <p className="text-sm text-foreground leading-relaxed">
              {review.text}
            </p>
          </div>
        ))}
    </div>
  );
}
