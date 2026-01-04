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
    console.log('AuthContext: Initializing auth...');
    isMountedRef.current = true;
    redirectResultHandledRef.current = false;

    let authStateUnsubscribe = null;
    let timeoutIds = [];

    // Check if we have stored auth state in localStorage (for iOS persistence)
    const checkStoredAuthState = () => {
      try {
        const storedUser = localStorage.getItem('nivasi_auth_user');
        if (storedUser && isIOS) {
          console.log('AuthContext: iOS - Found stored auth user');
          const parsedUser = JSON.parse(storedUser);
          console.log('AuthContext: iOS - Stored user email:', parsedUser.email);
        }
      } catch (error) {
        console.error('AuthContext: Error checking stored auth state:', error);
      }
    };

    // Handle redirect result when user returns from Google auth
    const handleRedirectResult = async () => {
      try {
        console.log('AuthContext: Checking for redirect result...');
        setRedirectLoading(true);
        setAuthError(null);

        // For iOS, add a small delay to ensure redirect is complete
        if (isIOS) {
          console.log('AuthContext: iOS - Adding delay before checking redirect result...');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const result = await getRedirectResult(auth);

        if (result && result.user && isMountedRef.current) {
          console.log('AuthContext: Redirect result received:', result.user?.email);

          // Mark redirect result as handled
          redirectResultHandledRef.current = true;

          // Clear pending redirect flag
          try {
            sessionStorage.removeItem('nivasi_pending_redirect');
          } catch (e) {
            console.error('AuthContext: Failed to clear redirect flag:', e);
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
              console.log('AuthContext: iOS - Stored user in localStorage');
            } catch (e) {
              console.error('AuthContext: iOS - Failed to store user:', e);
            }
          }

          // Set user immediately from redirect result
          setUser(result.user);
          setLoading(false);
          setRedirectLoading(false);

          return true; // Redirect result found
        } else if (isMountedRef.current) {
          console.log('AuthContext: No redirect result found');
          return false;
        }
      } catch (error) {
        console.error('AuthContext: Redirect result error:', error);

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
      console.log('AuthContext: Setting up auth state listener...');

      authStateUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('AuthContext: Auth state changed:', firebaseUser ? `User logged in (${firebaseUser.email})` : 'User logged out');

        if (firebaseUser) {
          // Clear pending redirect flag on successful auth
          try {
            sessionStorage.removeItem('nivasi_pending_redirect');
          } catch (e) {
            console.error('AuthContext: Failed to clear redirect flag:', e);
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
              console.error('AuthContext: iOS - Failed to store user:', e);
            }
          }
        } else if (isIOS) {
          // User logged out, clear localStorage
          try {
            localStorage.removeItem('nivasi_auth_user');
            sessionStorage.removeItem('nivasi_pending_redirect');
          } catch (e) {
            console.error('AuthContext: iOS - Failed to clear stored user:', e);
          }
        }

        if (isMountedRef.current) {
          setUser(firebaseUser);
          setLoading(false);
          setRedirectLoading(false);
          setAuthError(null);
        }
      }, (error) => {
        console.error('AuthContext: Auth state change error:', error);

        if (isMountedRef.current) {
          setAuthError(error);
          setLoading(false);
          setRedirectLoading(false);
        }
      });

      console.log('AuthContext: Auth state listener setup complete');
    };

    // Initialize authentication
    const initializeAuth = async () => {
      try {
        // Check stored auth state first (for iOS)
        checkStoredAuthState();

        // Set up auth state listener FIRST - this is critical
        // This ensures we catch any existing auth state immediately
        setupAuthStateListener();

        // Small delay to let auth state listener initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then check for redirect result (for redirect-based auth flow)
        await handleRedirectResult();

        // Add a timeout to prevent infinite loading
        const loadingTimeoutId = setTimeout(() => {
          if (isMountedRef.current && loading) {
            console.warn('AuthContext: Loading timeout reached, forcing loading to false');
            setLoading(false);
            setRedirectLoading(false);
          }
        }, isIOS ? 15000 : 10000);
        timeoutIds.push(loadingTimeoutId);

      } catch (error) {
        console.error('AuthContext: Initialization error:', error);

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
      console.log('AuthContext: Cleaning up...');
      isMountedRef.current = false;
      if (authStateUnsubscribe) {
        console.log('AuthContext: Unsubscribing auth state listener');
        authStateUnsubscribe();
      }
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []); // Empty dependency array - only run once on mount

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out user...');

      // Clear localStorage for iOS
      if (isIOS) {
        try {
          localStorage.removeItem('nivasi_auth_user');
        } catch (e) {
          console.error('AuthContext: iOS - Failed to clear stored user:', e);
        }
      }

      // Clear session storage
      try {
        sessionStorage.removeItem('nivasi_pending_redirect');
      } catch (e) {
        console.error('AuthContext: Failed to clear redirect flag:', e);
      }

      await signOut(auth);
      console.log('AuthContext: User logged out successfully');

      // Clear any stored auth data
      setUser(null);
      setAuthError(null);
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
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