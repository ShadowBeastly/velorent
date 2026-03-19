"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, RefreshCw, Check, X } from "lucide-react";

/* eslint-disable no-unused-vars */
const POSITIONS_DE = {
    front: "Front",
    rear: "Heck",
    left_side: "Links",
    right_side: "Rechts",
    top: "Oben",
    detail: "Detail",
};
/* eslint-enable no-unused-vars */

export default function CameraCapture({ onCapture, label = "Foto aufnehmen", darkMode = false, existingPhotoUrl = null }) {
    const [mode, setMode] = useState(existingPhotoUrl ? "captured" : "idle");
    const [capturedUrl, setCapturedUrl] = useState(existingPhotoUrl || null);
    const [cameraError, setCameraError] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => () => stopStream(), [stopStream]);

    const startCamera = async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setMode("camera");
        } catch {
            setCameraError("Kamera nicht verfügbar");
        }
    };

    const compressToBase64 = (source) =>
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const maxW = 1200;
                const scale = img.width > maxW ? maxW / img.width : 1;
                const canvas = document.createElement("canvas");
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.src = source;
        });

    const handleCapture = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        const raw = canvas.toDataURL("image/jpeg", 1.0);
        const compressed = await compressToBase64(raw);
        stopStream();
        setCapturedUrl(compressed);
        setMode("captured");
        onCapture?.(compressed);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const compressed = await compressToBase64(ev.target.result);
            setCapturedUrl(compressed);
            setMode("captured");
            onCapture?.(compressed);
        };
        reader.readAsDataURL(file);
    };

    const handleRetake = () => {
        setCapturedUrl(null);
        setMode("idle");
        stopStream();
    };

    const base = darkMode
        ? "bg-slate-800 border-slate-700 text-slate-200"
        : "bg-white border-slate-200 text-slate-700";

    if (mode === "captured" && capturedUrl) {
        return (
            <div className="relative">
                <img src={capturedUrl} alt={label} className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                <div className="absolute inset-0 flex items-end justify-between p-2 bg-gradient-to-t from-black/40 to-transparent rounded-lg">
                    <span className="text-white text-xs font-semibold drop-shadow">{label}</span>
                    <div className="flex gap-1">
                        <button onClick={handleRetake} className="p-1 rounded bg-black/50 text-white hover:bg-black/70 transition-colors" title="Neu aufnehmen">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <span className="p-1 rounded bg-emerald-500/80 text-white">
                            <Check className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (mode === "camera") {
        return (
            <div className="relative">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 object-cover rounded-lg bg-black"
                />
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                    <button onClick={() => { stopStream(); setMode("idle"); }} className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <button onClick={handleCapture} className="p-3 rounded-full bg-white text-slate-900 shadow-lg hover:bg-slate-100 transition-colors">
                        <Camera className="w-6 h-6" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed h-40 transition-colors ${darkMode ? "border-slate-700 hover:border-slate-500" : "border-slate-300 hover:border-slate-400"} ${base}`}>
            <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
            {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
            <div className="flex gap-2">
                <button onClick={startCamera} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A7D5A] text-white text-xs font-semibold hover:bg-[#166a4b] transition-colors">
                    <Camera className="w-3.5 h-3.5" /> Kamera
                </button>
                <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                    <Upload className="w-3.5 h-3.5" /> Hochladen
                </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
    );
}
