
'use client';

import type { Restaurant } from '@/types';
import RestaurantCard from './RestaurantCard';
import SearchBar from './SearchBar'; // Import SearchBar
import { useQuery } from '@tanstack/react-query';
import { getRestaurantsFromFirestore } from '@/lib/firestoreService';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useMemo } from 'react'; // Import useState and useMemo

export default function RestaurantGrid() {
  const { data: restaurants, isLoading, error, isError } = useQuery<Restaurant[], Error>({
    queryKey: ['restaurants'],
    queryFn: getRestaurantsFromFirestore,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (!searchTerm) return restaurants;
    return restaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [restaurants, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando restaurantes...</p>
      </div>
    );
  }

  if (isError) {
    return (
       <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
          <AlertTitle>Error al Cargar Restaurantes</AlertTitle>
          <AlertDescription>
            No pudimos cargar la lista de restaurantes en este momento. Error: {error?.message || 'Error desconocido'}. Por favor, intenta de nuevo más tarde.
          </AlertDescription>
        </Alert>
    );
  }

  return (
    <div>
      <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      {filteredRestaurants.length === 0 && searchTerm && !isLoading && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-3">No se Encontraron Restaurantes</h2>
          <p className="text-muted-foreground">
            No hay restaurantes que coincidan con "{searchTerm}". Intenta con otra búsqueda.
          </p>
        </div>
      )}
      {filteredRestaurants.length === 0 && !searchTerm && !isLoading && (
         <div className="text-center py-12">
           <h2 className="text-2xl font-semibold mb-3">No se Encontraron Restaurantes</h2>
           <p className="text-muted-foreground">
             Parece que aún no hay restaurantes listados. ¿Por qué no agregas el primero?
           </p>
         </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </div>
  );
}
