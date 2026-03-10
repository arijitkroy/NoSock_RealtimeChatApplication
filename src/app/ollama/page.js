"use client";
import { useState, useEffect, useRef } from "react";
import { useFirebase } from "@/context/FirebaseProvider";
import { collection, addDoc, onSnapshot, query, orderBy, getDocs, deleteDoc, doc, getDoc, setDoc, increment } from "firebase/firestore";
import { useUser } from "@/context/UserContext";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FaRobot, FaCloud } from "react-icons/fa";
import { FiCopy, FiShare2 } from "react-icons/fi";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

export default function OllamaChatPage() {
  const { auth, db } = useFirebase();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareExpirationDays, setShareExpirationDays] = useState(7);
  const bottomRef = useRef(null);
  const { user, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
    }
  }, [user, userLoading, router]);

  const chatRef = user?.uid && db
    ? collection(db, "users", user.uid, "ollamaMessages")
    : null;

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Load messages in real-time
  useEffect(() => {
    if (!chatRef) return;
    const q = query(chatRef, orderBy("createdAt"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsubscribe();
  }, [chatRef]);

  const sendMessage = async () => {
    if (!input.trim() || !chatRef) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      
      const today = format(new Date(), "yyyy-MM-dd");
      
      let currentCount = userData.aiMessageCount || 0;
      const lastReset = userData.aiMessageLastReset || "";

      if (lastReset !== today) {
        currentCount = 0;
      }

      const MSG_LIMIT = 10;
      if (currentCount >= MSG_LIMIT) {
        toast.error("Daily free AI chat limit reached (10). Come back tomorrow, or premium plans coming soon!");
        return;
      }

      const userMsg = {
        role: "user",
        text: input,
        createdAt: new Date(),
      };

      await addDoc(chatRef, userMsg);
      setInput("");
      setLoading(true);
      scrollToBottom();
      // Build context from previous messages + new one
      const contextMessages = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text
      }));
      contextMessages.push({ role: "user", content: input });

      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contextMessages }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch Ollama response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingMessage(fullText);
        scrollToBottom();
      }

      setStreamingMessage("");
      
      const aiMsg = {
        role: "assistant",
        text: fullText || "Sorry, no response generated.",
        createdAt: new Date(),
      };

      await addDoc(chatRef, aiMsg);
      
      if (lastReset === today) {
        await setDoc(userDocRef, { aiMessageCount: increment(1) }, { merge: true });
      } else {
        await setDoc(userDocRef, { aiMessageCount: 1, aiMessageLastReset: today }, { merge: true });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error communicating with Ollama");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleClearChat = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const confirmed = window.confirm("Are you sure you want to clear the entire chat?");
    if (!confirmed) return;

    try {
      const dbRef = collection(db, "users", user.uid, "ollamaMessages");
      const snapshot = await getDocs(dbRef);

      const deletions = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletions);

      setMessages([]);
    } catch (err) {
      console.error("Error clearing messages:", err);
      toast.error("Failed to clear chat. Please try again.");
    }
  };

  const handleShareChatClick = () => {
    if (messages.length === 0) {
      toast.error("No messages to share yet.");
      return;
    }
    setIsShareModalOpen(true);
  };

  const confirmShareChat = async () => {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + shareExpirationDays);

      const shareData = {
        userId: user.uid,
        userName: user.displayName,
        createdAt: new Date(),
        expiresAt: expirationDate,
        messages: messages,
      };
      const docRef = await addDoc(collection(db, "sharedChats"), shareData);
      const shareUrl = `${window.location.origin}/share/${docRef.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success(`Share link copied! Expires in ${shareExpirationDays} days.`);
      setIsShareModalOpen(false);
    } catch (err) {
      console.error("Error sharing chat:", err);
      toast.error("Failed to generate share link.");
    }
  };

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied!");
    } catch (err) {
      toast.error("Failed to copy message.");
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-violet-400 font-medium animate-pulse text-sm">Loading Ollama API...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center px-4 md:px-8 py-6 overflow-hidden max-w-[98vw] lg:max-w-screen-2xl mx-auto w-full">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80vh] bg-violet-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 w-full glass-panel rounded-2xl md:rounded-3xl shadow-2xl flex flex-col h-[92vh] md:h-[85vh] overflow-hidden border border-white/10">
        
        {/* Top UI Bar */}
        <div className="flex justify-between items-center px-3 md:px-6 py-3 md:py-4 bg-white/5 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xl text-violet-400"><FaCloud /></span>
            <span className="text-sm font-semibold text-neutral-200">
              Ollama Cloud AI
            </span>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button
              onClick={handleShareChatClick}
              className="text-xs bg-violet-500/20 hover:bg-violet-500 text-violet-300 hover:text-white px-3 md:px-4 py-1.5 rounded-full transition-all border border-violet-500/20 hover:border-violet-500 flex items-center gap-1.5"
            >
              <FiShare2 /> Share Chat
            </button>
            <button
              onClick={handleClearChat}
              className="text-xs bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white px-4 py-1.5 rounded-full transition-all border border-red-500/20 hover:border-red-500"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Messages Layout */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4">
              <span className="text-4xl opacity-50"><FaRobot /></span>
              <p>Start a conversation with Ollama!</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-2xl px-4 py-2.5 shadow-md transition-all ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl rounded-br-sm"
                    : "bg-white/10 backdrop-blur-md border border-white/5 text-neutral-100 rounded-xl rounded-tl-sm"
                }`}
              >
                {msg.role !== "user" && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-violet-300">Ollama API</span>
                    <button
                      onClick={() => handleCopyMessage(msg.text)}
                      className="text-neutral-400 hover:text-white transition-colors p-1"
                      title="Copy Message"
                    >
                      <FiCopy size={14} />
                    </button>
                  </div>
                )}
                <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap overflow-x-auto p-1 custom-scrollbar leading-relaxed group">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                  >
                    {msg.text}
                  </ReactMarkdown>
                  {msg.role === "user" && (
                    <button
                      onClick={() => handleCopyMessage(msg.text)}
                      className="absolute top-4 right-4 text-white/50 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 p-1 bg-black/20 rounded-md backdrop-blur-sm"
                      title="Copy Message"
                    >
                      <FiCopy size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[85%] md:max-w-2xl px-4 py-2.5 shadow-md transition-all bg-white/10 backdrop-blur-md border border-white/5 text-neutral-100 rounded-xl rounded-tl-sm relative group p-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-violet-300">Ollama API</span>
                  <button
                    onClick={() => handleCopyMessage(streamingMessage)}
                    className="text-neutral-400 hover:text-white transition-colors p-1"
                    title="Copy Message"
                  >
                    <FiCopy size={14} />
                  </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap overflow-x-auto p-1 custom-scrollbar leading-relaxed">

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {loading && !streamingMessage && (
            <div className="flex justify-start">
               <div className="bg-white/5 backdrop-blur-md border border-white/5 px-6 py-4 rounded-xl rounded-tl-sm text-neutral-400 flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"></div>
                 <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-100"></div>
                 <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-200"></div>
               </div>
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-4 bg-black/20 backdrop-blur-lg border-t border-white/5">
          <div className="flex w-full gap-2 md:gap-3">
            <input
              type="text"
              className="flex-grow rounded-full bg-white/5 border border-white/10 px-4 md:px-5 py-2.5 md:py-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-white placeholder-neutral-500 transition-all"
              placeholder="Message Ollama..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button
              className={`px-5 md:px-8 py-2.5 md:py-3 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all active:scale-95 ${
                loading 
                  ? "bg-violet-600/50 text-white/50 cursor-not-allowed" 
                  : "bg-violet-600 text-white hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]"
              }`}
              onClick={sendMessage}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl relative">
            <h2 className="text-xl font-bold text-neutral-100 mb-2">Share Conversation</h2>
            <p className="text-sm text-neutral-400 mb-6">Create a public link to share this chat. Links will expire automatically.</p>
            
            <div className="space-y-4 mb-6">
              <label className="block text-sm font-medium text-neutral-300">Expiration Period</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 7].map((days) => (
                  <button
                    key={days}
                    onClick={() => setShareExpirationDays(days)}
                    className={`py-2 rounded-xl text-sm font-medium transition-all ${
                      shareExpirationDays === days
                        ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                        : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 border border-white/5"
                    }`}
                  >
                    {days} Day{days > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-full font-bold transition-all border border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmShareChat}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-full font-bold transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
