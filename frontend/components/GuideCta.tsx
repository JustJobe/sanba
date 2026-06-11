"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Bottom call-to-action on the guide: signup pitch for visitors, dashboard link for users. */
export function GuideCta() {
    const { user } = useAuth();

    return (
        <div className="text-center border-2 border-foreground bg-background p-8 sm:p-12 brutalist-shadow">
            <h2 className="font-syne font-bold text-2xl sm:text-3xl mb-3">
                {user ? "Ready when you are." : "Ready to try it?"}
            </h2>
            <p className="font-mono text-xs text-foreground/60 mb-8">
                {user
                    ? "Your dashboard is waiting — drop a photo in and watch it come back to life."
                    : "Your first photos are on us — no card required."}
            </p>
            <Link
                href={user ? "/" : "/login"}
                className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-syne font-bold text-lg hover:bg-primary transition-colors brutalist-shadow border border-foreground"
            >
                {user ? "Go to your dashboard" : "Start free — 10 credits"}
                <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-6">
                Questions? See the <Link href="/faq" className="underline hover:text-primary">FAQ</Link> or message us on{" "}
                <a href="https://wa.me/60166016074" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">WhatsApp</a>
            </p>
        </div>
    );
}
