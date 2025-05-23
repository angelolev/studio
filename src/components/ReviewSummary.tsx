'use client';

import { useState, useEffect } from 'react';
import type { Review } from '@/types';
import { summarizeReviews } from '@/ai/flows/summarize-reviews'; // Ensure this path is correct
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ReviewSummaryProps {
  restaurantName: string;
  reviews: Review[];
}

export default function ReviewSummary({ restaurantName, reviews }: ReviewSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (reviews.length === 0) {
        setSummary(null); // No reviews, no summary
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const reviewTexts = reviews.map(r => r.text);
        const result = await summarizeReviews({ restaurantName, reviews: reviewTexts });
        setSummary(result.summary);
      } catch (err) {
        console.error('Error fetching review summary:', err);
        setError('Could not load review summary at this time.');
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [restaurantName, reviews]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 my-4 border rounded-lg bg-muted/50 min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Generating review summary...</p>
      </div>
    );
  }

  if (error && !summary) { // Only show error if there's no summary to display
     return (
        <div className="p-4 my-4 border border-destructive/50 rounded-lg bg-destructive/10 text-destructive">
            <p>{error}</p>
        </div>
     );
  }
  
  if (!summary && reviews.length > 0) { // Case where summary is null but there are reviews (e.g. AI failed silently or initial state)
    return (
        <div className="p-4 my-4 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground italic">Review summary is currently unavailable.</p>
        </div>
    );
  }
  
  if (!summary && reviews.length === 0) {
      return null; // Don't show anything if no reviews and no summary
  }


  return (
    <Card className="my-6 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 shadow-lg transition-all duration-500 ease-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg text-primary">What People Are Saying</CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</p>
        ) : (
            <p className="text-sm text-muted-foreground italic">Not enough reviews to generate a summary yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
