'use client';

import Link from 'next/link';
import { FaBrain } from "react-icons/fa";
import { FiMessageSquare, FiUser, FiZap } from "react-icons/fi";

export default function HomePage() {
  return (
    <main className="relative min-h-[90vh] flex items-center justify-center p-6 overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl w-full glass-panel p-10 md:p-14 rounded-3xl shadow-2xl flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight bg-gradient-to-br from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
          Welcome to <br className="md:hidden" />
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(167,139,250,0.3)]">NoSock</span>
        </h1>

        <p className="text-lg md:text-xl text-neutral-300 max-w-2xl mb-10 leading-relaxed font-light">
          Your personal companion for intelligent conversations, powered by advanced language models. Whether chatting casually or exploring deep topics, experience it in stunning real-time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left w-full max-w-2xl text-sm md:text-base text-neutral-200 font-medium mb-12">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition">
            <span className="text-xl text-violet-400"><FaBrain /></span> Chat with AI models (Ollama Cloud API)
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition">
            <span className="text-xl text-violet-400"><FiMessageSquare /></span> Real-time Chatrooms
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition">
            <span className="text-xl text-violet-400"><FiUser /></span> Custom Avatars & Profiles
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition">
            <span className="text-xl text-violet-400"><FiZap /></span> Fast & Secure Auth
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/auth/login" className="px-8 py-3 rounded-full text-sm font-bold bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:bg-violet-500 hover:-translate-y-0.5 transition-all duration-300">
            Get Started
          </Link>
          <Link href="/chat" className="px-8 py-3 rounded-full text-sm font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300">
            Explore Chatrooms
          </Link>
        </div>
      </div>
    </main>
  );
}
