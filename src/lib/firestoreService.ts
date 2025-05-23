
"use server"; 

import { db } from "@/lib/firebase";
import type { Review as AppReviewType, Restaurant as AppRestaurantType } from "@/types";
import {
  collection,
  addDoc,
  query,
  orderBy,
  Timestamp,
  where,
  getCountFromServer,
  getDocs,
  serverTimestamp,
  doc, // Import doc
  setDoc, // Import setDoc for adding restaurant with specific ID (if needed, but addDoc is fine for auto-ID)
} from "firebase/firestore";

// --- Review Types and Functions ---
export interface ReviewFirestoreData {
  userId: string;
  userName: string | null;
  userPhotoUrl?: string | null;
  rating: number;
  text: string;
  timestamp: Timestamp | ReturnType<typeof serverTimestamp>;
  restaurantId: string;
}

export interface ReviewWithId extends ReviewFirestoreData {
  id: string;
  timestamp: Timestamp;
}

export interface ReviewWithNumericTimestamp
  extends Omit<ReviewFirestoreData, "timestamp"> {
  id: string;
  timestamp: number;
}

export interface AddedReviewPlain {
  id: string;
  userId: string;
  userName: string | null;
  userPhotoUrl?: string | null;
  rating: number;
  text: string;
  restaurantId: string;
  timestamp: number;
}

export async function addReviewToFirestore(
  restaurantId: string,
  reviewData: Omit<ReviewFirestoreData, "timestamp" | "restaurantId">
): Promise<AddedReviewPlain> {
  if (!reviewData.userId) {
    throw new Error("User ID is required to add a review.");
  }
  const reviewsColRef = collection(db, "restaurants", restaurantId, "reviews");
  const docData = {
    ...reviewData,
    restaurantId,
    timestamp: serverTimestamp(),
  };
  const docRef = await addDoc(reviewsColRef, docData);
  const clientTimestampMillis = Date.now();
  return {
    id: docRef.id,
    userId: reviewData.userId,
    userName: reviewData.userName,
    userPhotoUrl: reviewData.userPhotoUrl,
    rating: reviewData.rating,
    text: reviewData.text,
    restaurantId,
    timestamp: clientTimestampMillis,
  };
}

export async function getReviewsFromFirestore(
  restaurantId: string
): Promise<ReviewWithNumericTimestamp[]> {
  const reviewsColRef = collection(db, "restaurants", restaurantId, "reviews");
  const q = query(reviewsColRef, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    const timestamp = data.timestamp as Timestamp;
    return {
      id: doc.id,
      ...data,
      timestamp: timestamp ? timestamp.toMillis() : Date.now(), // Fallback if timestamp is somehow null
    } as ReviewWithNumericTimestamp;
  });
}

export async function checkIfUserReviewed(
  restaurantId: string,
  userId: string
): Promise<boolean> {
  if (!userId) return false;
  const reviewsColRef = collection(db, "restaurants", restaurantId, "reviews");
  const q = query(reviewsColRef, where("userId", "==", userId));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count > 0;
}

// --- Restaurant Types and Functions ---

// Type for restaurant data to be stored in Firestore
export interface RestaurantFirestoreData {
  name: string;
  cuisine: string;
  address: string;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  // userId?: string; // Optional: if you want to track who added it
}

// Type for restaurant data returned from Firestore (with ID and converted timestamp)
export interface RestaurantWithNumericTimestamp extends Omit<AppRestaurantType, 'id'> {
  id: string;
  createdAt?: number; // Numeric timestamp for serialization
}


// Function to add a new restaurant to Firestore
export async function addRestaurantToFirestore(
  restaurantData: Pick<AppRestaurantType, 'name' | 'cuisine' | 'address'>
): Promise<AppRestaurantType> { // Returns the full AppRestaurantType including the new ID
  
  const restaurantColRef = collection(db, "restaurants");

  const docData: RestaurantFirestoreData = {
    ...restaurantData,
    imageUrl: 'https://placehold.co/600x400.png', // Default placeholder
    description: `A restaurant specializing in ${restaurantData.cuisine}, located at ${restaurantData.address}.`, // Generic description
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(restaurantColRef, docData);

  return {
    id: docRef.id,
    name: restaurantData.name,
    cuisine: restaurantData.cuisine,
    address: restaurantData.address,
    imageUrl: docData.imageUrl,
    description: docData.description,
    // createdAt: Date.now(), // Approximate for immediate client use; actual value is server-generated
  };
}

// Function to get all restaurants from Firestore
export async function getRestaurantsFromFirestore(): Promise<AppRestaurantType[]> {
  const restaurantColRef = collection(db, "restaurants");
  // Optionally, order by a field, e.g., createdAt or name
  // const q = query(restaurantColRef, orderBy("createdAt", "desc"));
  const q = query(restaurantColRef, orderBy("name", "asc")); // Example: order by name
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as RestaurantFirestoreData;
    // const createdAtTimestamp = data.createdAt as Timestamp;
    return {
      id: doc.id,
      name: data.name,
      cuisine: data.cuisine,
      address: data.address,
      imageUrl: data.imageUrl,
      description: data.description,
      // createdAt: createdAtTimestamp ? createdAtTimestamp.toMillis() : undefined,
    } as AppRestaurantType; // Cast to ensure type compatibility
  });
}
