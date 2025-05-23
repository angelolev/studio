
// Removed import of initialRestaurants as data will be fetched by RestaurantGrid
import RestaurantGrid from '@/components/RestaurantGrid';

export default function HomePage() {
  return (
    <div>
      {/* RestaurantGrid will now fetch its own data */}
      <RestaurantGrid />
    </div>
  );
}
