
"use server";

import { db, storage } from "@/lib/firebase"; // Import storage
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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage imports
import { v4 as uuidv4 } from 'uuid';

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
    throw new Error("Se requiere ID de usuario para agregar una opinión.");
  }
  const reviewsColRef = collection(db, "restaurants", restaurantId, "reviews");
  const docData: ReviewFirestoreData = { // Ensure correct type here
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
    const timestamp = data.timestamp as Timestamp | null; // Firestore timestamp can be null before server commits
    return {
      id: doc.id,
      ...data,
      timestamp: timestamp ? timestamp.toMillis() : Date.now(), // Handle potential null timestamp
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
  cuisine: string;
  address: string;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export async function addRestaurantToFirestore(
  restaurantData: Pick<AppRestaurantType, 'name' | 'cuisine' | 'address'>,
  imageFile?: File
): Promise<AppRestaurantType> {
  const restaurantColRef = collection(db, "restaurants");
  let imageUrl = 'https://placehold.co/600x400.png'; // Default placeholder

  if (imageFile) {
    // Use a unique name for the image file to prevent overwrites
    const imageName = `${uuidv4()}-${imageFile.name}`;
    const storageRef = ref(storage, `restaurant-images/${imageName}`);
    try {
      const snapshot = await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Error uploading image to Firebase Storage: ", error);
      // Optionally, re-throw or handle the error (e.g., by still using placeholder)
      // For now, if upload fails, it will still use the placeholder.
      throw new Error("Error al subir la imagen. Por favor, intenta de nuevo.");
    }
  }

  const docData: RestaurantFirestoreData = {
    name: restaurantData.name,
    cuisine: restaurantData.cuisine,
    address: restaurantData.address,
    imageUrl: imageUrl,
    description: `Un restaurante especializado en ${restaurantData.cuisine}, ubicado en ${restaurantData.address}.`,
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
  const q = query(restaurantColRef, orderBy("createdAt", "desc")); // Order by creation time

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
