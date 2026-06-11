"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import CreditCountdown from "@/components/CreditCountdown";

interface SiteNavProps {
    /** Balance below which the daily-credit countdown is shown */
    creditThreshold?: number;
}

export function SiteNav({ creditThreshold = 3 }: SiteNavProps) {
    const { user, logout } = useAuth();

    return (
        <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur border-b border-foreground/10 text-foreground sm:bg-transparent sm:backdrop-blur-none sm:border-b-0 sm:mix-blend-difference sm:text-white px-4 sm:px-6 py-3 sm:py-8 flex justify-between items-center sm:items-start pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-6">
                <Link href="/" className="font-syne font-bold text-3xl sm:text-4xl tracking-tighter leading-[0.8]">
                    San<br />Ba.
                </Link>
                <div className="mt-1">
                    <ThemeToggle />
                </div>
            </div>

            <div className="pointer-events-auto flex flex-wrap justify-end items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm underline-offset-4">
                {!user ? (
                    <>
                        <Link href="/guide" className="hover:underline decoration-1">How It Works</Link>
                        <Link href="/gallery" className="hover:underline decoration-1">Gallery</Link>
                        <Link href="/faq" className="hover:underline decoration-1">FAQ</Link>
                        <Link href="/login" className="hover:underline decoration-1">Login</Link>
                    </>
                ) : (
                    <>
                        <Link href="/guide" className="hover:underline decoration-1 opacity-60">
                            Guide
                        </Link>
                        <Link href="/store" className="hover:underline decoration-1 text-primary font-bold">
                            Credits: {user.credits}
                        </Link>
                        {user.credits < creditThreshold && <CreditCountdown />}
                        <Link href="/store" className="hover:underline decoration-1 opacity-60">
                            Buy More
                        </Link>
                        <Link href="/profile" className="hover:underline decoration-1">
                            Account
                        </Link>
                        <button onClick={logout} className="hover:underline decoration-1 text-destructive/80 hover:text-destructive">
                            Logout
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
