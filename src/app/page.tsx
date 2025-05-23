import RestaurantGrid from '@/components/RestaurantGrid';
import { restaurants as initialRestaurants } from '@/data/restaurants';

export default function HomePage() {
  return (
    <div>
      <RestaurantGrid initialRestaurants={initialRestaurants} />
    </div>
  );
}
