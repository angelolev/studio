
'use client';

// This file can be used for other non-authentication related localStorage needs.
// Review-specific localStorage functions have been removed as reviews are now handled by Firebase Firestore.

import { v4 as uuidv4 } from 'uuid';

const ANONYMOUS_USER_ID_KEY = 'localEatsAnonymousUserId'; // Renamed for clarity

// Gets or sets an anonymous ID for users not logged in, if needed for other features.
export const getOrSetAnonymousId = (): string => {
  if (typeof window === 'undefined') return 'server-anonymous-user';
  let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId);
  }
  return userId;
};

// Example of a non-review related function you might keep or add:
// export const getThemePreference = (): string | null => {
//   if (typeof window === 'undefined') return null;
//   return localStorage.getItem('themePreference');
// };

// export const setThemePreference = (theme: string): void => {
//   if (typeof window === 'undefined') return;
//   localStorage.setItem('themePreference', theme);
// };
