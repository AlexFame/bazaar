const HISTORY_KEY = 'bazaar_search_history';
const MAX_ITEMS = 10;

export function getSearchHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(HISTORY_KEY);
    return item ? JSON.parse(item) : [];
  } catch (e) {
    console.error("Error reading search history:", e);
    return [];
  }
}

export function addToSearchHistory(query) {
  if (typeof window === 'undefined' || !query || !query.trim()) return getSearchHistory();
  
  const cleanQuery = query.trim();
  const history = getSearchHistory();
  
  // Remove duplicate if exists to move it to top
  const newHistory = [cleanQuery, ...history.filter(item => item !== cleanQuery)].slice(0, MAX_ITEMS);
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("Error saving search history:", e);
  }
  
  return newHistory;
}

export function clearSearchHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

export function removeFromSearchHistory(query) {
    if (typeof window === 'undefined') return getSearchHistory();
    
    const history = getSearchHistory();
    const newHistory = history.filter(item => item !== query);
    
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
        console.error("Error removing from search history:", e);
    }
    
    return newHistory;
}
