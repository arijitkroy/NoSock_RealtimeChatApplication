"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useFirebase } from "@/context/FirebaseProvider";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FaUserPlus, FaUserFriends, FaUserClock, FaSearch, FaCommentDots, FaTrash, FaCheck, FaTimes } from "react-icons/fa";

export default function FriendsPage() {
  const { user, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("friends"); // friends, requests, add
  
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!user) return;

    // Listen to friends subcollection
    const friendsRef = collection(db, "users", user.uid, "friends");
    const unsubscribe = onSnapshot(friendsRef, (snapshot) => {
      const allFriends = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setFriends(allFriends.filter(f => f.status === "accepted"));
      setIncomingRequests(allFriends.filter(f => f.status === "pending_received"));
      setOutgoingRequests(allFriends.filter(f => f.status === "pending_sent"));
    });

    return () => unsubscribe();
  }, [user]);

  const handleSearchAndAdd = async (e) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    if (searchEmail.toLowerCase() === user.email.toLowerCase()) {
      toast.error("You cannot add yourself as a friend");
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", searchEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error("User not found with that email address");
        setIsSearching(false);
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUid = targetUserDoc.id;
      const targetData = targetUserDoc.data();

      // Check if already friends or request pending
      const existingStatus = [...friends, ...incomingRequests, ...outgoingRequests].find(f => f.id === targetUid);
      
      if (existingStatus) {
        if (existingStatus.status === "accepted") toast.error("Already friends with this user!");
        else if (existingStatus.status === "pending_sent") toast.error("Friend request already sent!");
        else if (existingStatus.status === "pending_received") toast.error("You already have an incoming request from this user!");
        setIsSearching(false);
        return;
      }

      // 1. Set outgoing request in current user's friends list
      await setDoc(doc(db, "users", user.uid, "friends", targetUid), {
        email: targetData.email,
        name: targetData.username || "User",
        photoURL: targetData.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${targetData.username || targetData.email}`,
        status: "pending_sent",
        timestamp: serverTimestamp()
      });

      // 2. Set incoming request in target user's friends list
      await setDoc(doc(db, "users", targetUid, "friends", user.uid), {
        email: user.email,
        name: user.displayName || "User",
        photoURL: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user.displayName || user.email}`,
        status: "pending_received",
        timestamp: serverTimestamp()
      });

      toast.success("Friend request sent!");
      setSearchEmail("");
      setActiveTab("requests");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send friend request.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAcceptRequest = async (friendId) => {
    try {
      await updateDoc(doc(db, "users", user.uid, "friends", friendId), { status: "accepted" });
      await updateDoc(doc(db, "users", friendId, "friends", user.uid), { status: "accepted" });
      toast.success("Friend request accepted!");
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };

  const handleRejectOrCancel = async (friendId, type) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "friends", friendId));
      await deleteDoc(doc(db, "users", friendId, "friends", user.uid));
      toast.success(type === "reject" ? "Request rejected" : "Request cancelled");
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "friends", friendId));
      await deleteDoc(doc(db, "users", friendId, "friends", user.uid));
      toast.success("Friend removed");
    } catch (error) {
      toast.error("Failed to remove friend");
    }
  };

  const handleMessageUser = async (friendId) => {
    // Generate deterministic room ID by sorting UIDs alphabetically
    const uids = [user.uid, friendId].sort();
    const dmRoomId = `${uids[0]}_${uids[1]}`;
    
    try {
      const roomRef = doc(db, "chatrooms", dmRoomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        await setDoc(roomRef, {
          name: "Direct Message",
          isDirectMessage: true,
          dmMembers: [user.uid, friendId],
          createdAt: serverTimestamp()
        });
      }
      router.push(`/chat/${dmRoomId}?dm=true`);
    } catch (error) {
      toast.error("Failed to start conversation");
    }
  };

  if (userLoading || !user) return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="relative min-h-[90vh] px-4 py-8 lg:p-10 flex flex-col items-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl glass-panel rounded-3xl shadow-2xl p-6 lg:p-10 border border-white/10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-md mb-8 text-center">
          Friends
        </h1>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap md:flex-nowrap gap-2 bg-black/20 p-2 rounded-2xl mb-8">
          <button 
            onClick={() => setActiveTab("friends")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all text-sm md:text-base ${activeTab === "friends" ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
          >
            <FaUserFriends /> My Friends <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">{friends.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab("requests")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all text-sm md:text-base ${activeTab === "requests" ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
          >
            <FaUserClock /> Requests <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">{incomingRequests.length + outgoingRequests.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab("add")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all text-sm md:text-base ${activeTab === "add" ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
          >
            <FaUserPlus /> Add Friend
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          
          {/* MY FRIENDS TAB */}
          {activeTab === "friends" && (
            <div className="space-y-4">
              {friends.length === 0 ? (
                <div className="text-center py-20 text-neutral-500">
                  <FaUserFriends className="text-6xl mx-auto mb-4 opacity-20" />
                  <p>You {"haven't"} added any friends yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(friend => (
                    <div key={friend.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <img src={friend.photoURL} alt={friend.name} className="w-12 h-12 rounded-full object-cover border-2 border-transparent" />
                        <div>
                          <h3 className="font-bold text-neutral-200">{friend.name}</h3>
                          <p className="text-xs text-neutral-500">{friend.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleMessageUser(friend.id)}
                          className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-all shadow-lg active:scale-95"
                          title="Message"
                        >
                          <FaCommentDots />
                        </button>
                        <button 
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="p-2.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-full transition-all active:scale-95"
                          title="Remove Friend"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === "requests" && (
            <div className="space-y-8">
              {/* Incoming Requests */}
              <div>
                <h2 className="text-lg font-bold text-violet-300 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span> Incoming Requests
                </h2>
                {incomingRequests.length === 0 ? (
                  <p className="text-neutral-500 text-sm py-4 bg-black/20 rounded-xl px-4">No pending incoming requests.</p>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map(req => (
                      <div key={req.id} className="bg-black/30 border border-violet-500/20 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <img src={req.photoURL} alt={req.name} className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <h3 className="font-bold text-neutral-200">{req.name}</h3>
                            <p className="text-xs text-neutral-500">{req.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleAcceptRequest(req.id)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(22,163,74,0.3)]">
                            <FaCheck /> Accept
                          </button>
                          <button onClick={() => handleRejectOrCancel(req.id, "reject")} className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                            <FaTimes /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Requests */}
              <div>
                <h2 className="text-lg font-bold text-neutral-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neutral-600"></span> Outgoing Requests
                </h2>
                {outgoingRequests.length === 0 ? (
                  <p className="text-neutral-600 text-sm py-4 bg-black/20 rounded-xl px-4">No pending outgoing requests.</p>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map(req => (
                      <div key={req.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between opacity-70">
                        <div className="flex items-center gap-4">
                          <img src={req.photoURL} alt={req.name} className="w-10 h-10 rounded-full object-cover grayscale" />
                          <div>
                            <h3 className="font-bold text-neutral-300">{req.name}</h3>
                            <p className="text-xs text-neutral-500">{req.email}</p>
                          </div>
                        </div>
                        <button onClick={() => handleRejectOrCancel(req.id, "cancel")} className="text-xs text-neutral-400 hover:text-red-400 underline transition-colors px-2">
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADD FRIEND TAB */}
          {activeTab === "add" && (
            <div className="max-w-xl mx-auto py-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-500/30">
                  <FaSearch className="text-2xl text-violet-400" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-200">Find a Friend</h2>
                <p className="text-neutral-400 mt-2 text-sm">Enter their exact email address to send a request. They must have a NoSock account.</p>
              </div>

              <form onSubmit={handleSearchAndAdd} className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="friend@example.com" 
                  className="flex-1 rounded-xl bg-black/40 border border-white/10 px-5 py-4 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-white placeholder-neutral-600 transition-all font-medium"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isSearching || !searchEmail.trim()}
                  className={`px-8 py-4 rounded-xl font-bold text-white transition-all whitespace-nowrap ${
                    isSearching || !searchEmail.trim()
                      ? "bg-neutral-700 cursor-not-allowed opacity-50"
                      : "bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                  }`}
                >
                  {isSearching ? "Searching..." : "Send Request"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
