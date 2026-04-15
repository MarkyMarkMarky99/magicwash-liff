import { useState, useEffect, useCallback } from 'react';

/**
 * Minimal client-side router built on history.pushState.
 * Returns reactive `params` (re-renders on navigation) and a `navigate`
 * function that updates the URL without a full page reload.
 */
export function useRoute() {
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const handler = () => setSearch(window.location.search);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = useCallback((url) => {
    history.pushState(null, '', url);
    setSearch(new URL(url, window.location.href).search);
  }, []);

  return { params: new URLSearchParams(search), navigate };
}
