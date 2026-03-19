"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";

// eslint-disable-next-line no-unused-vars
const POSITIONS_DE = {
    front: "Front",
    rear: "Heck",
    left_side: "Links",
    right_side: "Rechts",
    top: "Oben",
    detail: "Detail",
};

export default function CameraCapture({ onCapture, label, darkMode, existingPhotoUrl }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);

    const [mode, setMode] = useState(existingPhotoUrl ? "captured" : "idle");
    const [capturedImage, setCapturedImage] = useState(existingPhotoUrl || null);
    const [cameraAvailable, setCameraAvailable] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!navigator?.mediaDevices?.getUserMedia) {
            // Check camera availability outside of render cycle
            const timer = setTimeout(() => setCameraAvailable(false), 0);
            return () => clearTimeout(timer);
        }
    }, []);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopStream();
    }, []);

    // When video stream starts, ensure autoplay works
    useEffect(() => {
        if (mode === "camera" && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
    }, [mode]);



    const startCamera = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 960 },
                },
            });
            streamRef.current = stream;
            setMode("camera");
        } catch {
            setError("Kamera nicht verfügbar.");
            setCameraAvailable(false);
        }
    };

    const takePhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / (video.videoWidth || 1280));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(dataUrl);
        setMode("captured");
        stopStream();
        onCapture(dataUrl);
    }, [onCapture]);

    const handleFileInput = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const maxWidth = 1200;
                const scale = Math.min(1, maxWidth / img.width);
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                setCapturedImage(dataUrl);
                setMode("captured");
                onCapture(dataUrl);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be re-selected
        e.target.value = "";
    };

    const reset = () => {
        stopStream();
        setCapturedImage(null);
        setMode("idle");
        onCapture(null);
    };

    const bg = darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200";

    return (
        <div className={`relative rounded-xl overflow-hidden border ${bg}`}>
            <canvas ref={canvasRef} className="hidden" />

            {/* IDLE: show capture options */}
            {mode === "idle" && (
                <div className="aspect-[4/3] flex flex-col items-center justify-center gap-3 p-4">
                    <Camera className={`w-8 h-8 ${darkMode ? "text-slate-500" : "text-slate-400"}`} />
                    {label && (
                        <p className={`text-xs font-semibold text-center ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {label}
                        </p>
                    )}
                    {error && (
                        <p className="text-xs text-red-500 text-center flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {error}
                        </p>
                    )}
                    <div className="flex flex-col gap-2 w-full max-w-[180px]">
                        {cameraAvailable && (
                            <button
                                onClick={startCamera}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1A7D5A] text-white text-sm font-semibold rounded-xl w-full active:scale-95 transition-transform"
                            >
                                <Camera className="w-4 h-4" />
                                Kamera öffnen
                            </button>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl w-full border active:scale-95 transition-transform ${darkMode ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-300 text-slate-600 hover:bg-white"}`}
                        >
                            <Upload className="w-4 h-4" />
                            Bild hochladen
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileInput}
                    />
                </div>
            )}

            {/* CAMERA: live preview */}
            {mode === "camera" && (
                <div className="relative">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full aspect-[4/3] object-cover bg-black"
                    />
                    {/* Shutter button */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 items-center">
                        <button
                            onClick={reset}
                            className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center"
                            title="Abbrechen"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={takePhoto}
                            className="w-16 h-16 rounded-full bg-white border-4 border-[#1A7D5A] shadow-lg flex items-center justify-center active:scale-90 transition-transform"
                            title="Foto aufnehmen"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#1A7D5A]" />
                        </button>
                        <div className="w-10 h-10" />
                    </div>
                    {/* Upload fallback in camera mode */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute top-3 left-3 p-2 rounded-lg bg-black/50 text-white"
                        title="Bild hochladen"
                    >
                        <Upload className="w-4 h-4" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInput}
                    />
                </div>
            )}

            {/* CAPTURED: show preview */}
            {mode === "captured" && capturedImage && (
                <div className="relative group">
                    <img
                        src={capturedImage}
                        alt={label || "Aufgenommenes Foto"}
                        className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="absolute top-2 left-2">
                        <span className="bg-[#1A7D5A] text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow">
                            <CheckCircle className="w-3 h-3" /> Aufgenommen
                        </span>
                    </div>
                    <button
                        onClick={reset}
                        className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" /> Neu aufnehmen
                    </button>
                </div>
            )}
        </div>
    );
}
