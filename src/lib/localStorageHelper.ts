'use client';

import type { Review } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const ANONYMOUS_USER_ID_KEY = 'localEatsUserId';
const REVIEWS_KEY_PREFIX = 'localEatsReviews_';

export const getOrSetUserId = (): string => {
  if (typeof window === 'undefined') return 'server-user'; // Should not happen in practice for this function
  let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
  }
  return userId;
};

const getRestaurantReviewsKey = (restaurantId: string) => `${REVIEWS_KEY_PREFIX}${restaurantId}`;

export const getReviews = (restaurantId: string): Review[] => {
  if (typeof window === 'undefined') return [];
  const reviewsJson = localStorage.getItem(getRestaurantReviewsKey(restaurantId));
  return reviewsJson ? JSON.parse(reviewsJson) : [];
};

export const addReview = (review: Review): { success: boolean; message?: string } => {
  if (typeof window === 'undefined') return { success: false, message: 'Cannot add review from server.' };
  const reviews = getReviews(review.restaurantId);
  if (reviews.some(r => r.userId === review.userId)) {
    return { success: false, message: 'You have already reviewed this restaurant.' };
  }
  reviews.push(review);
  localStorage.setItem(getRestaurantReviewsKey(review.restaurantId), JSON.stringify(reviews));
  return { success: true };
};

export const hasUserReviewed = (restaurantId: string, userId: string): boolean => {
  if (typeof window === 'undefined') return false;
  const reviews = getReviews(restaurantId);
  return reviews.some(r => r.userId === userId);
};
