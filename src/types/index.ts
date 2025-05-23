
import type { Timestamp } from 'firebase/firestore';

export interface Review {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  userName: string | null; // User's display name
  userPhotoUrl?: string | null; // User's photo URL
  restaurantId: string;
  rating: number; // 1-5
  text: string;
  timestamp: Timestamp | number; // Firestore Timestamp on read, number for client-side optimisitic updates before Firestore save
}

export interface Restaurant {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  cuisine: string;
  address: string;
}
