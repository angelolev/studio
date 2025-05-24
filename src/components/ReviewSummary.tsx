"use client";

import { useState, useEffect } from "react";
import { summarizeReviews } from "@/ai/flows/summarize-reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ReviewSummaryProps {
  restaurantName: string;
  reviews: string[];
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
        setSummary("Necesitamos más opiniones para generar un resumen.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await summarizeReviews({ restaurantName, reviews });
        setSummary(result.summary);
      } catch (err) {
        console.error("Error al obtener el resumen de opiniones:", err);
        setError("No se pudo cargar el resumen de opiniones en este momento.");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSummary();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [restaurantName, reviews]);

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

  if (reviews.length === 0 && summary) {
    // Handled
  } else if (reviews.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 shadow-lg transition-all duration-500 ease-out hover:shadow-xl">
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
          <p className="text-sm text-muted-foreground italic">
            Cargando resumen o no hay suficientes datos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
