"use client";

import Cropper from "react-easy-crop";
import { useState, useCallback } from "react";
import getCroppedImg from "@/utils/cropImage";
import { useFirebase } from "@/context/FirebaseProvider";
import { doc, updateDoc } from "firebase/firestore";
import { useUser } from "@/context/UserContext";
import toast from "react-hot-toast";

export default function ImageCropModal({ imageUrl, onClose, onCropDone }) {
  const { db } = useFirebase();
  const { user } = useUser();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCrop = async () => {
    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
      const userRef = doc(db, "users", user.uid);

      await updateDoc(userRef, {
        photoURL: croppedImage, // base64 string
      });

      onCropDone(croppedImage);
      toast.success("Profile picture updated!");
      onClose();
    } catch (err) {
      console.error("Crop error:", err);
      toast.error("Failed to crop image");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-white mb-4 text-center">Crop Profile Picture</h3>
        <div className="relative w-full aspect-square bg-black/50 rounded-2xl overflow-hidden border border-white/5 mb-6">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{ containerStyle: { borderRadius: '1rem' } }}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleCrop} 
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all font-bold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}