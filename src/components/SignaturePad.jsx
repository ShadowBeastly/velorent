"use client";
// M4: Digital signature pad stub
// Full implementation in feat/m4-signature
import { useRef, useEffect, useState } from "react";

export default function SignaturePad({ onSave, onClear, width = 400, height = 200, className = "" }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
    }, []);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const startDraw = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
        setHasSignature(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const pos = getPos(e, canvas);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const endDraw = () => {
        setIsDrawing(false);
        if (hasSignature && onSave) {
            onSave(canvasRef.current.toDataURL("image/png"));
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onClear?.();
    };

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-crosshair touch-none w-full"
                style={{ maxHeight: height }}
            />
            {hasSignature && (
                <button
                    type="button"
                    onClick={clear}
                    className="self-end text-xs text-slate-500 hover:text-red-500 underline transition-colors"
                >
                    Unterschrift löschen
                </button>
            )}
        </div>
    );
}
