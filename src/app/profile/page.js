'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/context/FirebaseProvider';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useUser } from '@/context/UserContext';
import Image from "next/image";

const avatarStyles = ['thumbs', 'adventurer', 'avataaars', 'fun-emoji', 'bottts'];

export default function ProfilePage() {
  const { auth, db } = useFirebase();
  const router = useRouter();
  const [localUser, setLocalUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [avatarStyle, setAvatarStyle] = useState('thumbs');

  const { user: globalUser, setUser: setGlobalUser } = useUser();

  useEffect(() => {
    if (!auth || !db) return;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        toast.error('Please sign in to access your profile');
        router.push('/auth/login');
      } else {
        setLocalUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setPhotoURL(currentUser.photoURL || '');

        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setAvatarStyle(data.avatarStyle || 'thumbs');
          setPhotoURL(''); // sync Firestore photoURL
        }

        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleUpdateProfile = async () => {
    try {
      if (!displayName.trim()) {
        toast.error('Username cannot be empty');
        return;
      }

      if (photoURL && !/^https?:\/\/(i\.)?imgur\.com\//i.test(photoURL)) {
        toast.error('Only Imgur links are supported for custom avatars.');
        return;
      }

      const currentUid = auth.currentUser.uid;
      const oldUsername = auth.currentUser.displayName;

      // Check for username conflict
      const usernameDoc = await getDoc(doc(db, 'usernames', displayName));
      if (usernameDoc.exists() && usernameDoc.data().uid !== currentUid) {
        toast.error('Username is already taken');
        return;
      }

      // Update username registry
      if (oldUsername && oldUsername !== displayName) {
        await deleteDoc(doc(db, 'usernames', oldUsername));
      }
      await setDoc(doc(db, 'usernames', displayName), { uid: currentUid });

      // Save avatar style and photoURL to Firestore
      await setDoc(
        doc(db, 'users', currentUid),
        {
          avatarStyle,
          photoURL,
        },
        { merge: true }
      );

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName,
        photoURL: `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${displayName}`,
      });

      // Update global context
      setGlobalUser((prev) => ({
        ...prev,
        displayName,
        photoURL: `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${displayName}`,
        avatarStyle,
      }));

      toast.success('Profile updated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    }
  };

  const logout = async () => {
    await auth.signOut();
    router.push('/');
  };

  if (loading) return <p className="text-center mt-20">Loading profile...</p>;

  return (
    <div className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md glass-panel p-8 md:p-10 rounded-3xl shadow-2xl flex flex-col">
        <h2 className="text-2xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 text-center drop-shadow-md">
          {displayName ? `Hello, ${displayName}!` : 'Your Profile'}
        </h2>

        <div className="relative mx-auto mb-6">
          <Image
            src={
              photoURL ||
              `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${displayName || 'guest'}`
            }
            alt="avatar"
            className="w-32 h-32 rounded-full object-cover ring-4 ring-violet-500/30 p-1"
            width={128} 
            height={128}
          />
        </div>

        <p className="text-center text-neutral-400 text-sm mb-6 font-medium">
          {localUser?.email}
        </p>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 text-left">Username</label>
            <input
              type="text"
              placeholder="Username"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          <div>
             <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 text-left">Custom Photo URL (Imgur Only)</label>
            <input
              type="text"
              placeholder="https://i.imgur.com/..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          <div>
             <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 text-left">Avatar Style</label>
            <select
               value={avatarStyle}
               onChange={(e) => setAvatarStyle(e.target.value)}
               className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all appearance-none cursor-pointer"
            >
              {avatarStyles.map((style) => (
                <option key={style} value={style} className="bg-neutral-900">
                  {style}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleUpdateProfile}
            className="w-full py-4 text-sm font-bold bg-violet-600 text-white rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] hover:bg-violet-500 transition-all active:scale-[0.98]"
          >
            Save Changes
          </button>

          <button
            onClick={logout}
            className="w-full py-4 text-sm font-bold bg-red-500/10 text-red-500 hover:text-white rounded-xl border border-red-500/20 hover:bg-red-500 transition-all active:scale-[0.98]"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
