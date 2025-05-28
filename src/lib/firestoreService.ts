
"use server";

import { db, storage } from "@/lib/firebase";
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
  limit, 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { cuisines as allCuisinesStatic } from '@/data/cuisines';

// --- Review Types and Functions ---
export interface ReviewFirestoreData {
  userId: string;
  userName: string | null;
  userPhotoUrl?: string | null;
  rating: number;
  text: string;
  timestamp: Timestamp | ReturnType<typeof serverTimestamp>;
  restaurantId: string;
  imageUrl?: string; // Optional image URL
}

export interface ReviewWithId extends ReviewFirestoreData {
  id: string;
  timestamp: Timestamp;
}

export interface ReviewWithNumericTimestamp
  extends Omit<ReviewFirestoreData, "timestamp"> {
  id: string;
  timestamp: number;
  imageUrl?: string;
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
  imageUrl?: string;
}

export async function addReviewToFirestore(
  restaurantId: string,
  reviewData: Omit<ReviewFirestoreData, "timestamp" | "restaurantId" | "imageUrl">,
  // imageFile parameter is removed. imageUrl is now part of reviewData if provided.
  // This function now expects imageUrl to be passed in reviewData if an image was uploaded by the client.
  // However, to keep the type Omit clean, we'll add it to docData directly.
  // So, the signature for the data coming from the client to the mutation will include imageUrl.
  // The actual server action will receive it as part of the payload.
  // Let's adjust reviewData type for the server action.
  // We'll expect `imageUrl` to be part of the first-class properties of the data payload for the review.
  // Let's redefine what addReviewToFirestore expects for reviewData from the client-side mutation.
  payload: Omit<ReviewFirestoreData, "timestamp" | "restaurantId"> & { imageUrl?: string }
): Promise<AddedReviewPlain> {
  if (!payload.userId) {
    throw new Error("Se requiere ID de usuario para agregar una opinión.");
  }

  const reviewsColRefForCheck = collection(db, "restaurants", restaurantId, "reviews");
  const duplicateCheckQuery = query(
    reviewsColRefForCheck, 
    where("userId", "==", payload.userId),
    limit(1) 
  );
  const duplicateCheckSnapshot = await getDocs(duplicateCheckQuery);

  if (!duplicateCheckSnapshot.empty) {
    throw new Error("Ya has enviado una opinión para este restaurante.");
  }

  // Firebase Storage upload logic is removed from here.
  // The imageUrl, if any, is expected to be in the payload.

  const reviewsColRef = collection(db, "restaurants", restaurantId, "reviews");
  const docData: ReviewFirestoreData = {
    userId: payload.userId,
    userName: payload.userName,
    userPhotoUrl: payload.userPhotoUrl,
    rating: payload.rating,
    text: payload.text,
    restaurantId, // Added back here
    timestamp: serverTimestamp(),
    ...(payload.imageUrl && { imageUrl: payload.imageUrl }), 
  };

  const docRef = await addDoc(reviewsColRef, docData);
  const clientTimestampMillis = Date.now(); 

  return {
    id: docRef.id,
    userId: payload.userId,
    userName: payload.userName,
    userPhotoUrl: payload.userPhotoUrl,
    rating: payload.rating,
    text: payload.text,
    restaurantId,
    timestamp: clientTimestampMillis, 
    ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
  };
}

export async function getReviewsFromFirestore(
  restaurantId: string
): Promise<ReviewWithNumericTimestamp[]> {
  const reviewsColRef = collection(db, "restaurants", restaurantId, "reviews");
  const q = query(reviewsColRef, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data() as ReviewFirestoreData; 
    const timestamp = data.timestamp as Timestamp | null;
    return {
      id: doc.id,
      userId: data.userId,
      userName: data.userName,
      userPhotoUrl: data.userPhotoUrl,
      rating: data.rating,
      text: data.text,
      restaurantId: data.restaurantId,
      imageUrl: data.imageUrl,
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
  const q = query(reviewsColRef, where("userId", "==", userId), limit(1));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count > 0;
}

// --- Restaurant Types and Functions ---

export interface RestaurantFirestoreData {
  name: string;
  cuisine: string[]; 
  address?: string; 
  latitude: number;
  longitude: number;
  imageUrl: string;
  description: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export async function addRestaurantToFirestore(
  restaurantData: Omit<AppRestaurantType, 'id' | 'imageUrl' | 'description'>,
  imageFile?: File
): Promise<AppRestaurantType> {
  const restaurantColRef = collection(db, "restaurants");
  let imageUrl = 'https://placehold.co/600x400.png'; 

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
  }).join(', ');


  const description = `Un restaurante especializado en ${cuisineNames}${restaurantData.address ? `, ubicado en ${restaurantData.address}` : ''}. Encuéntralo en el mapa.`;


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
    ...restaurantData, 
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

export async function checkRestaurantExistsByName(name: string): Promise<boolean> {
  const restaurantColRef = collection(db, "restaurants");
  const q = query(restaurantColRef, where("name", "==", name), limit(1));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}
