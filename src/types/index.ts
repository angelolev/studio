
import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore'; // Renamed to avoid conflict if needed locally

export interface Review {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  userName: string | null; // User's display name
  userPhotoUrl?: string | null; // User's photo URL
  restaurantId: string;
  rating: number; // 1-5
  text: string;
  timestamp: number; // Milliseconds since Unix epoch for client-side usage
}

export interface Restaurant {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  cuisine: string;
  address: string;
}

