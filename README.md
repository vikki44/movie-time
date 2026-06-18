# Watch with Pookie 🩷🍿

A private, aesthetic, romantic, and extremely cute screen-sharing website designed specifically for two best friends or partners to host private movie nights together.

Built with:
- **Frontend:** React (Vite), Framer Motion, Vanilla CSS (Glassmorphism design, custom animations)
- **Backend:** Node.js, Express, Socket.IO (Signaling & communication)
- **Database:** MongoDB (using Mongoose) with automated local JSON file storage (`db.json`) fallback, ensuring immediate operation out of the box.

---

## 🌟 Key Features

1. **Password Authentication Screen:** A cozy diary-style login. Entering the wrong code shakes the screen; entering the correct code (`pookie123`) unlocks the room.
2. **Cute Welcome Screen:** Shows randomized love/friendship quotes, prompts for your nickname, and lets you select whether you are the **Host (Screen Share)** or **Viewer (Watch)**.
3. **WebRTC Stream Area:** Host shares their screen (including system audio). Viewer watches with ultra-low latency. Shows a real-time connection latency and quality indicator.
4. **Pookie Chat Panel:** Features a customized message list, a quick emoji/kaomoji bar, and real-time typing notifications ("Pookie is typing... 🎀").
5. **Interactive Actions:** Five buttons (Popcorn 🍿, Love 💕, Hug 🤗, Bonk 🔨, Wake Up 😴) trigger full-screen animations for both players simultaneously!
6. **Mobile Friendly:** Fully responsive layout. On mobile, the chat transforms into a sleek, slide-up bottom sheet so you can chat while watching on your phone.

---

## 🚀 Quick Start (Local Run)

Currently, the server and client are **already running** in the background of your workspace! You can test them immediately by opening:
👉 **[http://localhost:5173](http://localhost:5173)**

*Default secret passcode:* **`pookie123`**

### Starting Manually

If you need to start them manually in the future, open two terminals:

#### Terminal 1 (Backend Server)
```powershell
cd server
npm install
npm run start
```
*Runs on `http://localhost:3001`.*

#### Terminal 2 (Frontend Client)
```powershell
cd client
npm install
npm run dev
```
*Runs on `http://localhost:5173`.*

---

## 💡 Tips for the Perfect Movie Night

- **Sharing Audio:** As the Host, when you start the screen share, choose **Tab Sharing** (or Window/Screen depending on OS) and make sure to check the **"Share system audio"** checkbox in the browser prompt.
- **Adjusting Volume:** As the Viewer, use the custom volume slider directly below the video player to boost/adjust the audio level.
- **Entering as two users:** Open `http://localhost:5173` in a normal tab and a separate Incognito tab (or share the link with your friend on the same local network) to test both the Host and Viewer perspectives at once!
