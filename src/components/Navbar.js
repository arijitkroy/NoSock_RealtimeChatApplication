"use client";

import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/context/UserContext";
import { signOut } from "firebase/auth";
import { useFirebase } from "@/context/FirebaseProvider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useEffect, useRef } from "react";
import { HiMenu, HiX } from "react-icons/hi";

export default function Navbar() {
  const { auth } = useFirebase();
  const { user } = useUser();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out");
      router.push("/auth/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const username = user?.displayName || user?.email?.split("@")[0] || "User";
  const avatar = user?.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${username}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(167,139,250,0.3)]">
          NoSock
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="sm:hidden text-neutral-300 hover:text-white transition"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <HiX size={28} /> : <HiMenu size={28} />}
        </button>

        {/* Desktop Links */}
        <div className="hidden sm:flex items-center space-x-6 text-sm font-medium">
          <Link href="/chat" className="text-neutral-300 hover:text-violet-400 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all">Chatrooms</Link>
          <Link href="/ollama" className="text-neutral-300 hover:text-violet-400 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all">Ollama Chat</Link>
          {user && (
            <Link href="/friends" className="text-neutral-300 hover:text-violet-400 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.5)] transition-all">Friends</Link>
          )}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-3 focus:outline-none hover:opacity-80 transition"
              >
                <span className="text-sm hidden md:inline font-medium text-neutral-200">{username}</span>
                <Image
                  src={avatar}
                  alt="avatar"
                  className="w-9 h-9 rounded-full ring-2 ring-violet-500/50 object-cover"
                  width={40}
                  height={40}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 glass-panel rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-sm text-neutral-200 hover:bg-white/10 hover:text-white transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="ml-2 px-5 py-2 text-sm font-semibold rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Links */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/5 bg-black/80 backdrop-blur-md space-y-1 px-4 py-4 animate-in slide-in-from-top-2">
          <Link href="/chat" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-neutral-200 hover:bg-white/5 rounded-lg transition">Chatrooms</Link>
          <Link href="/ollama" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-neutral-200 hover:bg-white/5 rounded-lg transition">Ollama Chat</Link>
          {user && (
            <Link href="/friends" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-neutral-200 hover:bg-white/5 rounded-lg transition">Friends</Link>
          )}

          {user ? (
            <>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-neutral-200 hover:bg-white/5 rounded-lg transition">View Profile</Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 rounded-lg transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-violet-400 hover:bg-white/5 rounded-lg transition font-medium">Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}