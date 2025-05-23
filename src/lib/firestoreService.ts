
"use server"; 

import { db } from "@/lib/firebase";
import type { Review as AppReviewType, Restaurant as AppRestaurantType, Cuisine as AppCuisineType } from "@/types";
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
  doc, 
  setDoc, 
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
      timestamp: timestamp ? timestamp.toMillis() : Date.now(), 
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

export interface RestaurantFirestoreData {
  name: string;
  cuisine: string; // Value from the dropdown (e.g., 'italian', 'mexican')
  address: string;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export interface RestaurantWithNumericTimestamp extends Omit<AppRestaurantType, 'id'> {
  id: string;
  createdAt?: number; 
}

export async function addRestaurantToFirestore(
  restaurantData: Pick<AppRestaurantType, 'name' | 'cuisine' | 'address'>
): Promise<AppRestaurantType> { 
  
  const restaurantColRef = collection(db, "restaurants");

  const docData: RestaurantFirestoreData = {
    ...restaurantData,
    imageUrl: 'https://placehold.co/600x400.png', 
    description: `A restaurant specializing in ${restaurantData.cuisine}, located at ${restaurantData.address}.`,
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
  };
}

export async function getRestaurantsFromFirestore(): Promise<AppRestaurantType[]> {
  const restaurantColRef = collection(db, "restaurants");
  const q = query(restaurantColRef, orderBy("name", "asc")); 
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as RestaurantFirestoreData;
    return {
      id: doc.id,
      name: data.name,
      cuisine: data.cuisine,
      address: data.address,
      imageUrl: data.imageUrl,
      description: data.description,
    } as AppRestaurantType; 
  });
}

// --- Cuisine Types and Functions ---
export interface CuisineFirestoreData {
  name: string;
  // Potentially other fields like 'icon', 'description' in the future
}

// Function to get all cuisines from Firestore
export async function getCuisinesFromFirestore(): Promise<AppCuisineType[]> {
  const cuisinesColRef = collection(db, "cuisines");
  const q = query(cuisinesColRef, orderBy("name", "asc")); // Order by name for consistent dropdown display
  
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as CuisineFirestoreData;
    return {
      id: doc.id, // The document ID (e.g., "italian", "mexican")
      name: data.name, // The display name (e.g., "Italian", "Mexican")
    } as AppCuisineType;
  });
}
