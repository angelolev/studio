export interface Review {
  id: string;
  userId: string;
  restaurantId: string;
  rating: number; // 1-5
  text: string;
  timestamp: number;
}

export interface Restaurant {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  cuisine: string;
  address: string;
}
