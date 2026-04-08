"use client";

import { useAuth } from "@/context/AuthContext";
import { Gift } from "lucide-react";

export default function CreditClaimPopup() {
    const { creditReplenished, clearCreditReplenished } = useAuth();

    if (!creditReplenished) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border-2 border-foreground p-8 max-w-sm w-full mx-4 brutalist-shadow text-center">
                <Gift className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <h2 className="font-syne font-bold text-2xl mb-2">+1 Credit Claimed!</h2>
                <p className="font-mono text-xs text-foreground/60 mb-6 leading-relaxed">
                    Your daily free credit has been added to your balance.
                </p>
                <button
                    onClick={clearCreditReplenished}
                    className="w-full bg-foreground text-background font-mono text-xs uppercase tracking-widest py-3 hover:bg-primary transition-colors border border-foreground"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
