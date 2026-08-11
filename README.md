# gps-spoofing-app-github

# 🛰️ GPS Guard: Detection & Prevention of Fake GPS and Location Spoofing
[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Accuracy](https://img.shields.io/badge/Model_Accuracy-93.08%25-brightgreen?style=flat-square)](https://github.com/)
[![F1-Score](https://img.shields.io/badge/Macro_F1_Score-0.8769-brightgreen?style=flat-square)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
> A real-time Machine Learning cybersecurity firewall and early-warning telemetry defense system designed to detect, classify, and quarantine GPS spoofing and location manipulation attacks in under **2 milliseconds**.
---
## 📌 Table of Contents
- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Attack Classification & Threat Levels](#-attack-classification--threat-levels)
- [Evaluated Telemetry Parameters](#-evaluated-telemetry-parameters)
- [Model Performance & Benchmarks](#-model-performance--benchmarks)
- [REST API Reference](#-rest-api-reference)
- [Local Installation & Setup](#-local-installation--setup)
- [Deployment Guide (Render & Vercel)](#-deployment-guide)
- [Tech Stack](#-tech-stack)
---
## 🎯 Project Overview
Location Spoofing and Fake GPS attacks pose critical risks to autonomous aerial vehicles (UAVs/Drones), maritime navigation, autonomous cars, and mobile location services. Attackers utilize ground-based **Software Defined Radios (SDRs)** (e.g., HackRF One, LimeSDR) to transmit counterfeit satellite signals at higher power levels, misleading GPS receivers into computing a false position fix.
**GPS Guard** solves this vulnerability by analyzing **14 low-level physical signal parameters** (including Correlator Peak Asymmetry, Doppler Offsets, and Carrier-to-Noise Density). When an anomalous signal is detected:
1. The corrupted satellite channel is immediately **quarantined and dropped**.
2. The navigation filter switches the autopilot fix to internal **Inertial Measurement Unit (IMU)** sensors.
3. The genuine position fix remains protected without interruption.
---
## 🏗️ System Architecture
```text
┌─────────────────────────────────────────────────────────────┐
│                 LIVE CLIENT FRONTEND (Next.js)               │
│  • Single Signal Telemetry  • Live Device Defense Map       │
│  • Universal Excel/CSV Lab  • Real-Time Stream Console      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Native HTTP fetch / JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 SERVERLESS REST API LAYER                    │
│  • /api/predict       • /api/live-stream                    │
│  • /api/batch-predict • /api/metrics                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Feature Extraction & Normalization)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          PURE TYPESCRIPT RANDOM FOREST ML ENGINE            │
│         (100 Decision Trees | Sub-2ms Latency)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼ (Classification & Anomaly Breakdown)
┌─────────────────────────────────────────────────────────────┐
│                 AUTOPILOT ACTION DISPATCHER                 │
│  • [AUTHENTIC]: Accepted into Position Fix Filter           │
│  • [SPOOFED]  : Quarantined & Dropped -> Fallback to IMU    │
└─────────────────────────────────────────────────────────────┘
✨ Key Features
⚡ Sub-2ms Pure TypeScript ML Inference: High-speed, zero-dependency Random Forest engine running serverless on Node.js without heavy Python or C++ runtime requirements.
📡 4 Built-In REST API Endpoints: Full API suite for real-time telemetry streaming, single-signal classification, bulk dataset evaluation, and model benchmark extraction.
🗺️ Live Device Geolocation & Defense Map: Integrates navigator.geolocation and OpenStreetMap to dynamically plot real device coordinates alongside intercepted spoofed offset locations.
📊 Universal Dataset Parser: Upload and evaluate up to 2,000 rows across Excel (.xlsx, .xls, .xlsb), CSV, TSV, JSON, and TXT files with auto-normalization.
☰ Modern Hamburger Navigation: Sleek side-drawer interface with 0 emojis, Lucide vector icons, and Dark/Light/System theme toggles.
🔄 Dynamic Telemetry Generator: Generates dynamic real-time satellite telemetry derived from live hardware GPS coordinates and system timestamps.
🏷️ Attack Classification & Threat Levels
Class	Attack Category	Physical Signal Characteristics	Mitigation Action
0	Legitimate	Natural 
C
/
N
0
C/N 
0
​
  (42–49 dB-Hz), symmetric early/late correlator peaks (
E
C
≈
L
C
EC≈LC).	🟢 Accepted in navigation fix
1	Simplistic	High power injection (
C
/
N
0
>
52
C/N 
0
​
 >52 dB-Hz), massive Doppler offset (>3000 Hz).	🟡 Channel Quarantined
2	Intermediate	Correlator distortion (
E
C
≫
L
C
EC≫LC), subtle phase manipulation with matched PRN.	🟠 Quarantined -> IMU Fallback
3	Sophisticated	Matched power & Doppler, subtle peak distortion, gradual trajectory pull-off.	🔴 Emergency IMU Lockout
🔬 Evaluated Telemetry Parameters
The model evaluates 14 low-level physical telemetry features:

C
/
N
0
C/N 
0
​
  (Carrier-to-Noise Ratio): Measured in dB-Hz; detects unnatural signal amplification.
Doppler Offset (
D
O
DO): Frequency shift in Hz caused by satellite-receiver relative velocity.
Early Correlator (
E
C
EC): Energy detected before the prompt code tracking point.
Prompt Correlator (
P
C
PC): Energy detected at the prompt code tracking point.
Late Correlator (
L
C
LC): Energy detected after the prompt code tracking point.
Time Of Week (
T
O
W
TOW): GPS epoch timestamp in seconds.
Carrier Phase (
C
P
CP): Cumulative carrier cycle counts.
Pseudo-Range (
P
D
PD): Measured signal transit distance (meters).
Satellite PRN ID: Identifier (1–32) for constellation health mapping.
Correlator Asymmetry Ratio: 
∣
E
C
−
L
C
∣
P
C
PC
∣EC−LC∣
​
  metric for multipath vs. spoofing discrimination.
📈 Model Performance & Benchmarks
Metric	Score / Value	Evaluation Details
Test Accuracy	93.08%	Evaluated on held-out test split
Macro F1-Score	0.8769	Balanced performance across all 4 classes
Macro Precision	0.8842	Ultra-low false alarm rate
Inference Latency	< 2.0 ms	Real-time classification speed
Architecture	100 Decision Trees	Bootstrap aggregated Random Forest
📡 REST API Reference
1. Single Telemetry Classification
Endpoint: POST /api/predict
Payload:
json


{
  "CN0": 46.8,
  "DO": 982,
  "PRN": 16,
  "EC": 119093,
  "PC": 133146,
  "LC": 115553,
  "TOW": 174192,
  "CP": -89630,
  "PD": 23343991
}
Response:
json


{
  "status": "success",
  "predictedClassId": 2,
  "classification": "Intermediate",
  "isSpoofed": true,
  "confidence": 0.941,
  "riskLevel": "HIGH",
  "anomalousFeatures": ["Correlator Asymmetry Detected (EC != LC)"]
}
2. Live Telemetry Stream
Endpoint: GET /api/live-stream
Description: Returns live dynamic satellite telemetry with real-time classification.
3. Universal Batch Dataset Scoring
Endpoint: POST /api/batch-predict
Description: Accepts array of up to 2,000 records from Excel/CSV files and returns overall attack rate and breakdown.
4. Model Benchmarks
Endpoint: GET /api/metrics
Description: Delivers test accuracy, macro F1-score, precision, and the 4x4 Confusion Matrix.
💻 Local Installation & Setup
Prerequisites
Node.js: v18.18.0 or v20+
npm or yarn / pnpm
Step-by-Step
bash


# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/gps-spoofing-app-github.git
# 2. Navigate to project directory
cd gps-spoofing-app-github
# 3. Install dependencies
npm install
# 4. Start the development server
npm run dev
Open http://localhost:3000 in your browser!

🚀 Deployment Guide
Deploying to Render.com
Create a new Web Service on dashboard.render.com.
Connect your GitHub repository.
Configure service parameters:
Environment: Node
Build Command: npm install && npm run build
Start Command: npm start
Click Create Web Service.
Deploying to Vercel
Import repository into vercel.com.
Vercel automatically detects Next.js.
Click Deploy (1-Click Deployment with zero configuration required).
🛠️ Tech Stack
Framework: Next.js 16 (App Router)
UI Library: React 19
Styling: Tailwind CSS v4
Icons: Lucide React
Spreadsheet Parsing: SheetJS (xlsx)
Mapping: OpenStreetMap Embed
Hosting: Render / Vercel
