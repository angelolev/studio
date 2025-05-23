
'use server'; // Can be used by server components/actions, but functions are client-callable via hooks

import { db } from '@/lib/firebase';
import type { Review, Restaurant } from '@/types';
import {
  collection,
  addDoc,
  query,
  orderBy,
  Timestamp,
  where,
  getCountFromServer,
  getDocs,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

// Type for review data to be stored in Firestore
export interface ReviewFirestoreData {
  userId: string;
  userName: string | null;
  userPhotoUrl?: string | null;
  rating: number;
  text: string;
  timestamp: Timestamp | ReturnType<typeof serverTimestamp>; // Allow FieldValue for writes
  restaurantId: string;
}

export interface ReviewWithId extends ReviewFirestoreData {
  id: string;
  timestamp: Timestamp; // Ensure timestamp is always Timestamp for reads
}


// Function to add a review to Firestore
export async function addReviewToFirestore(
  restaurantId: string,
  reviewData: Omit<ReviewFirestoreData, 'timestamp' | 'restaurantId'>
): Promise<ReviewWithId> {
  if (!reviewData.userId) {
    throw new Error('User ID is required to add a review.');
  }
  const reviewsColRef = collection(db, 'restaurants', restaurantId, 'reviews');
  const docRef = await addDoc(reviewsColRef, {
    ...reviewData,
    restaurantId, // Add restaurantId to the document
    timestamp: serverTimestamp(), // Use server timestamp
  });

  // For returning, we'll assume the serverTimestamp resolves to a valid Timestamp for now
  // In a real scenario, you might re-fetch or construct carefully.
  return { 
    ...reviewData, 
    id: docRef.id, 
    restaurantId,
    timestamp: Timestamp.now() // Placeholder, actual value is server-generated
  } as ReviewWithId;
}

// Function to get reviews for a restaurant
// This is not a hook, it's a direct fetch function. Hooks would be in components.
export async function getReviewsFromFirestore(restaurantId: string): Promise<ReviewWithId[]> {
  const reviewsColRef = collection(db, 'restaurants', restaurantId, 'reviews');
  const q = query(reviewsColRef, orderBy('timestamp', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReviewWithId));
}

// Function to check if a user has reviewed a restaurant
export async function checkIfUserReviewed(restaurantId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  const reviewsColRef = collection(db, 'restaurants', restaurantId, 'reviews');
  const q = query(reviewsColRef, where('userId', '==', userId));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count > 0;
}
