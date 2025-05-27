
import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore';

export interface Review {
  id: string; // Firestore document ID
  userId: string; // Firebase Auth UID
  userName: string | null; // User's display name
  userPhotoUrl?: string | null; // User's photo URL
  restaurantId: string;
  rating: number; // 1-5
  text: string;
  timestamp: number; // Milliseconds since Unix epoch for client-side usage
  imageUrl?: string; // Optional image URL for the review
}

export interface Restaurant {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  cuisine: string[];
  address?: string; // Made optional
  latitude: number;
  longitude: number;
  // Optional: add fields like createdAt if you store timestamps
  // createdAt?: FirestoreTimestamp | number;
}

export interface Cuisine {
  id: string; // Corresponds to the document ID in Firestore
  name: string; // The display name of the cuisine
}
