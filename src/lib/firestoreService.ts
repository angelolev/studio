
'use server'; // Can be used by server components/actions, but functions are client-callable via hooks

import { db } from '@/lib/firebase';
import type { Review as AppReviewType } from '@/types'; // For reference
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

// New type for the plain object returned by addReviewToFirestore
export interface AddedReviewPlain {
  id: string;
  userId: string;
  userName: string | null;
  userPhotoUrl?: string | null;
  rating: number;
  text: string;
  restaurantId: string;
  timestamp: number; // Milliseconds since Unix epoch
}


// Function to add a review to Firestore
export async function addReviewToFirestore(
  restaurantId: string,
  reviewData: Omit<ReviewFirestoreData, 'timestamp' | 'restaurantId'>
): Promise<AddedReviewPlain> { // Return type changed to AddedReviewPlain
  if (!reviewData.userId) {
    throw new Error('User ID is required to add a review.');
  }
  const reviewsColRef = collection(db, 'restaurants', restaurantId, 'reviews');
  
  const docData = {
    ...reviewData,
    restaurantId,
    timestamp: serverTimestamp(), // Firestore will set this server-side
  };

  const docRef = await addDoc(reviewsColRef, docData);

  // For the return value to be plain, we need a numeric timestamp.
  // Using client's current time as an approximation for the server timestamp for immediate UI update.
  // The actual server timestamp will be available on subsequent fetches.
  const clientTimestampMillis = Date.now();

  return {
    id: docRef.id,
    userId: reviewData.userId,
    userName: reviewData.userName,
    userPhotoUrl: reviewData.userPhotoUrl,
    rating: reviewData.rating,
    text: reviewData.text,
    restaurantId,
    timestamp: clientTimestampMillis, // Numeric timestamp
  };
}

// Function to get reviews for a restaurant
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
