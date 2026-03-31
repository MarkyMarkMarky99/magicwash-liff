import { useState, useEffect } from 'react';
import liff from '@line/liff';

const LIFF_ID = '2009660059-2PE7G2JP';

// In development, set VITE_MOCK_LINE_USER_ID in .env.local to bypass LIFF.
// e.g.  VITE_MOCK_LINE_USER_ID=baifern2918
const MOCK_USER_ID = import.meta.env.VITE_MOCK_LINE_USER_ID;

/**
 * Initializes LINE LIFF and returns the user's LINE profile.
 *
 * status: 'loading' | 'ready' | 'error'
 */
export function useLiff() {
  const [state, setState] = useState({ status: 'loading', profile: null, error: null });

  useEffect(() => {
    // --- Dev mock: skip LIFF entirely ---
    if (MOCK_USER_ID) {
      setState({
        status: 'ready',
        profile: { userId: MOCK_USER_ID, displayName: 'Dev Mock User' },
        error: null,
      });
      return;
    }

    // --- Production: real LIFF flow ---
    liff.init({ liffId: LIFF_ID })
      .then(() => {
        if (!liff.isInClient()) {
          // Opened in external browser — not a LINE environment
          setState({ status: 'no-line', profile: null, error: null });
          return;
        }
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        return liff.getProfile();
      })
      .then((profile) => {
        if (!profile) return; // redirecting to login or no-line already set
        setState({ status: 'ready', profile, error: null });
      })
      .catch((err) => {
        // Init failed (e.g. network error) — treat as no-line to avoid dead end
        setState({ status: 'no-line', profile: null, error: err.message });
      });
  }, []);

  return state;
}
