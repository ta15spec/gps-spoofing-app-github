# 🛰️ GPS Guard & Spoofing Detector

## Detection and Prevention of Fake GPS and Location Spoofing using Machine Learning

This repository contains a full-stack Next.js web application and Pure TypeScript Machine Learning Engine for real-time detection and prevention of fake GPS signals and location spoofing attacks.

---

### 🚀 How to Deploy on Render.com:

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of GPS Spoofing Detection system"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com).
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - Set Build Command: `npm install && npm run build`
   - Set Start Command: `npm start`
   - Click **Create Web Service**!

---

### ⚡ Features Included:
- **Pure TypeScript ML Engine**: Sub-2ms inference, zero Python/native C++ binary requirements.
- **4 Built-In REST APIs**: `/api/live-stream`, `/api/predict`, `/api/batch-predict`, `/api/metrics`.
- **Live Device Geolocation Map**: Real-time position tracking (`navigator.geolocation`) on OpenStreetMap.
- **Universal File Parser**: Excel (`.xlsx`, `.xls`), CSV, TSV, JSON, and TXT scoring up to 2,000 rows.
- **Theme Switcher**: Dark, Light, and System Mode.
- **Hamburger Navigation Menu**: Clean side drawer interface with zero emojis.
