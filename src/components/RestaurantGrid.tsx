
'use client';

import type { Restaurant } from '@/types';
import RestaurantCard from './RestaurantCard';
import { useQuery } from '@tanstack/react-query';
import { getRestaurantsFromFirestore } from '@/lib/firestoreService';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RestaurantGrid() {
  const { data: restaurants, isLoading, error, isError } = useQuery<Restaurant[], Error>({
    queryKey: ['restaurants'],
    queryFn: getRestaurantsFromFirestore,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading restaurants...</p>
      </div>
    );
  }

  if (isError) {
    return (
       <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
          <AlertTitle>Error Loading Restaurants</AlertTitle>
          <AlertDescription>
            We couldn't fetch the list of restaurants at this moment. Error: {error?.message || 'Unknown error'}. Please try again later.
          </AlertDescription>
        </Alert>
    );
  }

  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-3">No Restaurants Found</h2>
        <p className="text-muted-foreground">
          It looks like there are no restaurants listed yet. Why not add the first one?
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
