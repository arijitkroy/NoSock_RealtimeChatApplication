# NoSock

NoSock is a modern, real-time communication platform that blends secure public and private chatrooms with an advanced AI chat interface. Built on Next.js and Firebase, NoSock features a premium glassmorphism design and provides users with a seamless, responsive experience across all devices. It is fully installable as a Progressive Web App.

## Features

* **Real-Time Communication:** Instant messaging across public lobbies and secure, invite-only chatrooms powered by Firebase Firestore.
* **Ollama Cloud AI Integration:** A dedicated AI chat interface utilizing the Ollama SDK. Features real-time response streaming, code syntax highlighting, and complex mathematical rendering (LaTeX).
* **Typing Indicators:** Real-time display of which users are currently typing in a chatroom, with smart labeling for multiple simultaneous typers.
* **Online Presence Tracking:** Live member sidebar showing who is currently online or offline in each chatroom, with Google profile picture support.
* **Browser Push Notifications:** Native desktop notifications for incoming messages when the chat tab is not focused.
* **Conversation Sharing:** Generate expiring share links (1, 3, or 7 days) for AI conversations. Expired links are automatically purged from the database.
* **Usage Limits and Tracking:** Built-in safeguards including a daily free-tier message limit for AI interactions, preparing the platform for future premium tiers.
* **Modern Authentication:** Secure Google Sign-In and traditional Email/Password authentication seamlessly integrated via Firebase Auth.
* **Dynamic Customization:** Automatic avatar generation using the DiceBear API, custom Imgur-hosted profile photos, and an intuitive profile management system including an image cropping modal.
* **Room Management:** Gear-based settings menu with contextual Leave Room and Delete Room (creator-only) actions directly within the chatroom header.
* **Installable PWA:** Full Progressive Web App support with service worker caching, a web app manifest, and home screen installation capability.
* **Premium UI/UX:** A highly polished, dark-themed glassmorphism aesthetic with a unified violet/indigo color system, micro-animations, and responsive layouts using Tailwind CSS.

## Technology Stack

* **Framework:** Next.js 15 (App Router), React 19
* **Styling:** Tailwind CSS 4, React Icons
* **Backend as a Service:** Firebase (Firestore, Authentication)
* **AI Integration:** Ollama Node SDK
* **Content Rendering:** React Markdown, Remark GFM, KaTeX, Highlight.js
* **Date and Time:** Date-fns
* **PWA:** Service Worker, Web App Manifest

## Prerequisites

Before running the application locally, ensure you have the following installed:
* Node.js (v18 or higher recommended)
* npm or yarn
* A Firebase Project with Firestore and Authentication (Google and Email/Password providers) enabled
* An Ollama API Key (if utilizing the Cloud AI features)

## Environment Variables

Create a `.env.local` file in the root directory and add the following configuration variables. Ensure you replace the placeholder values with your actual project credentials. 

Note: To maintain security compliance, Firebase Client configuration variables are hydrated serverside rather than exposing them via `NEXT_PUBLIC_` prefixes.

```env
FIREBASE_API_KEY="your_firebase_api_key"
FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
FIREBASE_PROJECT_ID="your_firebase_project_id"
FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
FIREBASE_APP_ID="your_firebase_app_id"
OLLAMA_API_KEY="your_ollama_api_key"
```

## Installation and Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nosock.git
   cd nosock
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost:3000`.

## Architecture Overview

* **Authentication Context:** Managed globally through `UserContext` and `FirebaseProvider`, acting as a route guard to prevent unauthenticated access to protected areas like `/chat` and `/ollama`.
* **Streaming API:** The `/api/ollama` endpoint functions as a secure server-side proxy, establishing a `ReadableStream` connection to Ollama and piping chunked data directly to the client UI to prevent long load stalls.
* **Presence System:** Member online/offline status and typing indicators are managed via boolean flags (`isOnline`, `isTyping`) on the `chatrooms/{roomId}/members/{uid}` subcollection, updated in real-time with Firestore `onSnapshot` listeners.
* **Push Notifications:** The browser Notification API requests permission on chatroom entry and fires desktop notifications for incoming messages from other users when the tab is not focused, with initial-load skipping to prevent notification floods.
* **Smart Room Lobby:** The Create/Join button is disabled while a background Firestore lookup determines whether the input matches an existing room ID. A synchronous re-check runs inside the action handler to eliminate race conditions from fast paste operations.
* **Service Worker:** A network-first caching strategy serves fresh content when online and falls back to cached responses when offline, with automatic cleanup of stale cache versions.
* **Firestore Data Model:** 
  * `users/{uid}`: Stores profile metadata, avatar preferences, and daily AI message limits.
  * `chatrooms/{roomId}`: Tracks active room metadata and creator identity. Sub-collections for enrolled members (with presence and typing state) and real-time message feeds.
  * `users/{uid}/ollamaMessages`: Persists AI conversational history securely per user.
  * `sharedChats/{shareId}`: Stores shared conversation snapshots with expiration timestamps for automatic purging.

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
