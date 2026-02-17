"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

function CallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        const token = searchParams.get("token");

        if (token) {
            loginWithToken(token).catch((err) => {
                console.error("Login failed:", err);
                router.push("/login?error=auth_failed");
            });
        } else {
            router.push("/login?error=no_token");
        }
    }, [searchParams, router, loginWithToken]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-foreground/60">Completing login...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-foreground/60">Loading...</p>
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
