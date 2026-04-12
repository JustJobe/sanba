"use client";

import { useState } from "react";
import Link from "next/link";
import ComparisonSlider from "@/components/ComparisonSlider";
import { ArrowRight, X } from "lucide-react";

interface ShareData {
    share_id: string;
    before: string;
    after: string;
    before_preview: string;
    after_preview: string;
    before_label: string;
    after_label: string;
    comparison_type: string;
    model_badge: string | null;
    og_image: string;
}

export default function ShareClient({ data, label }: { data: ShareData; label: string }) {
    const [showFullImage, setShowFullImage] = useState(false);

    return (
        <main className="flex flex-col items-center px-4 pt-32 pb-16 gap-8 max-w-4xl mx-auto">
            {/* Title */}
            <h1 className="font-syne font-bold text-2xl sm:text-3xl text-center">
                Original vs {label}
            </h1>

            {/* Comparison Slider */}
            <ComparisonSlider
                before={data.before}
                after={data.after}
                beforeLabel={data.before_label}
                afterLabel={data.after_label}
                modelBadge={data.model_badge ?? undefined}
                onExpandAfter={() => setShowFullImage(true)}
                fitScreen
            />

            {/* Fullscreen image overlay for pinch-zoom */}
            {showFullImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col"
                    onClick={() => setShowFullImage(false)}
                >
                    <div className="flex items-center justify-between px-4 py-3 shrink-0">
                        <span className="font-mono text-xs text-white/60 uppercase tracking-widest">
                            {data.after_label}
                        </span>
                        <button
                            onClick={() => setShowFullImage(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div
                        className="flex-1 overflow-auto flex items-center justify-center"
                        style={{ touchAction: "pinch-zoom" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={data.after}
                            alt={data.after_label}
                            className="max-w-full h-auto"
                            style={{ touchAction: "pinch-zoom" }}
                            draggable={false}
                        />
                    </div>
                </div>
            )}
            <p className="text-center text-xs font-mono text-foreground/40 uppercase tracking-widest">
                Drag slider to compare
            </p>

            {/* CTA */}
            <div className="mt-8 w-full max-w-md mx-auto border-2 border-foreground p-8 text-center brutalist-shadow">
                <p className="font-mono text-xs text-foreground/50 uppercase tracking-widest mb-3">
                    Powered by SanBa
                </p>
                <h2 className="font-syne font-bold text-xl mb-4">
                    Restore your own photos
                </h2>
                <p className="font-mono text-xs text-foreground/60 leading-relaxed mb-6">
                    Upload old, damaged, or faded photos and bring them back to life with AI-powered restoration, repair, and remastering.
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center font-mono text-[10px] text-foreground/30 uppercase tracking-widest">
                <Link href="/" className="hover:text-foreground/50 transition-colors">sanba.my</Link>
            </footer>
        </main>
    );
}
