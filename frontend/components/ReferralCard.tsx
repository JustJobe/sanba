"use client";

import { useState } from "react";
import { Gift, Copy, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function ReferralCard({ compact = false }: { compact?: boolean }) {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    if (!user?.referral_code) return null;

    const link = `https://sanba.my/login?ref=${user.referral_code}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable — show the link for manual copy
            prompt("Copy your referral link:", link);
        }
    };

    return (
        <div className={`border border-foreground bg-background ${compact ? "p-4" : "p-6 brutalist-shadow"}`}>
            <h3 className="font-mono text-xs uppercase tracking-widest text-accent mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Give 5, Get 5
            </h3>
            <p className={`font-mono ${compact ? "text-[11px]" : "text-sm"} text-foreground/60 mb-4 leading-relaxed`}>
                Friends who join with your link get 5 bonus credits — and so do you.
            </p>
            <div className="flex items-stretch gap-0">
                <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Your referral link"
                    className="flex-1 min-w-0 bg-foreground/5 border border-foreground/30 px-3 py-2 font-mono text-[11px] text-foreground/70 focus:outline-none"
                />
                <button
                    onClick={copy}
                    className="shrink-0 px-3 border border-l-0 border-foreground bg-foreground text-background hover:bg-primary transition-colors"
                    aria-label="Copy referral link"
                    title="Copy link"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
