'use client';

import type { Restaurant } from '@/types';
import RestaurantCard from './RestaurantCard';

interface RestaurantGridProps {
  initialRestaurants: Restaurant[];
}

export default function RestaurantGrid({ initialRestaurants }: RestaurantGridProps) {
  if (!initialRestaurants || initialRestaurants.length === 0) {
    return <p>No restaurants found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {initialRestaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}
