"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ArrowRight, Mail, KeyRound, Loader2, ArrowLeft } from "lucide-react";

// Simple Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.424 44.599 -10.174 45.789 L -6.704 42.319 C -8.804 40.359 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
            </g>
        </svg>
    );
}

export default function LoginPage() {
    const { login, requestOtp } = useAuth();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<"email" | "otp">("email");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await requestOtp(email);
            setStep("otp");
        } catch (err) {
            setError("Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await login(email, otp);
        } catch (err) {
            setError("Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
            {/* Left Side - Art/Brand */}
            <div className="w-full md:w-1/2 bg-primary p-12 flex flex-col justify-between relative overflow-hidden">
                <Link href="/" className="font-syne font-bold text-4xl text-background relative z-10 block w-fit">SanBa.</Link>

                <div className="relative z-10">
                    <h1 className="font-syne font-bold text-6xl md:text-8xl text-background leading-[0.8] mb-6">
                        Access<br />Your<br /><span className="text-foreground">Past</span>
                    </h1>
                </div>

                <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')]"></div>
                {/* Decorative Circle */}
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent rounded-full blur-3xl opacity-50"></div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full md:w-1/2 p-8 md:p-24 flex flex-col justify-center bg-background">
                <div className="max-w-md w-full mx-auto">
                    <h2 className="font-syne font-bold text-3xl mb-8">Sign In</h2>

                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer mb-8 select-none">
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-0.5 w-4 h-4 shrink-0 accent-primary cursor-pointer"
                        />
                        <span className="font-mono text-xs text-foreground/60 leading-relaxed">
                            I agree to the{" "}
                            <Link href="/terms" target="_blank" className="underline text-foreground/80 hover:text-primary">
                                Terms of Use
                            </Link>{" "}
                            and acknowledge that AI-processed results may differ from originals.
                        </span>
                    </label>

                    {/* Social Login */}
                    <div className="space-y-4 mb-12">
                        {termsAccepted ? (
                            <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/auth/login/google`}
                                className="w-full bg-background border border-foreground text-foreground font-mono text-sm font-bold py-4 flex items-center justify-center gap-3 hover:bg-foreground hover:text-background transition-colors brutalist-shadow"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                Continue with Google
                            </a>
                        ) : (
                            <span className="w-full bg-background border border-foreground/30 text-foreground/30 font-mono text-sm font-bold py-4 flex items-center justify-center gap-3 cursor-not-allowed brutalist-shadow">
                                <GoogleIcon className="w-5 h-5 opacity-30" />
                                Continue with Google
                            </span>
                        )}
                    </div>

                    <div className="relative mb-12">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-foreground/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs font-mono uppercase tracking-widest">
                            <span className="px-4 bg-background text-foreground/50">Or with email</span>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 border border-destructive bg-destructive/10 text-destructive font-mono text-xs">
                            {error}
                        </div>
                    )}

                    {step === "email" ? (
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                            <div>
                                <label className="block font-mono text-xs uppercase tracking-widest mb-2">Email Address</label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-foreground/20 px-0 py-3 focus:outline-none focus:border-foreground transition-colors font-mono placeholder:text-foreground/20"
                                        placeholder="name@example.com"
                                        required
                                    />
                                    <Mail className="w-5 h-5 text-foreground/20 absolute right-0 top-1/2 -translate-y-1/2 group-focus-within:text-foreground transition-colors" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!termsAccepted || loading}
                                className={`w-full font-syne font-bold text-xl py-4 flex items-center justify-center gap-2 group brutalist-shadow transition-colors ${termsAccepted ? 'bg-foreground text-background hover:bg-primary' : 'bg-foreground/30 text-background/50 cursor-not-allowed'}`}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
                                {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit} className="space-y-6">
                            <div>
                                <label className="block font-mono text-xs uppercase tracking-widest mb-2">One-Time Password</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-foreground/20 px-0 py-3 focus:outline-none focus:border-foreground transition-colors font-mono text-center text-2xl tracking-[1em]"
                                        placeholder="••••••"
                                        required
                                    />
                                </div>
                                <p className="text-xs font-mono text-foreground/40 mt-4 text-center">
                                    Code sent to {email}
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-foreground text-background font-syne font-bold text-xl py-4 hover:bg-primary transition-colors flex items-center justify-center gap-2 brutalist-shadow"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="w-full text-xs font-mono uppercase tracking-widest hover:underline mt-4"
                            >
                                Back to Email
                            </button>
                        </form>
                    )}

                    <div className="mt-16 pt-8 border-t border-foreground/10">
                        <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:underline group">
                            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        </div >
    );
}
