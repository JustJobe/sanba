"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronsLeftRight } from "lucide-react";

interface ComparisonSliderProps {
    before: string;
    after: string;
    beforeLabel?: string;
    afterLabel?: string;
}

export default function ComparisonSlider({
    before,
    after,
    beforeLabel = "Before",
    afterLabel = "After",
}: ComparisonSliderProps) {
    const [isResizing, setIsResizing] = useState(false);
    const [position, setPosition] = useState(50);
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

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-[4/5] md:aspect-[4/3] overflow-hidden rounded-2xl select-none cursor-ew-resize group shadow-2xl shadow-black/50 border border-white/10"
            onMouseDown={() => setIsResizing(true)}
            onTouchStart={() => setIsResizing(true)}
        >
            {/* After Image (Background) */}
            <img
                src={after}
                alt="After restoration"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
            />

            {/* Label After */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-white z-10">
                {afterLabel}
            </div>

            {/* Before Image (Foreground with Clip) */}
            <div
                className="absolute inset-0 w-full h-full will-change-[width]"
                style={{ width: `${position}%`, overflow: "hidden" }}
            >
                <img
                    src={before}
                    alt="Before restoration"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    // We set the width of this inner image to the container width to prevent distortion
                    style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
                    draggable={false}
                />

                {/* Label Before */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-white z-10">
                    {beforeLabel}
                </div>
            </div>

            {/* Slider Handle */}
            <div
                className="absolute inset-y-0 w-1 bg-white/50 backdrop-blur-sm cursor-ew-resize flex items-center justify-center z-20 group-hover:bg-white transition-colors"
                style={{ left: `${position}%` }}
            >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg transform -translate-x-0.5">
                    <ChevronsLeftRight className="w-4 h-4 text-purple-900" />
                </div>
            </div>
        </div>
    );
}
