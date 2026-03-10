// src/app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Toast from "../components/Toast";
import Navbar from "../components/Navbar";
import { UserProvider } from "@/context/UserContext";
import { FirebaseProvider } from "@/context/FirebaseProvider";
import Script from "next/script";
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NoSock",
  description: "Chat in real-time or talk to Ollama Cloud AI",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NoSock",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({ children }) {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  };

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-50 min-h-screen selection:bg-violet-500/30`}
      >
        <FirebaseProvider config={firebaseConfig}>
          <UserProvider>
            <Navbar />
            {children}
            <Toast />
          </UserProvider>
        </FirebaseProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}