"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useFirebase } from "@/context/FirebaseProvider";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const { auth } = useFirebase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully!");
      router.push("/chat");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Logged in with Google!");
      router.push("/chat");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center p-4 overflow-hidden">
      {/* Background glowing elements */}
      <div className="absolute top-1/4 -left-10 w-72 h-72 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-sm glass-panel p-8 rounded-2xl shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-md">
            Welcome Back
          </h2>
          <p className="text-neutral-400 text-sm mt-2">Sign in to continue to NoSock</p>
        </div>

        <div className="space-y-4">
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
          Sign In
        </button>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="px-3 text-neutral-500 text-sm">Or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-4 text-sm font-bold bg-white/5 text-white rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <FcGoogle size={20} />
          Sign in with Google
        </button>

        <p className="text-sm text-center text-neutral-400">
          Don’t have an account?{" "}
          <a href="/auth/register" className="text-violet-400 hover:text-violet-300 font-medium transition">
            Create one
          </a>
        </p>
      </form>
    </div>
  );
}