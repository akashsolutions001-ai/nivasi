import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, onAuthStateChanged, signOut, getRedirectResult } from '../firebase.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectLoading, setRedirectLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Use refs to track state across async operations
  const isMountedRef = useRef(true);
  const redirectResultHandledRef = useRef(false);

  // Detect iOS device
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    isMountedRef.current = true;
    redirectResultHandledRef.current = false;

    let authStateUnsubscribe = null;
    let timeoutIds = [];

    // Check if we have stored auth state in localStorage (for iOS persistence)
    const checkStoredAuthState = () => {
      try {
        const storedUser = localStorage.getItem('nivasi_auth_user');
        if (storedUser && isIOS) {
          // iOS - Found stored auth user
        }
      } catch (error) {
        // Silent fail for stored auth check
      }
    };

    // Handle redirect result when user returns from Google auth
    const handleRedirectResult = async () => {
      try {
        setRedirectLoading(true);
        setAuthError(null);

        // For iOS, add a small delay to ensure redirect is complete
        if (isIOS) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const result = await getRedirectResult(auth);

        if (result && result.user && isMountedRef.current) {
          // Mark redirect result as handled
          redirectResultHandledRef.current = true;

          // Clear pending redirect flag
          try {
            sessionStorage.removeItem('nivasi_pending_redirect');
          } catch (e) {
            // Silent fail
          }

          // Store user in localStorage for iOS persistence
          if (isIOS && result.user) {
            try {
              localStorage.setItem('nivasi_auth_user', JSON.stringify({
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
              }));
            } catch (e) {
              // Silent fail for iOS storage
            }
          }

          // Set user immediately from redirect result
          setUser(result.user);
          setLoading(false);
          setRedirectLoading(false);

          return true; // Redirect result found
        } else if (isMountedRef.current) {
          return false;
        }
      } catch (error) {
        if (isMountedRef.current) {
          // Only set error if it's not a "no redirect result" type error
          if (error.code !== 'auth/credential-already-in-use') {
            setAuthError(error);
          }
        }
        return false;
      } finally {
        if (isMountedRef.current) {
          setRedirectLoading(false);
        }
      }
      return false;
    };

    // Set up auth state listener - this is the MAIN way we detect auth changes
    const setupAuthStateListener = () => {
      authStateUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          // Clear pending redirect flag on successful auth
          try {
            sessionStorage.removeItem('nivasi_pending_redirect');
          } catch (e) {
            // Silent fail
          }

          // Store user in localStorage for iOS persistence
          if (isIOS) {
            try {
              localStorage.setItem('nivasi_auth_user', JSON.stringify({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
              }));
            } catch (e) {
              // Silent fail for iOS storage
            }
          }
        } else if (isIOS) {
          // User logged out, clear localStorage
          try {
            localStorage.removeItem('nivasi_auth_user');
            sessionStorage.removeItem('nivasi_pending_redirect');
          } catch (e) {
            // Silent fail
          }
        }

        if (isMountedRef.current) {
          setUser(firebaseUser);
          setLoading(false);
          setRedirectLoading(false);
          setAuthError(null);
        }
      }, (error) => {
        if (isMountedRef.current) {
          setAuthError(error);
          setLoading(false);
          setRedirectLoading(false);
        }
      });
    };

    // Initialize authentication
    const initializeAuth = async () => {
      try {
        // Check stored auth state first (for iOS)
        checkStoredAuthState();

        // Set up auth state listener FIRST - this is critical
        setupAuthStateListener();

        // Small delay to let auth state listener initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then check for redirect result (for redirect-based auth flow)
        await handleRedirectResult();

        // Add a timeout to prevent infinite loading
        const loadingTimeoutId = setTimeout(() => {
          if (isMountedRef.current && loading) {
            setLoading(false);
            setRedirectLoading(false);
          }
        }, isIOS ? 15000 : 10000);
        timeoutIds.push(loadingTimeoutId);

      } catch (error) {
        if (isMountedRef.current) {
          setAuthError(error);
          setLoading(false);
          setRedirectLoading(false);
        }
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (authStateUnsubscribe) {
        authStateUnsubscribe();
      }
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []); // Empty dependency array - only run once on mount

  const logout = async () => {
    try {
      // Clear localStorage for iOS
      if (isIOS) {
        try {
          localStorage.removeItem('nivasi_auth_user');
        } catch (e) {
          // Silent fail
        }
      }

      // Clear session storage
      try {
        sessionStorage.removeItem('nivasi_pending_redirect');
      } catch (e) {
        // Silent fail
      }

      await signOut(auth);

      // Clear any stored auth data
      setUser(null);
      setAuthError(null);
    } catch (error) {
      setAuthError(error);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  // Compute isAuthenticated from user state
  const isAuthenticated = !!user;

  const value = {
    user,
    loading: loading || redirectLoading,
    logout,
    isAuthenticated,
    redirectLoading,
    authError,
    clearAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};