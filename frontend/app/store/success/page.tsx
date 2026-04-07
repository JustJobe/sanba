"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";

export default function PaymentSuccessPage() {
    const { user, refreshUser } = useAuth();
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        let attempts = 0;
        const initialCredits = user?.credits ?? 0;

        const poll = async () => {
            await refreshUser();
            attempts++;
        };

        // Poll a few times to wait for webhook to credit the account
        const interval = setInterval(async () => {
            await poll();
            // Stop after credits increase or after 5 attempts
            if (attempts >= 5) {
                clearInterval(interval);
                setConfirmed(true);
            }
        }, 2000);

        // Also mark confirmed immediately if we already see increased credits
        poll().then(() => setConfirmed(true));

        return () => clearInterval(interval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-6">
                {confirmed ? (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                        <h1 className="text-3xl font-bold">Payment Successful</h1>
                        <p className="text-foreground/60">
                            Credits have been added to your account.
                        </p>
                        {user && (
                            <div className="bg-foreground/5 border border-foreground/10 rounded-xl p-6">
                                <p className="text-sm text-foreground/40 mb-1">Current Balance</p>
                                <p className="text-4xl font-bold text-primary">{user.credits}</p>
                                <p className="text-sm text-foreground/40 mt-1">credits</p>
                            </div>
                        )}
                        <Link
                            href="/"
                            className="inline-block bg-primary hover:bg-primary/80 text-background font-bold py-3 px-8 rounded-lg transition-colors"
                        >
                            Start Restoring
                        </Link>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
                        <h1 className="text-3xl font-bold">Processing Payment</h1>
                        <p className="text-foreground/60">
                            Please wait while we confirm your payment...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
