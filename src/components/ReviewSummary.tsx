"use client";

import { useState, useEffect } from "react";
import { summarizeReviews } from "@/ai/flows/summarize-reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ReviewSummaryProps {
  restaurantName: string;
  reviews: string[]; // Expecting an array of review texts
}

export default function ReviewSummary({
  restaurantName,
  reviews,
}: ReviewSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (reviews.length === 0) {
        setSummary(
          "No hay suficientes opiniones para generar un resumen todavía."
        );
        setIsLoading(false);
        return;
      }
      if (reviews.length < 2) {
        // Optional: only summarize if more than X reviews
        setSummary("Necesitamos más opiniones para generar un resumen.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // The summarizeReviews flow expects an array of review texts.
        const result = await summarizeReviews({ restaurantName, reviews });
        setSummary(result.summary);
      } catch (err) {
        console.error("Error fetching review summary:", err);
        setError("Could not load review summary at this time.");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce or ensure reviews array is stable before fetching
    // For simplicity, fetching directly. Consider debouncing in a real app if `reviews` changes frequently.
    const timeoutId = setTimeout(() => {
      fetchSummary();
    }, 500); // Small delay to avoid rapid calls if reviews prop updates fast

    return () => clearTimeout(timeoutId);
  }, [restaurantName, reviews]); // Dependency on reviews (the array of texts)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 my-4 border rounded-lg bg-muted/50 min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">
          Generando resumen de opiniones...
        </p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-4 my-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (!summary && reviews.length > 0) {
    return (
      <div className="p-4 my-4 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground italic">
          El resumen de opiniones no está disponible en este momento.
        </p>
      </div>
    );
  }

  // If no reviews, and summary is already set to a message like "Not enough reviews..."
  if (reviews.length === 0 && summary) {
    // Display the specific message set in useEffect for 0 reviews
  } else if (reviews.length === 0) {
    return null; // Or specific "no reviews yet" message if summary hasn't been set
  }

  return (
    <Card className="my-6 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 shadow-lg transition-all duration-500 ease-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg text-primary">
          Lo que piensa la gente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        ) : (
          // This case should be less common now due to handling in useEffect
          <p className="text-sm text-muted-foreground italic">
            Cargando resumen o no hay suficientes datos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
