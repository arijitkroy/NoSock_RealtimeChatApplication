"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const FirebaseContext = createContext(null);

export function FirebaseProvider({ children, config }) {
  const [firebaseInstance, setFirebaseInstance] = useState(null);

  useEffect(() => {
    if (!config) return;
    
    // Initialize Firebase
    const app = getApps().length ? getApp() : initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);

    setFirebaseInstance({ app, auth, db });
  }, [config]);

  // If Firebase is not yet initialized on the client, you might want to return a loading state or just provide null.
  // We'll provide it, but consumers should handle the null case if they render before useEffect fires,
  // or we can wait to render children until it's initialized.
  
  if (!firebaseInstance) {
    return null; // Prevents rendering children until Firebase is ready, avoiding null references in child contexts.
  }

  return (
    <FirebaseContext.Provider value={firebaseInstance}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === null) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}
