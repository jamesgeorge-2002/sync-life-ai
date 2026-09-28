import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfileDocument } from "@/lib/db";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  twoFactorAuthenticated: boolean;
  setTwoFactorAuthenticated: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  twoFactorAuthenticated: false,
  setTwoFactorAuthenticated: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorAuthenticated, setTwoFactorAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      try {
        if (userAuth) {
          // Immediately set user and finish auth loading to make login instant
          setUser(userAuth);
          setLoading(false);

          // Run database profile creation and initialization in the background
          (async () => {
            try {
              await createUserProfileDocument(userAuth.uid, {
                email: userAuth.email,
                displayName: userAuth.displayName,
                photoURL: userAuth.photoURL,
              });
            } catch (err) {
              console.error("Error initializing new user workspace in background:", err);
            }
          })();
        } else {
          setUser(null);
          setTwoFactorAuthenticated(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged profile creation:", error);
        setUser(userAuth);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setTwoFactorAuthenticated(false);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, twoFactorAuthenticated, setTwoFactorAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
