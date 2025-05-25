
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
import { cuisines as allCuisinesStatic } from '@/data/cuisines'; // For description generation

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
  cuisine: string[];
  address?: string; // Made optional
  latitude: number;
  longitude: number;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export async function addRestaurantToFirestore(
  restaurantData: Omit<AppRestaurantType, 'id' | 'imageUrl' | 'description'>, // imageUrl and description will be generated
  imageFile?: File
): Promise<AppRestaurantType> {
  const restaurantColRef = collection(db, "restaurants");
  let imageUrl = 'https://placehold.co/600x400.png'; // Default placeholder

  if (imageFile) {
    const imageName = `${uuidv4()}-${imageFile.name}`;
    const storageRef = ref(storage, `restaurant-images/${imageName}`);
    try {
      const snapshot = await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Error uploading image to Firebase Storage: ", error);
      throw new Error("Error al subir la imagen. Por favor, intenta de nuevo.");
    }
  }

  const cuisineNames = restaurantData.cuisine.map(cId => {
    const foundCuisine = allCuisinesStatic.find(c => c.id === cId);
    return foundCuisine ? foundCuisine.name : cId;
  }).join(' y ');

  const description = `Un restaurante especializado en ${cuisineNames}${restaurantData.address ? `, ubicado cerca de ${restaurantData.address}` : ''}. Encuéntralo en el mapa.`;


  const docData: RestaurantFirestoreData = {
    name: restaurantData.name,
    cuisine: restaurantData.cuisine,
    address: restaurantData.address,
    latitude: restaurantData.latitude,
    longitude: restaurantData.longitude,
    imageUrl: imageUrl,
    description: description,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(restaurantColRef, docData);

  return {
    id: docRef.id,
    ...restaurantData, // Spreads name, cuisine, address (if present), latitude, longitude
    imageUrl: docData.imageUrl,
    description: docData.description,
  };
}

export async function getRestaurantsFromFirestore(): Promise<AppRestaurantType[]> {
  const restaurantColRef = collection(db, "restaurants");
  const q = query(restaurantColRef, orderBy("createdAt", "desc"));

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as RestaurantFirestoreData;
    return {
      id: doc.id,
      name: data.name,
      cuisine: data.cuisine,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      imageUrl: data.imageUrl,
      description: data.description,
    } as AppRestaurantType;
  });
}
