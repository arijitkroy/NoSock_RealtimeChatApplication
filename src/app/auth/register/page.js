"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useFirebase } from "@/context/FirebaseProvider";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { useUser } from '@/context/UserContext';
import { FcGoogle } from "react-icons/fc";

export default function RegisterPage() {
  const { auth, db } = useFirebase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const { user, setUser } = useUser();

  const handleRegister = async (e) => {
    e.preventDefault();

    const username = usernameInput.trim();

    if (!username || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const isValidUsername = /^[a-zA-Z0-9._]+$/.test(username);
    if (!isValidUsername) {
      toast.error("Username can only contain letters, numbers, dot or underscore");
      return;
    }

    try {
      // Check if username already exists
      const usernameRef = doc(db, "usernames", username);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        toast.error("Username is already taken");
        return;
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Set displayName on the auth profile
      await updateProfile(auth.currentUser, {
        displayName: username,
      });

      const uid = userCredential.user.uid;

      // Save user data in 'users' collection
      await setDoc(doc(db, "users", uid), {
        username,
        email,
        createdAt: new Date(),
      });

      // Map username to UID in 'usernames' collection
      await setDoc(doc(db, "usernames", username), {
        uid,
      });

      toast.success("Account created!");
      setUser((prev) => ({
        ...prev,
        displayName: username
      }));
      router.push("/chat");
    } catch (error) {
      toast.error('Email is already taken.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const uid = userCredential.user.uid;
      const email = userCredential.user.email;
      const generatedUsername = userCredential.user.displayName || email.split('@')[0];
      
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          username: generatedUsername,
          email,
          createdAt: new Date(),
        });
        await setDoc(doc(db, "usernames", generatedUsername), {
          uid,
        });
      }
      
      setUser((prev) => ({
        ...prev,
        displayName: userDoc.exists() ? userDoc.data().username : generatedUsername
      }));

      toast.success("Logged in with Google!");
      router.push("/chat");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center p-4 overflow-hidden">
      {/* Background glowing elements */}
      <div className="absolute top-1/4 -right-10 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <form
        onSubmit={handleRegister}
        className="relative z-10 w-full max-w-sm glass-panel p-8 rounded-2xl shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-md">
            Create Account
          </h2>
          <p className="text-neutral-400 text-sm mt-2">Join NoSock today</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-4 text-sm font-bold bg-violet-600 text-white rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:bg-violet-500 transition-all active:scale-[0.98]"
        >
          Sign Up
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="px-3 text-neutral-500 text-sm">Or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full py-4 text-sm font-bold bg-white/5 text-white rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <FcGoogle size={20} />
          Sign up with Google
        </button>

        <p className="text-sm text-center text-neutral-400">
          Already have an account?{" "}
          <a href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium transition">
            Sign In
          </a>
        </p>
      </form>
    </div>
  );
}