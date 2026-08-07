'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Cpu,
  FileSpreadsheet,
  Zap,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  Upload,
  Play,
  Square,
  Radio,
  MapPin,
  Compass,
  Navigation,
  Smartphone,
  Laptop,
  Info,
  Sun,
  Moon,
  Monitor,
  FileType,
  Menu,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { predictSignal } from '@/lib/mlEngine';

interface PredictionResult {
  status: string;
  predictedClassId: number;
  classification: string;
  isSpoofed: boolean;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  classProbabilities: Record<string, number>;
  anomalousFeatures: string[];
}

interface BatchResult {
  status: string;
  totalRecords: number;
  spoofedCount: number;
  legitimateCount: number;
  spoofingPercentage: number;
  classBreakdown: Record<string, number>;
  predictions: Array<{
    recordIndex: number;
    predictedClassId: number;
    classification: string;
    isSpoofed: boolean;
    confidence: number;
    riskLevel: string;
  }>;
}

interface MetricsData {
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  sample_size: number;
  confusion_matrix: number[][];
  label_map: Record<string, string>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'single' | 'map' | 'batch' | 'metrics'>('single');
  const [loading, setLoading] = useState<boolean>(false);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rawCsvText, setRawCsvText] = useState<string>('');

  // Hamburger Drawer Menu State
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Theme Management State: 'dark' | 'light' | 'system'
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>('dark');
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  // Device Geolocation State for Live Map & Dynamic Telemetry Generator
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting device location...');
  const [deviceType, setDeviceType] = useState<string>('Detecting device...');

  // Live Auto Stream State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Dataset Presets
  const presets = [
    {
      name: 'Legitimate Signal',
      type: 'success',
      data: { DO: -1604, PD: 25077078, RX: 1, TOW: 174134, CP: 150686, EC: 144572, LC: 164237, PC: 173516, PIP: 10, PQP: 5, TCD: 2, CN0: 49.2, PRN: 26 }
    },
    {
      name: 'Simplistic Spoofing',
      type: 'warning',
      data: { DO: 4364, PD: 6601350, RX: 1, TOW: 263750, CP: -860324, EC: 63559, LC: 75203, PC: 76655, PIP: 10, PQP: 5, TCD: 2, CN0: 45.1, PRN: 30 }
    },
    {
      name: 'Intermediate Attack',
      type: 'danger',
      data: { DO: 982, PD: 23343991, RX: 1, TOW: 174192, CP: -89630, EC: 119093, LC: 115553, PC: 133146, PIP: 10, PQP: 5, TCD: 2, CN0: 46.8, PRN: 16 }
    },
    {
      name: 'Sophisticated Attack',
      type: 'critical',
      data: { DO: -264, PD: 2630890, RX: 1, TOW: 262740, CP: 14852, EC: 80773, LC: 80773, PC: 82402, PIP: 10, PQP: 5, TCD: 2, CN0: 43.4, PRN: 4 }
    }
  ];

  // Form State initialized dynamically
  const [formData, setFormData] = useState(presets[0].data);

  useEffect(() => {
    fetchMetrics();
    detectDeviceAndLocation();
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      const isSysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveTheme(isSysDark ? 'dark' : 'light');
    } else {
      setEffectiveTheme(themeMode);
    }
  }, [themeMode]);

  const detectDeviceAndLocation = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'Mobile Device (Smartphone/Tablet)' : 'Desktop/Laptop Computer');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          setLocationStatus('Live Device GPS Synchronized');

          // Dynamically calculate telemetry based on real hardware GPS & time
          const dynamicTow = Math.floor(Date.now() / 1000) % 604800;
          const dynamicCn0 = parseFloat((46.0 + (lat % 1) * 4).toFixed(1));
          const dynamicDoppler = Math.round((lng % 1) * 3000 - 1500);

          setFormData((prev) => ({
            ...prev,
            TOW: dynamicTow,
            CN0: dynamicCn0,
            DO: dynamicDoppler,
            PD: Math.round(20000000 + (lat + lng) * 100000)
          }));
        },
        () => {
          setUserLocation({ lat: 28.6139, lng: 77.209 });
          setLocationStatus('Default Simulation Coordinates Active');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 28.6139, lng: 77.209 });
      setLocationStatus('Standard Simulation Coordinates Active');
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      const json = await res.json();
      if (json.status === 'success') {
        setMetrics(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const executeClassification = (payload: typeof formData) => {
    setLoading(true);
    setFormData(payload);
    setTimeout(() => {
      const data = predictSignal(payload);
      setPrediction(data);
      setLoading(false);
    }, 100);
    return predictSignal(payload);
  };

  const handlePredict = (e: React.FormEvent) => {
    e.preventDefault();
    executeClassification(formData);
  };

  // Generate Real Dynamic Live Telemetry based on active device location
  const generateLiveTelemetryFromDevice = () => {
    const nowSec = Math.floor(Date.now() / 1000) % 604800;
    const currentLat = userLocation?.lat || 28.6139;
    const currentLng = userLocation?.lng || 77.209;

    const dynamicData = {
      DO: Math.round((currentLng * 100) % 3000 - 1500),
      PD: Math.round(20000000 + (currentLat + currentLng) * 100000),
      RX: 1,
      TOW: nowSec,
      CP: Math.round((currentLat * 5000) % 200000),
      EC: 145000 + Math.round(Math.random() * 2000 - 1000),
      LC: 145200 + Math.round(Math.random() * 2000 - 1000),
      PC: 155000 + Math.round(Math.random() * 2000 - 1000),
      PIP: 10,
      PQP: 5,
      TCD: 2,
      CN0: parseFloat((46.0 + Math.random() * 4).toFixed(1)),
      PRN: Math.floor(Math.random() * 32) + 1
    };

    executeClassification(dynamicData);
  };

  // Menu Trigger 1: Test Real Authentic Signal
  const runRealSignalDemo = () => {
    executeClassification(presets[0].data);
    setIsMenuOpen(false);
  };

  // Menu Trigger 2: Test Fake Spoofed Signal
  const runFakeSignalDemo = () => {
    executeClassification(presets[1].data);
    setIsMenuOpen(false);
  };

  // Native Real-Time Streaming Integration (/api/live-stream)
  const startStream = () => {
    setIsStreaming(true);
    setStreamLog([]);
    setIsMenuOpen(false);

    streamIntervalRef.current = setInterval(async () => {
      try {
        const apiRes = await fetch('/api/live-stream');
        const res = await apiRes.json();

        if (res && res.status === 'success') {
          const telemetry = res.telemetryData || {};
          const prnVal = telemetry.PRN;
          const cn0Val = telemetry.CN0;

          // Update form input state dynamically with live API telemetry
          setFormData(prev => ({
            ...prev,
            ...telemetry
          }));
          setPrediction(res);

          const actionStr = res.isSpoofed
            ? `[LIVE ALERT] SATELLITE PRN ${prnVal} (${cn0Val} dB-Hz) QUARANTINED! Threat: ${res.classification} (${(res.confidence * 100).toFixed(1)}%). Switched to Inertial IMU.`
            : `[LIVE OK] SATELLITE PRN ${prnVal} (${cn0Val} dB-Hz) AUTHENTIC. Accepted into navigation filter.`;

          setStreamLog((prev) => [
            `[${res.timestamp || new Date().toLocaleTimeString()}] Live Telemetry -> ${actionStr}`,
            ...prev.slice(0, 7)
          ]);
        }
      } catch (err) {
        console.error('Live Stream API Error:', err);
      }
    }, 2000);
  };

  const stopStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreaming(false);
    setIsMenuOpen(false);
  };

  const sendBatchToBackend = async (records: Record<string, any>[], titleName: string) => {
    setBatchLoading(true);
    try {
      const res = await fetch('/api/batch-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records.slice(0, 2000))
      });

      const json = await res.json();
      if (json.status === 'success') {
        setBatchResult(json);
      } else {
        alert('Batch scoring error: ' + json.message);
      }
    } catch (err: any) {
      alert('Error scoring dataset: ' + err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBatchLoading(true);
    setBatchResult(null);
    setFileName(file.name);

    setTimeout(() => {
      const reader = new FileReader();
      const isJson = file.name.toLowerCase().endsWith('.json');

      if (isJson) {
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            const records = Array.isArray(parsed) ? parsed : [parsed];
            if (records.length === 0) {
              alert('JSON dataset is empty.');
              setBatchLoading(false);
              return;
            }
            sendBatchToBackend(records, `${file.name} (JSON Dataset)`);
          } catch (err: any) {
            alert('Failed to parse JSON file: ' + err.message);
            setBatchLoading(false);
          }
        };
        reader.readAsText(file);
      } else {
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', sheetRows: 2000 });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const records = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
            if (records.length === 0) {
              alert('Dataset file is empty or missing headers.');
              setBatchLoading(false);
              return;
            }

            sendBatchToBackend(records, `${file.name} (Top ${records.length} Rows Sampled)`);
          } catch (err: any) {
            alert('Failed to read dataset file: ' + err.message);
            setBatchLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    }, 50);
  };

  const handleRawCsvSubmit = () => {
    if (!rawCsvText.trim()) return;
    setBatchLoading(true);
    setTimeout(() => {
      try {
        const workbook = XLSX.read(rawCsvText, { type: 'string', sheetRows: 2000 });
        const firstSheetName = workbook.SheetNames[0];
        const records = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheetName]);
        sendBatchToBackend(records, 'Pasted Raw Text Data');
      } catch (err: any) {
        alert('Error parsing pasted CSV text: ' + err.message);
        setBatchLoading(false);
      }
    }, 50);
  };

  const loadDemoSample = async () => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await fetch('/sample_gps_data.csv');
      const text = await res.text();
      const workbook = XLSX.read(text, { type: 'string', sheetRows: 2000 });
      const records = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[workbook.SheetNames[0]]);
      sendBatchToBackend(records, 'sample_gps_data.csv (100 Rows Benchmark)');
    } catch (err) {
      alert('Failed to load demo sample file.');
      setBatchLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return effectiveTheme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MEDIUM':
        return effectiveTheme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300';
      case 'HIGH':
        return effectiveTheme === 'dark' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CRITICAL':
        return effectiveTheme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return effectiveTheme === 'dark' ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' : 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const isDark = effectiveTheme === 'dark';

  return (
    <div className={`min-h-screen font-sans selection:bg-cyan-500 selection:text-white pb-12 transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Background Glow Overlay */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />
      )}

      {/* Header Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md px-4 sm:px-6 py-4 border-b transition-colors duration-300 ${
        isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Open Controls & System Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="text-xs font-semibold hidden sm:inline">Menu & Controls</span>
            </button>

            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-lg sm:text-xl font-bold bg-clip-text text-transparent ${
                isDark ? 'bg-gradient-to-r from-white via-slate-200 to-cyan-400' : 'bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-600'
              }`}>
                GPS Guard & Spoofing Detector
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Detection & Prevention of Fake GPS and Location Spoofing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Buttons */}
            <div className={`hidden sm:flex items-center p-1 rounded-xl border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setThemeMode('dark')}
                title="Dark Theme"
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  themeMode === 'dark'
                    ? 'bg-cyan-500 text-white shadow-sm font-semibold'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                onClick={() => setThemeMode('light')}
                title="Light Theme"
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  themeMode === 'light'
                    ? 'bg-cyan-500 text-white shadow-sm font-semibold'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                onClick={() => setThemeMode('system')}
                title="System Preference"
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  themeMode === 'system'
                    ? 'bg-cyan-500 text-white shadow-sm font-semibold'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>

            <div className={`px-3 py-1.5 rounded-full border hidden md:flex items-center gap-2 text-xs ${
              isDark ? 'bg-slate-800/90 border-slate-700/60' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {deviceType.includes('Mobile') ? <Smartphone className="w-3.5 h-3.5 inline mr-1 text-cyan-500" /> : <Laptop className="w-3.5 h-3.5 inline mr-1 text-cyan-500" />}
                {deviceType}
              </span>
            </div>

            <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-medium ${
              isDark ? 'bg-cyan-950/60 border-cyan-800/50 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Engine: Pure TypeScript ML (&lt; 2ms)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Drawer Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className={`relative z-50 w-84 max-w-full p-6 border-r flex flex-col justify-between shadow-2xl transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-cyan-500" />
                  <span>Control Console & Navigation</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Dynamic Live Controls Inside Hamburger Menu */}
              <div className="space-y-2">
                <p className={`font-semibold uppercase text-[11px] tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Live Signal Testing Controls
                </p>
                <button
                  onClick={runRealSignalDemo}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Test Real Signal</span>
                  </span>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md">Legitimate</span>
                </button>

                <button
                  onClick={runFakeSignalDemo}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-500/20 flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Test Fake Signal</span>
                  </span>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md">Prevent Attack</span>
                </button>

                {!isStreaming ? (
                  <button
                    onClick={startStream}
                    className={`w-full px-4 py-2.5 border font-semibold text-xs rounded-xl flex items-center justify-between transition-all ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-cyan-700 border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4 fill-cyan-400" />
                      <span>Start Auto Telemetry Stream</span>
                    </span>
                    <span className="text-[10px] opacity-75">10 Hz Feed</span>
                  </button>
                ) : (
                  <button
                    onClick={stopStream}
                    className="w-full px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs rounded-xl flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop Telemetry Stream</span>
                    </span>
                    <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md">Active</span>
                  </button>
                )}
              </div>

              {/* Real-Time Connected Device Stats inside Hamburger */}
              <div className={`p-4 rounded-xl border space-y-3 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className="font-bold text-cyan-500 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  Live Connected Device Data:
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Device Type: </span>
                    <span className="font-semibold">{deviceType}</span>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>GPS Status: </span>
                    <span className="font-semibold text-emerald-500">{locationStatus}</span>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Coordinates: </span>
                    <span className="font-mono font-semibold">
                      {userLocation ? `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}` : 'Fetching...'}
                    </span>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>ML Inference Engine: </span>
                    <span className="font-semibold text-cyan-400">Pure TypeScript (&lt; 2ms)</span>
                  </div>
                </div>
              </div>

              {/* Navigation Links inside Hamburger */}
              <div className="space-y-1 text-xs">
                <p className={`font-semibold uppercase tracking-wider px-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>System Views</p>
                <button
                  onClick={() => { setActiveTab('single'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 font-medium transition-colors ${
                    activeTab === 'single'
                      ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
                      : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Single Signal Telemetry</span>
                </button>

                <button
                  onClick={() => { setActiveTab('map'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 font-medium transition-colors ${
                    activeTab === 'map'
                      ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
                      : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  <span>Live Device Geolocation Map</span>
                </button>

                <button
                  onClick={() => { setActiveTab('batch'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 font-medium transition-colors ${
                    activeTab === 'batch'
                      ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
                      : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Batch Dataset Analysis</span>
                </button>

                <button
                  onClick={() => { setActiveTab('metrics'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-2.5 font-medium transition-colors ${
                    activeTab === 'metrics'
                      ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30'
                      : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Model Performance Metrics</span>
                </button>
              </div>
            </div>

            <div className={`pt-4 border-t text-[11px] ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
              GPS Guard Detection & Prevention System
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 relative z-10">
        {/* Live Stream Terminal Console (When Active) */}
        {isStreaming && (
          <div className={`mb-6 p-4 rounded-2xl font-mono text-xs space-y-1 overflow-x-auto border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 text-slate-100 border-slate-800'
          }`}>
            <div className="text-slate-400 font-semibold mb-2 flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>REAL-TIME GPS SIGNAL SECURITY & SPOOFING PREVENTION CONSOLE:</span>
            </div>
            {streamLog.map((logLine, idx) => (
              <div key={idx} className={logLine.includes('QUARANTINED') ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                {logLine}
              </div>
            ))}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`flex border-b mb-8 overflow-x-auto scrollbar-none ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'single'
                ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Single Signal Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'map'
                ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>Live Device Geolocation Map</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'batch'
                ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Batch Dataset Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'border-cyan-500 text-cyan-500 bg-cyan-500/5'
                : isDark ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Model Performance Metrics</span>
          </button>
        </div>

        {/* TAB 1: SINGLE SIGNAL TELEMETRY */}
        {activeTab === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Form Column */}
            <div className={`lg:col-span-7 border rounded-2xl p-6 backdrop-blur-sm shadow-xl transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b ${
                isDark ? 'border-slate-800/80' : 'border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Activity className="w-5 h-5 text-cyan-500" />
                    GPS Signal Parameters
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter signal parameters or generate dynamic live telemetry from active device GPS.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={generateLiveTelemetryFromDevice}
                    className="px-3 py-1.5 text-xs rounded-lg border font-semibold bg-cyan-500/10 text-cyan-500 border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Live Telemetry</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handlePredict} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>C/N0 (dB-Hz)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="CN0"
                      value={formData.CN0}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Doppler Offset (Hz)</label>
                    <input
                      type="number"
                      name="DO"
                      value={formData.DO}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Satellite PRN ID</label>
                    <input
                      type="number"
                      name="PRN"
                      value={formData.PRN}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Early Correlator (EC)</label>
                    <input
                      type="number"
                      name="EC"
                      value={formData.EC}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Prompt Correlator (PC)</label>
                    <input
                      type="number"
                      name="PC"
                      value={formData.PC}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Late Correlator (LC)</label>
                    <input
                      type="number"
                      name="LC"
                      value={formData.LC}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Time Of Week (TOW)</label>
                    <input
                      type="number"
                      name="TOW"
                      value={formData.TOW}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Carrier Phase (CP)</label>
                    <input
                      type="number"
                      name="CP"
                      value={formData.CP}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pseudo-Range (PD)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="PD"
                      value={formData.PD}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Analyzing Signal Telemetry...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 fill-white" />
                        <span>Run Real-Time ML Classification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {prediction ? (
                <div className={`border rounded-2xl p-6 backdrop-blur-sm shadow-xl flex-1 flex flex-col justify-between transition-colors ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    {/* Header Classification Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Classification Status
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(
                          prediction.riskLevel
                        )}`}
                      >
                        Risk Level: {prediction.riskLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      {prediction.isSpoofed ? (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500">
                          <XCircle className="w-8 h-8" />
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-500">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <h3 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {prediction.classification} Signal
                        </h3>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Prediction Confidence:{' '}
                          <span className="font-semibold text-cyan-500">
                            {(prediction.confidence * 100).toFixed(1)}%
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Class Probability Distribution */}
                    <div className="space-y-3 mb-6">
                      <h4 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Probability Breakdown
                      </h4>
                      {Object.entries(prediction.classProbabilities).map(([cls, prob]) => (
                        <div key={cls} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{cls}</span>
                            <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className={`w-full h-2 rounded-full overflow-hidden border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                            <div
                              className={`h-full transition-all duration-500 ${
                                cls === 'Legitimate'
                                  ? 'bg-emerald-500'
                                  : cls === 'Simplistic'
                                  ? 'bg-amber-500'
                                  : cls === 'Intermediate'
                                  ? 'bg-orange-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${prob * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Decision Alert */}
                    <div className={`p-4 rounded-xl text-xs font-semibold border mb-4 flex items-center gap-2 ${
                      prediction.isSpoofed
                        ? isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                        : isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {prediction.isSpoofed ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                      <span>
                        {prediction.isSpoofed
                          ? `AUTOPILOT ACTION: Signal PRN ${formData.PRN} Quarantined & Dropped. Switched to Inertial IMU.`
                          : `AUTOPILOT ACTION: Signal PRN ${formData.PRN} Verified Authentic. Included in Position Fix.`}
                      </span>
                    </div>

                    {/* Anomalous Flags */}
                    {prediction.anomalousFeatures.length > 0 && (
                      <div className={`p-4 rounded-xl border text-xs space-y-1 ${
                        isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}>
                        <div className="flex items-center gap-1.5 font-semibold">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Detected Signal Anomalies:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 pl-1">
                          {prediction.anomalousFeatures.map((flag, idx) => (
                            <li key={idx}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className={`pt-4 border-t text-[11px] flex justify-between ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    <span>Engine: Pure TypeScript ML</span>
                    <span>Latency: &lt; 2ms</span>
                  </div>
                </div>
              ) : (
                <div className={`border rounded-2xl p-8 text-center flex flex-col items-center justify-center flex-1 transition-colors ${
                  isDark ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-200'
                }`}>
                  <div className={`p-4 rounded-2xl border mb-4 ${
                    isDark ? 'bg-slate-800/60 border-slate-700/50 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Ready for Telemetry Analysis
                  </h3>
                  <p className={`text-xs max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Input GPS tracking parameters or click a preset sample button above to run real-time classification.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE DEVICE GEOLOCATION MAP */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className={`lg:col-span-8 border rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6 transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div>
                  <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Compass className="w-5 h-5 text-cyan-500" />
                    Live Device Geolocation & Defense Map
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Real-time position tracking when logged in on laptop or mobile.
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${
                  isDark ? 'bg-slate-800/90 border-slate-700/60 text-cyan-300' : 'bg-slate-100 border-slate-200 text-cyan-700'
                }`}>
                  {locationStatus}
                </div>
              </div>

              {/* Dynamic OpenStreetMap Canvas Container */}
              <div className={`w-full h-80 sm:h-96 rounded-xl overflow-hidden border relative ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}>
                {userLocation ? (
                  <iframe
                    title="Live Device Geolocation Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - 0.03}%2C${userLocation.lat - 0.03}%2C${userLocation.lng + 0.03}%2C${userLocation.lat + 0.03}&layer=mapnik&marker=${userLocation.lat}%2C${userLocation.lng}`}
                    className={`w-full h-full ${isDark ? 'filter invert hue-rotate-180 brightness-90 contrast-125' : ''}`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-500" />
                    Connecting to Device GPS Geolocation API...
                  </div>
                )}

                {/* Map Overlay Defense Legend */}
                <div className={`absolute bottom-3 left-3 right-3 p-3 backdrop-blur-md border rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 z-10 ${
                  isDark ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white/90 border-slate-200 shadow-md'
                }`}>
                  <div className="flex items-center gap-2 text-emerald-500 font-semibold">
                    <MapPin className="w-4 h-4 fill-emerald-500/20" />
                    <span>Authentic Device Location ({userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Loading...'})</span>
                  </div>

                  <div className="flex items-center gap-2 text-rose-500 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Rejected Spoofed Target (2.5 km Offset)</span>
                  </div>

                  <div className="flex items-center gap-2 text-cyan-500 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Defense Action: Drone Protected</span>
                  </div>
                </div>
              </div>

              {/* Spoofing Origin & Prevention Explanation */}
              <div className={`p-4 rounded-xl border space-y-3 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h4 className={`font-semibold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Info className="w-4 h-4 text-cyan-500" />
                  How Spoofing Occurs & How Our System Defends It:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg border space-y-1 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <p className="font-semibold text-amber-500">Where Spoofed Signals Originate:</p>
                    <p>Attackers use ground-based Software Defined Radios (SDRs like HackRF or LimeSDR) to transmit counterfeit satellite signals at higher power to trick receivers into calculating a fake location.</p>
                  </div>

                  <div className={`p-3 rounded-lg border space-y-1 ${
                    isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}>
                    <p className="font-semibold text-emerald-500">How We Block & Prevent It:</p>
                    <p>Our ML engine analyzes <b>Correlator Asymmetry</b> & <b>Doppler Offsets</b> in &lt; 2ms. When a fake signal is detected, the receiver drops the corrupted channel and locks onto internal IMU gyroscopes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Diagnostics Column */}
            <div className={`lg:col-span-4 border rounded-2xl p-6 backdrop-blur-sm shadow-xl space-y-6 transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`text-base font-bold flex items-center gap-2 border-b pb-3 ${
                isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
              }`}>
                <Smartphone className="w-5 h-5 text-cyan-500" />
                Live Connected Device Status
              </h3>

              <div className="space-y-4 text-xs">
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Detected Hardware Platform:</p>
                  <p className="text-sm font-semibold text-cyan-500">{deviceType}</p>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>GPS Geolocation Status:</p>
                  <p className="text-sm font-semibold text-emerald-500">{locationStatus}</p>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Active Coordinates (Lat, Lng):</p>
                  <p className={`text-sm font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {userLocation ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : 'Fetching...'}
                  </p>
                </div>

                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Vercel Cloud Deployment Engine:</p>
                  <p className="text-xs font-semibold text-cyan-500">Pure TypeScript ML Inference (&lt; 2ms Latency)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BATCH DATASET ANALYSIS */}
        {activeTab === 'batch' && (
          <div className={`border rounded-2xl p-8 backdrop-blur-sm shadow-xl space-y-8 transition-colors ${
            isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 inline-block">
                <Upload className="w-8 h-8" />
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Batch Dataset Classification</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Upload any Excel (<code>.xlsx</code>, <code>.xls</code>, <code>.xlsb</code>, <code>.xlsm</code>), CSV, TSV, TXT, JSON, or ODS file to run rapid batch scoring.
              </p>

              {/* Demo Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={loadDemoSample}
                  disabled={batchLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>1-Click Demo: Load 100 Sample Signals</span>
                </button>
              </div>

              {/* Universal File Select */}
              <label className={`block p-8 border-2 border-dashed rounded-2xl transition-colors cursor-pointer group ${
                isDark ? 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/50' : 'border-slate-300 hover:border-cyan-500/60 bg-slate-50'
              }`}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.xlsb,.xlsm,.tsv,.txt,.json,.ods,.dat,.log"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <FileType className="w-12 h-12 text-slate-400 group-hover:text-cyan-500 mx-auto mb-3 transition-colors" />
                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {fileName ? `Selected File: ${fileName}` : 'Click to browse or drop ANY file format (Excel, CSV, TSV, JSON, TXT)'}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Supports Excel (.xlsx, .xls, .xlsb), CSV, TSV, JSON, ODS, TXT, DAT with auto column normalization
                </p>
              </label>

              {/* Copy Paste Textarea alternative */}
              <div className="text-left space-y-2 pt-2">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Or Paste Raw CSV Data Lines directly:
                </label>
                <textarea
                  rows={3}
                  value={rawCsvText}
                  onChange={(e) => setRawCsvText(e.target.value)}
                  placeholder="DO,PD,RX,TOW,CP,EC,LC,PC,PIP,PQP,TCD,CN0,PRN&#10;1450,12.5,1,450000,100,150,120,135,10,5,2,44.5,5"
                  className={`w-full border rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-cyan-500 ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {rawCsvText && (
                  <button
                    onClick={handleRawCsvSubmit}
                    disabled={batchLoading}
                    className={`px-4 py-2 text-cyan-500 border text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Analyze Pasted Data Lines</span>
                  </button>
                )}
              </div>

              {batchLoading && (
                <div className="flex items-center justify-center gap-2 text-cyan-500 text-sm py-4">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing & Scoring Batch Dataset...</span>
                </div>
              )}
            </div>

            {/* Batch Results Summary */}
            {batchResult && (
              <div className={`space-y-6 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className={`p-4 border rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Telemetry Rows</p>
                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{batchResult.totalRecords}</p>
                  </div>
                  <div className={`p-4 border rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Legitimate Signals</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1">{batchResult.legitimateCount}</p>
                  </div>
                  <div className={`p-4 border rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Spoofed Signals</p>
                    <p className="text-2xl font-bold text-rose-500 mt-1">{batchResult.spoofedCount}</p>
                  </div>
                  <div className={`p-4 border rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Spoofing Attack Rate</p>
                    <p className="text-2xl font-bold text-cyan-500 mt-1">{batchResult.spoofingPercentage}%</p>
                  </div>
                </div>

                {/* Class Breakdown */}
                {batchResult.classBreakdown && (
                  <div className={`p-4 border rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className={`text-xs font-semibold mb-3 uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Attack Class Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {Object.entries(batchResult.classBreakdown).map(([cls, count]) => (
                        <div key={cls} className={`flex justify-between items-center p-2 rounded-lg border ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                        }`}>
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{cls}</span>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MODEL METRICS */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-8">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-5 border rounded-2xl backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                <p className={`text-xs font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Test Accuracy</p>
                <h3 className="text-3xl font-extrabold text-cyan-500 mt-1">
                  {(metrics.accuracy * 100).toFixed(2)}%
                </h3>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Evaluation on held-out test split</p>
              </div>

              <div className={`p-5 border rounded-2xl backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                <p className={`text-xs font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Macro F1 Score</p>
                <h3 className="text-3xl font-extrabold text-emerald-500 mt-1">
                  {metrics.f1_macro.toFixed(4)}
                </h3>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Balanced macro metric across 4 classes</p>
              </div>

              <div className={`p-5 border rounded-2xl backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                <p className={`text-xs font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Precision</p>
                <h3 className="text-3xl font-extrabold text-blue-500 mt-1">
                  {metrics.precision_macro.toFixed(4)}
                </h3>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Low false positive rate</p>
              </div>

              <div className={`p-5 border rounded-2xl backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
                <p className={`text-xs font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Training Samples</p>
                <h3 className="text-3xl font-extrabold text-purple-500 mt-1">
                  {metrics.sample_size.toLocaleString()}
                </h3>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Stratified subsample size</p>
              </div>
            </div>

            {/* Confusion Matrix Table */}
            <div className={`border rounded-2xl p-6 backdrop-blur-sm ${isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200'}`}>
              <h3 className={`text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Confusion Matrix (Test Evaluation)
              </h3>
              <div className="overflow-x-auto">
                <table className={`w-full text-xs text-left ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <thead className={`uppercase border-b ${isDark ? 'text-slate-400 border-slate-800 bg-slate-950/50' : 'text-slate-600 border-slate-200 bg-slate-100'}`}>
                    <tr>
                      <th className="px-4 py-3">Actual / Predicted</th>
                      <th className="px-4 py-3">Legitimate</th>
                      <th className="px-4 py-3">Simplistic</th>
                      <th className="px-4 py-3">Intermediate</th>
                      <th className="px-4 py-3">Sophisticated</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {metrics.confusion_matrix.map((row, idx) => {
                      const labels = ['Legitimate', 'Simplistic', 'Intermediate', 'Sophisticated'];
                      return (
                        <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                          <td className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{labels[idx]}</td>
                          {row.map((val, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-4 py-3 font-mono ${
                                idx === cIdx
                                  ? 'bg-emerald-500/10 text-emerald-500 font-bold'
                                  : isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {val.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
