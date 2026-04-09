"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronsLeftRight } from "lucide-react";

interface ComparisonSliderProps {
    before: string;
    after: string;
    beforeLabel?: string;
    afterLabel?: string;
    maxHeightVh?: number;
    beforeFallback?: string;
    afterFallback?: string;
    modelBadge?: string;
}

export default function ComparisonSlider({
    before,
    after,
    beforeLabel = "Before",
    afterLabel = "After",
    maxHeightVh,
    beforeFallback,
    afterFallback,
    modelBadge,
}: ComparisonSliderProps) {
    const [isResizing, setIsResizing] = useState(false);
    const [position, setPosition] = useState(50);
    const [aspectRatio, setAspectRatio] = useState<string>("4 / 3");
    const [naturalRatio, setNaturalRatio] = useState<number>(4 / 3);
    const containerRef = useRef<HTMLDivElement>(null);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleResize = useCallback(
        (clientX: number) => {
            if (containerRef.current) {
                const { left, width } = containerRef.current.getBoundingClientRect();
                const newPosition = ((clientX - left) / width) * 100;
                setPosition(Math.min(Math.max(newPosition, 0), 100));
            }
        },
        []
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing) return;
            handleResize(e.clientX);
        },
        [isResizing, handleResize]
    );

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isResizing) return;
            handleResize(e.touches[0].clientX);
        },
        [isResizing, handleResize]
    );

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", stopResizing);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", stopResizing);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", stopResizing);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", stopResizing);
        };
    }, [handleMouseMove, stopResizing, handleTouchMove]);

    const sizeConstraint = maxHeightVh
        ? { maxHeight: `${maxHeightVh}vh`, maxWidth: `calc(${maxHeightVh}vh * ${naturalRatio})` }
        : {};

    return (
        <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-2xl select-none cursor-ew-resize group shadow-2xl shadow-black/50 border border-white/10 mx-auto"
            style={{ aspectRatio, ...sizeConstraint }}
            onMouseDown={() => setIsResizing(true)}
            onTouchStart={() => setIsResizing(true)}
        >
            {/* After Image (Background) */}
            <img
                src={after}
                alt="After restoration"
                className="absolute inset-0 w-full h-full object-cover"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style={{ imageRendering: 'high-quality' as any }}
                draggable={false}
                onError={afterFallback ? (e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = afterFallback;
                } : undefined}
                onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                        setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
                        setNaturalRatio(img.naturalWidth / img.naturalHeight);
                    }
                }}
            />

            {/* Label After */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-white text-center leading-snug whitespace-pre-line z-10">
                {afterLabel}
            </div>

            {/* Before Image (Foreground with Clip) */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ width: `${position}%`, overflow: "hidden" }}
            >
                <img
                    src={before}
                    alt="Before restoration"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    // We set the width of this inner image to the container width to prevent distortion
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%', imageRendering: 'high-quality' as any }}
                    draggable={false}
                    onError={beforeFallback ? (e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = beforeFallback;
                    } : undefined}
                />

                {/* Label Before */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-white text-center leading-snug z-10">
                    {beforeLabel}
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute inset-y-0 w-1 bg-white/50 backdrop-blur-sm cursor-ew-resize flex items-center justify-center z-20 group-hover:bg-white transition-colors"
                style={{ left: `${position}%` }}
            >
                <div className="flex flex-col items-center gap-1 transform -translate-x-0.5">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <ChevronsLeftRight className="w-4 h-4 text-purple-900" />
                    </div>
                    {modelBadge && (
                        <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-mono font-bold text-white/90 uppercase tracking-wider whitespace-nowrap">
                            {modelBadge}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
