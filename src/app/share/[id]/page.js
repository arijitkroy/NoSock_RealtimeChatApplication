"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useFirebase } from "@/context/FirebaseProvider";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import toast from "react-hot-toast";
import { FaCloud } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import Link from "next/link";

export default function SharedChatPage() {
  const { id } = useParams();
  const { db } = useFirebase();
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!id || !db) return;

    const fetchChat = async () => {
      try {
        const docRef = doc(db, "sharedChats", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
            setIsExpired(true);
            setChatData(null);
            try {
              await deleteDoc(docRef);
            } catch (deleteErr) {
              console.error("Failed to delete expired chat:", deleteErr);
            }
          } else {
            setChatData(data);
          }
        } else {
          setChatData(null);
        }
      } catch (err) {
        console.error("Error fetching shared chat:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [id, db]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Share link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied!");
    } catch {
      toast.error("Failed to copy message.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-violet-400 font-medium animate-pulse text-sm">Loading Shared Chat...</p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center space-y-4">
        <FaCloud className="text-6xl text-neutral-500 opacity-50" />
        <h2 className="text-xl font-bold text-neutral-300">Shared Chat Expired</h2>
        <p className="text-neutral-500 text-sm">This link has passed its expiration date and is no longer available.</p>
        <Link href="/" className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-all text-sm font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center space-y-4">
        <FaCloud className="text-6xl text-neutral-500 opacity-50" />
        <h2 className="text-xl font-bold text-neutral-300">Shared Chat Not Found</h2>
        <p className="text-neutral-500 text-sm">This link may be invalid or the chat was deleted.</p>
        <Link href="/" className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-all text-sm font-bold">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center px-4 py-6 overflow-hidden max-w-6xl mx-auto w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[80vh] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 w-full glass-panel rounded-3xl shadow-2xl flex flex-col h-[85vh] overflow-hidden border border-white/10">
        <div className="flex justify-between items-center px-6 py-4 bg-white/5 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xl text-violet-400"><FaCloud /></span>
            <span className="text-sm font-semibold text-neutral-200 truncate max-w-[200px] sm:max-w-xs">
              Shared Chat from {chatData.userName}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="text-xs bg-violet-500/20 hover:bg-violet-500 text-violet-300 hover:text-white px-4 py-1.5 rounded-full transition-all border border-violet-500/20 hover:border-violet-500 flex items-center gap-2 shadow-md"
            >
              <FiCopy /> Copy Link
            </button>
            <Link
              href="/"
              className="text-xs bg-white/5 hover:bg-white/10 text-neutral-300 px-4 py-1.5 rounded-full transition-all border border-white/5 text-center flex items-center justify-center"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
          {chatData.messages?.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] md:max-w-2xl px-6 py-4 shadow-md transition-all group relative p-1 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl rounded-br-sm"
                    : "bg-white/10 backdrop-blur-md border border-white/5 text-neutral-100 rounded-3xl rounded-tl-sm"
                }`}
              >
                {msg.role !== "user" && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-blue-300">Ollama API</span>
                    <button onClick={() => handleCopyMessage(msg.text)} className="text-neutral-400 hover:text-white transition-colors p-1" title="Copy Message">
                      <FiCopy size={14} />
                    </button>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap overflow-x-auto p-1 custom-scrollbar leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                  >
                    {msg.text}
                  </ReactMarkdown>
                  {msg.role === "user" && (
                    <button
                      onClick={() => handleCopyMessage(msg.text)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-opacity opacity-0 md:group-hover:opacity-100 p-1 bg-black/20 rounded-md backdrop-blur-sm"
                      title="Copy Message"
                    >
                      <FiCopy size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
