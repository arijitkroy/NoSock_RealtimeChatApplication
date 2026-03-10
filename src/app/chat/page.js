"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/context/FirebaseProvider";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { FiCopy } from "react-icons/fi";
import { useUser } from "@/context/UserContext";

export default function ChatLobbyPage() {
  const { auth, db } = useFirebase();
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [chatrooms, setChatrooms] = useState([]);
  const [roomInput, setRoomInput] = useState("");
  const [isExistingRoom, setIsExistingRoom] = useState(false);
  const [memberCounts, setMemberCounts] = useState({});

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!db) return;
    const unsubscribers = [];

    chatrooms.forEach((room) => {
      const membersRef = collection(db, "chatrooms", room.id, "members");
      const unsub = onSnapshot(membersRef, (snapshot) => {
        setMemberCounts((prev) => ({
          ...prev,
          [room.id]: snapshot.size,
        }));
      });

      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [chatrooms]);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, "chatrooms"), async (snapshot) => {
      const rooms = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const memberSnap = await getDocs(collection(db, "chatrooms", docSnap.id, "members"));
          return {
            id: docSnap.id,
            ...docSnap.data(),
            memberCount: memberSnap.size,
          };
        })
      );
      setChatrooms(rooms);
    });
    return () => unsub();
  }, []);

  // Detect if the input matches an existing room ID
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!roomInput.trim() || !db) return setIsExistingRoom(false);
      const ref = doc(db, "chatrooms", roomInput.trim());
      const snap = await getDoc(ref);
      setIsExistingRoom(snap.exists());
    }, 500); // debounce

    return () => clearTimeout(timeout);
  }, [roomInput]);

  const handleAction = async () => {
    const input = roomInput.trim();
    if (!input) return toast.error("Input cannot be empty");

    try {
      if (isExistingRoom) {
        // Join existing room
        await setDoc(doc(db, "chatrooms", input, "members", auth.currentUser.uid), {
          email: auth.currentUser.email,
          joinedAt: serverTimestamp(),
        });
        toast.success("Joined room");
        router.push(`/chat/${input}`);
      } else {
        // Check for duplicate room name
        const q = await getDocs(
          query(collection(db, "chatrooms"), where("name", "==", input))
        );

        if (!q.empty) {
          return toast.error("Room name already exists. Choose a different name.");
        }

        // Create new room
        const docRef = await addDoc(collection(db, "chatrooms"), {
          name: input,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser.uid,
        });

        await setDoc(doc(db, "chatrooms", docRef.id, "members", auth.currentUser.uid), {
          email: auth.currentUser.email,
          joinedAt: serverTimestamp(),
        });

        toast.success("Room created");
        router.push(`/chat/${docRef.id}`);
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Room ID copied!");
    } catch (e) {
      toast.error("Failed to copy");
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-[90vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-violet-400 font-medium animate-pulse text-sm">Loading Lobby...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[90vh] p-6 lg:p-10 flex flex-col items-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-md">
            Lobby & Chatrooms
          </h1>
          <p className="text-neutral-400 mt-2">Join a public room or create your own secure space.</p>
        </div>

        {/* Smart Create/Join Input */}
        <div className="flex mb-10 w-full max-w-2xl mx-auto shadow-2xl rounded-2xl overflow-hidden glass-panel">
          <input
            type="text"
            placeholder="Enter room name or ID..."
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className="flex-1 px-6 py-4 bg-transparent text-white placeholder-neutral-500 outline-none"
          />
          <button
            onClick={handleAction}
            className={`px-8 py-4 font-bold text-white transition-all ${
              isExistingRoom
                ? "bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]"
                : "bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.4)]"
            }`}
          >
            {isExistingRoom ? "Join Room" : "Create Room"}
          </button>
        </div>

        {/* Chatroom list grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {chatrooms.map((room) => (
            <div
              key={room.id}
              className="glass-panel p-6 rounded-2xl hover:bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all group relative overflow-hidden"
            >
              {/* Member count at top-right */}
              <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/10 text-neutral-200 text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {memberCounts[room.id] ?? 0}
              </div>

              {/* Room name & ID */}
              <div
                className="cursor-pointer"
                onClick={async () => {
                  await setDoc(doc(db, "chatrooms", room.id, "members", auth.currentUser.uid), {
                    email: auth.currentUser.email,
                    joinedAt: serverTimestamp(),
                  });
                  router.push(`/chat/${room.id}`);
                }}
              >
                <h2 className="text-xl font-bold text-neutral-100 group-hover:text-violet-300 transition-colors mb-2 truncate pr-16">
                  {room.name || "Unnamed Room"}
                </h2>
                <p className="text-xs text-neutral-500 font-mono bg-black/30 w-fit px-2 py-1 rounded">
                  ID: {room.id}
                </p>
              </div>

              {/* Copy room ID at bottom-right */}
              <button
                onClick={() => copyToClipboard(room.id)}
                className="mt-4 text-xs font-medium text-violet-400 hover:text-violet-300 opacity-80 hover:opacity-100 transition flex items-center gap-1"
              >
                <FiCopy /> Copy Room ID
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}