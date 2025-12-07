import { atom } from 'jotai';

// --- FEED CACHE ---
// Stores the listings currently displayed in the feed
export const feedListingsAtom = atom([]);

// Stores the metadata (total count, etc.) if needed
export const feedMetaAtom = atom({ page: 0, hasMore: true });

// Stores the exact configuration of filters used to valid the cache
// If the new filters differ from these, we invalidate the cache
export const feedFiltersAtom = atom(null);

// Stores scroll position to restore it
export const feedScrollAtom = atom(0);


// --- MY LISTINGS CACHE ---
// Stores the user's listings for the My Profile page
export const myListingsAtom = atom([]);
export const myActiveTabAtom = atom('active');
export const myIsAdminAtom = atom(false);
