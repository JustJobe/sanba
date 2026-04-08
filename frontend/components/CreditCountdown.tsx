"use client";

import { useState, useEffect } from "react";

function getSecondsUntilNextUTC8Midnight(): number {
    const now = new Date();
    // Convert to UTC+8
    const utc8Offset = 8 * 60 * 60 * 1000;
    const nowUTC8 = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + utc8Offset);
    // Next midnight in UTC+8
    const nextMidnight = new Date(nowUTC8);
    nextMidnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((nextMidnight.getTime() - nowUTC8.getTime()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function CreditCountdown() {
    const [seconds, setSeconds] = useState(getSecondsUntilNextUTC8Midnight());

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(getSecondsUntilNextUTC8Midnight());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <span className="font-mono text-[10px] uppercase tracking-widest text-yellow-400/70 hidden sm:inline">
            Free credit in {formatCountdown(seconds)}
        </span>
    );
}
