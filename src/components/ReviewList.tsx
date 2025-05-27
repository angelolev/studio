
"use client";

import Image from "next/image";
import type { Review } from "@/types";
import StarRating from "./StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale"; // Import Spanish locale
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Maximize } from "lucide-react";

interface ReviewListProps {
  reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageAlt, setSelectedImageAlt] = useState<string>("");

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

  const openImageDialog = (imageUrl: string, altText: string) => {
    setSelectedImageUrl(imageUrl);
    setSelectedImageAlt(altText);
    setIsImageDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {reviews
          .slice()
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((review) => (
            <div key={review.id} className="p-4 border rounded-lg bg-card/50 shadow-sm">
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
                    {formatDistanceToNow(
                      getDateFromTimestamp(review.timestamp),
                      {
                        addSuffix: true,
                        locale: es,
                      }
                    )}
                  </p>
                </div>
              </div>
              <StarRating
                rating={review.rating}
                readOnly
                size={16}
                className="mb-1"
              />
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {review.text}
              </p>
              {review.imageUrl && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      openImageDialog(
                        review.imageUrl!,
                        `Imagen de la opinión de ${
                          review.userName || "usuario"
                        }`
                      )
                    }
                    className="relative aspect-square h-20 w-20 overflow-hidden rounded-md border hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group"
                    aria-label="Ver imagen ampliada"
                  >
                    <Image
                      src={review.imageUrl}
                      alt={`Miniatura de la opinión de ${
                        review.userName || "usuario"
                      }`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-md"
                      sizes="(max-width: 768px) 80px, 80px"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md">
                        <Maximize className="h-6 w-6 text-white" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>

      {selectedImageUrl && (
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[700px] p-2 sm:p-4 max-h-[90vh] flex flex-col">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-lg sm:text-xl">Vista Previa de la Imagen</DialogTitle>
            </DialogHeader>
            <div className="relative flex-grow w-full aspect-auto min-h-[200px] sm:min-h-[300px] md:min-h-[400px]">
              <Image
                src={selectedImageUrl}
                alt={selectedImageAlt}
                fill
                style={{ objectFit: "contain" }}
                className="rounded-md"
                sizes="(max-width: 768px) 90vw, (max-width: 1200px) 80vw, 700px"
              />
            </div>
            <DialogClose asChild>
                <Button type="button" variant="outline" className="mt-4 w-full sm:w-auto mx-auto sm:mx-0">
                  Cerrar
                </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
