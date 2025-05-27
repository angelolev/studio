
'use client';

import type { Restaurant } from '@/types';
import RestaurantCard from './RestaurantCard';
import SearchBar from './SearchBar';
import { useQuery } from '@tanstack/react-query';
import { getRestaurantsFromFirestore } from '@/lib/firestoreService';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useMemo } from 'react';
import { cuisines as allCuisines } from '@/data/cuisines';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function RestaurantGrid() {
  const { data: restaurants, isLoading, error, isError } = useQuery<Restaurant[], Error>({
    queryKey: ['restaurants'],
    queryFn: getRestaurantsFromFirestore,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisineId, setSelectedCuisineId] = useState<string | null>(null);

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    let result = restaurants;

    // Filter by selected cuisine
    if (selectedCuisineId) {
      result = result.filter(restaurant =>
        restaurant.cuisine.includes(selectedCuisineId)
      );
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [restaurants, searchTerm, selectedCuisineId]);

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

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 text-foreground">Filtrar por Categoría</h2>
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
          <div className="flex space-x-2 pb-2">
            <Button
              variant={selectedCuisineId === null ? "default" : "secondary"}
              size="sm"
              className="rounded-full px-4 py-1 h-auto text-sm transition-colors duration-150 ease-in-out"
              onClick={() => setSelectedCuisineId(null)}
            >
              Todas
            </Button>
            {allCuisines.map((cuisine) => (
              <Button
                key={cuisine.id}
                variant={selectedCuisineId === cuisine.id ? "default" : "secondary"}
                size="sm"
                className="rounded-full px-4 py-1 h-auto text-sm transition-colors duration-150 ease-in-out"
                onClick={() => setSelectedCuisineId(cuisine.id)}
              >
                {cuisine.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {filteredRestaurants.length === 0 && (!isLoading) && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-3">No se Encontraron Restaurantes</h2>
          {searchTerm && selectedCuisineId && (
            <p className="text-muted-foreground">
              No hay restaurantes que coincidan con "{searchTerm}" en la categoría "{allCuisines.find(c => c.id === selectedCuisineId)?.name}".
            </p>
          )}
          {!searchTerm && selectedCuisineId && (
            <p className="text-muted-foreground">
              No hay restaurantes en la categoría "{allCuisines.find(c => c.id === selectedCuisineId)?.name}".
            </p>
          )}
          {searchTerm && !selectedCuisineId && (
            <p className="text-muted-foreground">
              No hay restaurantes que coincidan con "{searchTerm}".
            </p>
          )}
          {!searchTerm && !selectedCuisineId && restaurants && restaurants.length > 0 && (
             <p className="text-muted-foreground">
              Ajusta tus filtros para encontrar restaurantes.
            </p>
          )}
           {!searchTerm && !selectedCuisineId && restaurants && restaurants.length === 0 && (
             <p className="text-muted-foreground">
               Parece que aún no hay restaurantes listados. ¿Por qué no agregas el primero?
            </p>
          )}
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
