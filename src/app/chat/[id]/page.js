"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebase } from "@/context/FirebaseProvider";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { FiCopy, FiSettings, FiTrash2, FiLogOut } from "react-icons/fi";
import { format, isToday, isYesterday } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useUser } from "@/context/UserContext";

export default function ChatRoomPage() {
  const { auth, db } = useFirebase();
  const { user, loading: userLoading } = useUser();
  const { id } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [members, setMembers] = useState([]);
  const [roomData, setRoomData] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasInitialLoadRef = useRef(true);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
    }
  }, [user, userLoading, router]);

  // Fetch & listen to messages + members
  useEffect(() => {
    if (!id || !user || !db) return;

    const msgQuery = query(
      collection(db, "chatrooms", id, "messages"),
      orderBy("createdAt")
    );
    const unsubMessages = onSnapshot(msgQuery, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(newMessages);

      // Send browser notifications for new messages from others
      if (hasInitialLoadRef.current) {
        hasInitialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const msg = change.doc.data();
          if (
            msg.user &&
            msg.user !== user?.displayName &&
            !msg.system &&
            document.visibilityState === "hidden" &&
            Notification.permission === "granted"
          ) {
            new Notification(`${msg.user} in NoSock`, {
              body: msg.text?.slice(0, 100) || "Sent a message",
              icon: "/favicon.ico",
              tag: change.doc.id,
            });
          }
        }
      });
    });

    const membersCol = collection(db, "chatrooms", id, "members");
    const unsubMembers = onSnapshot(membersCol, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    });

    const roomRef = doc(db, "chatrooms", id);
    const unsubRoom = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoomData({ id: docSnap.id, ...docSnap.data() });
      } else {
        router.push("/chat");
      }
    });

    const joinChat = async () => {
      const memberDocRef = doc(db, "chatrooms", id, "members", user.uid);
      const memberSnap = await getDoc(memberDocRef);
      const isNewMember = !memberSnap.exists();

      await setDoc(memberDocRef, {
        email: user.email,
        name: user.displayName,
        isOnline: true,
        isTyping: false,
        photoURL: user.photoURL || "",
        joinedAt: serverTimestamp(),
      }, { merge: true });

      if (isNewMember) {
        await addDoc(collection(db, "chatrooms", id, "messages"), {
          text: `${user.displayName} has joined the chat.`,
          system: true,
          createdAt: serverTimestamp(),
        });
      }
    };

    joinChat();
    setHasJoined(true);

    const handleBeforeUnload = async () => {
      await setDoc(doc(db, "chatrooms", id, "members", user.uid), {
        isOnline: false,
        isTyping: false,
      }, { merge: true });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubMessages();
      unsubMembers();
      unsubRoom();
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [id, user]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    scrollToBottom();

    // Clear typing state on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setDoc(doc(db, "chatrooms", id, "members", user.uid), { isTyping: false }, { merge: true });

    try {
      await addDoc(collection(db, "chatrooms", id, "messages"), {
        text,
        user: user.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch {
      toast.error("Message failed");
    }
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (!id || !user || !db) return;

    setDoc(doc(db, "chatrooms", id, "members", user.uid), { isTyping: true }, { merge: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(db, "chatrooms", id, "members", user.uid), { isTyping: false }, { merge: true });
    }, 2000);
  };

  const leaveRoom = async () => {
    try {
      await deleteDoc(doc(db, "chatrooms", id, "members", user.uid));

      await addDoc(collection(db, "chatrooms", id, "messages"), {
        text: `${user.displayName} has left the chat.`,
        system: true,
        createdAt: serverTimestamp(),
      });

      const membersSnapshot = await getDocs(
        collection(db, "chatrooms", id, "members")
      );
      if (membersSnapshot.empty) {
        await deleteDoc(doc(db, "chatrooms", id));
        toast("Room deleted as no members remain.");
      } else {
        toast.success("Left the room");
      }

      router.push("/chat");
    } catch (err) {
      toast.error("Failed to leave room");
    }
  };

  const deleteRoom = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this room?")) return;
    try {
      const membersSnap = await getDocs(collection(db, "chatrooms", id, "members"));
      membersSnap.forEach(async (m) => await deleteDoc(doc(db, "chatrooms", id, "members", m.id)));
      
      const messagesSnap = await getDocs(collection(db, "chatrooms", id, "messages"));
      messagesSnap.forEach(async (m) => await deleteDoc(doc(db, "chatrooms", id, "messages", m.id)));
      
      await deleteDoc(doc(db, "chatrooms", id));
      toast.success("Room deleted");
      router.push("/chat");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete room");
    }
  };

  const groupMessagesByDay = (messages) => {
    const grouped = {};
    messages.forEach((msg) => {
      if (!msg.createdAt?.toDate) return;
      const date = msg.createdAt.toDate();
      const key = format(date, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(msg);
    });
    return grouped;
  };

  const groupedMessages = groupMessagesByDay(messages);

  if (userLoading || !user) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-violet-400 font-medium animate-pulse text-sm">Connecting to Room...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center px-4 md:px-8 py-6 overflow-hidden max-w-[98vw] lg:max-w-screen-2xl mx-auto w-full">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80vh] bg-violet-600/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 w-full glass-panel rounded-2xl md:rounded-3xl shadow-2xl flex flex-col h-[92vh] md:h-[85vh] overflow-hidden border border-white/10">
        
        {/* Top UI Bar */}
        <div className="flex justify-between items-center px-3 md:px-6 py-3 md:py-4 bg-white/5 backdrop-blur-md border-b border-white/5 relative z-50">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs md:text-sm font-semibold text-neutral-200">
              {members.filter(m => m.isOnline).length} Online
            </span>
          </div>
          <div className="flex gap-1.5 md:gap-2 relative">
            {/* Mobile members toggle */}
            <button
              onClick={() => setIsMobileMembersOpen(!isMobileMembersOpen)}
              className="lg:hidden text-xs bg-white/10 hover:bg-white/20 text-neutral-200 px-3 py-1.5 rounded-full transition-all border border-white/5"
            >
              Members
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(id);
                toast.success("Room ID copied");
              }}
              className="text-xs bg-white/10 hover:bg-white/20 text-neutral-200 px-2.5 md:px-3 py-1.5 rounded-full transition-all border border-white/5 flex items-center gap-1.5"
            >
              <FiCopy /> Copy ID
            </button>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-neutral-200 transition-all border border-white/5"
            >
              <FiSettings size={14} className={isSettingsOpen ? "rotate-90 transition-transform" : "transition-transform"} />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-[110%] w-48 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl py-2 z-99">
                <button
                  onClick={leaveRoom}
                  className="w-full text-left px-5 py-2.5 text-sm text-neutral-200 hover:bg-white/10 flex items-center gap-3 transition-colors"
                >
                  <FiLogOut size={16} /> Leave Room
                </button>
                {roomData?.createdBy === user?.uid && (
                  <button
                    onClick={deleteRoom}
                    className="w-full text-left px-5 py-2.5 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors mt-1"
                  >
                    <FiTrash2 size={16} /> Delete Room
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4 custom-scrollbar lg:border-r border-white/5">
            {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => {
              const firstDate = dayMessages[0]?.createdAt?.toDate?.();
              const label = isToday(firstDate)
                ? "Today"
                : isYesterday(firstDate)
                ? "Yesterday"
                : format(firstDate, "MMMM d, yyyy");

              return (
                <div key={dateKey}>
                  <div className="flex justify-center my-6">
                    <div className="text-xs font-medium text-neutral-400 bg-white/5 px-4 py-1 rounded-full border border-white/5">
                      {label}
                    </div>
                  </div>
                  {dayMessages.map((msg, i) => {
                    const isUser = msg.user === user?.displayName;
                    const isSystem = msg.system;
                    return (
                      <div
                        key={msg.id || i}
                        className={`flex mb-4 ${
                          isSystem
                            ? "justify-center"
                            : isUser
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] md:max-w-md px-4 py-2.5 text-sm shadow-md transition-all ${
                            isSystem
                              ? "bg-white/5 backdrop-blur-sm text-neutral-400 text-center rounded-full border border-white/5 text-xs italic"
                              : isUser
                              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-xl rounded-tr-sm"
                              : "bg-white/10 backdrop-blur-md border border-white/5 text-neutral-100 rounded-xl rounded-tl-sm"
                          }`}
                        >
                          {!isUser && !isSystem && (
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-bold text-violet-300">
                                {msg.user}
                              </p>
                              <span className="text-[10px] text-neutral-400">
                                {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "HH:mm") : ""}
                              </span>
                            </div>
                          )}
                          <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap overflow-x-auto p-1 custom-scrollbar leading-relaxed">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[
                                rehypeRaw,
                                rehypeHighlight,
                                rehypeKatex,
                              ]}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                          {isUser && !isSystem && (
                            <div className="text-right mt-1">
                               <span className="text-[10px] text-violet-200/70">
                                {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "HH:mm") : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Members Sidebar - Desktop */}
          <div className="hidden lg:flex flex-col w-64 bg-black/10 backdrop-blur-md">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">Members</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {members.map(member => (
                <div key={member.uid} className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={member.photoURL || `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${member.uid}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} 
                      alt={member.name}
                      className="w-8 h-8 rounded-full border border-white/10 object-cover"
                    />
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#0d1020] ${member.isOnline ? "bg-green-500 animate-pulse" : "bg-neutral-500"}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-200 truncate w-36">
                      {member.name || "Anonymous User"}
                      {member.uid === user?.uid && " (You)"}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {member.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Input Area */}
        {hasJoined && (
          <div className="bg-black/20 backdrop-blur-lg border-t border-white/5">
            {(() => {
              const typingUsers = members.filter(m => m.isTyping && m.uid !== user?.uid);
              if (typingUsers.length === 0) return null;
              const names = typingUsers.map(m => m.name || "Someone");
              const label = names.length === 1
                ? `${names[0]} is typing...`
                : names.length === 2
                ? `${names[0]} and ${names[1]} are typing...`
                : `${names[0]} and ${names.length - 1} others are typing...`;
              return (
                <div className="px-6 pt-2 pb-0">
                  <span className="text-xs text-violet-400 animate-pulse font-medium">{label}</span>
                </div>
              );
            })()}
            <div className="flex w-full gap-2 md:gap-3 p-3 md:p-4">
              <input
                type="text"
                className="flex-grow rounded-full bg-white/5 border border-white/10 px-4 md:px-5 py-2.5 md:py-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-white placeholder-neutral-500 transition-all"
                placeholder="Type a message..."
                value={text}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className="bg-violet-600 text-white px-5 md:px-8 py-2.5 md:py-3 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] transition-all active:scale-95"
                onClick={sendMessage}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members Sidebar - Mobile Overlay */}
      {isMobileMembersOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999]" onClick={() => setIsMobileMembersOpen(false)}>
          <div className="absolute inset-0 bg-black/60"></div>
          <div className="absolute right-0 top-0 h-full w-72 bg-neutral-900 border-l border-white/10 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">Members</h3>
              <button onClick={() => setIsMobileMembersOpen(false)} className="text-neutral-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {members.map(member => (
                <div key={member.uid} className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={member.photoURL || `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${member.uid}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} 
                      alt={member.name}
                      className="w-8 h-8 rounded-full border border-white/10 object-cover"
                    />
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-neutral-900 ${member.isOnline ? "bg-green-500 animate-pulse" : "bg-neutral-500"}`}></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-200 truncate w-44">
                      {member.name || "Anonymous User"}
                      {member.uid === user?.uid && " (You)"}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {member.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
