"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, User, Phone, Mail, Shield, CreditCard, Sparkles } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ProfilePage() {
    const { user, loading, updateProfile } = useAuth();
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
            setPhone(user.phone || "");
        }
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            </div>
        );
    }

    if (!user) {
        router.push("/login"); // Should be handled by middleware or context, but safe guard
        return null;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);
        try {
            await updateProfile({ full_name: fullName, phone });
            setMessage({ type: 'success', text: "Profile updated successfully!" });
        } catch (error) {
            setMessage({ type: 'error', text: "Failed to update profile. Please try again." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-white pt-24">

            <nav className="fixed top-0 w-full z-50 mix-blend-difference text-white px-6 py-8 flex justify-between items-center pointer-events-none">
                <Link href="/" className="pointer-events-auto flex items-center gap-2 hover:underline decoration-1 font-mono text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </Link>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <div className="pointer-events-auto w-8 h-8 flex items-center justify-center border border-white rounded-full">
                        <User className="w-4 h-4" />
                    </div>
                </div>
            </nav>

            <main className="relative z-10 container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto space-y-12">
                    <div className="border-b border-foreground pb-8">
                        <h1 className="font-syne font-bold text-6xl md:text-7xl text-primary leading-[0.9] mb-4">
                            Your<br />Profile.
                        </h1>
                        <p className="font-mono text-foreground/60 max-w-md">Manage your account settings and preferences.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Profile Form */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="border border-foreground p-8 bg-background brutalist-shadow">
                                <h2 className="font-syne font-bold text-2xl mb-8 flex items-center gap-3">
                                    <User className="w-6 h-6 text-primary" />
                                    Personal Information
                                </h2>
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="font-mono text-xs uppercase tracking-widest text-foreground/60">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                            <input
                                                type="email"
                                                value={user.email}
                                                disabled
                                                className="w-full bg-accent/20 border-b border-foreground py-3 pl-12 pr-4 text-foreground/50 cursor-not-allowed font-mono text-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="font-mono text-xs uppercase tracking-widest text-foreground/60">Full Name</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Enter your name"
                                                    className="w-full bg-transparent border-b border-foreground py-3 pl-12 pr-4 text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none transition-all font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-mono text-xs uppercase tracking-widest text-foreground/60">Phone Number</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+1 (555) 000-0000"
                                                    className="w-full bg-transparent border-b border-foreground py-3 pl-12 pr-4 text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none transition-all font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {message && (
                                        <div className={`p-4 border-l-4 font-mono text-sm ${message.type === 'success' ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-red-500 bg-red-500/10 text-red-700'}`}>
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="px-8 py-4 bg-primary text-primary-foreground font-syne font-bold uppercase tracking-wider hover:bg-secondary transition-all disabled:opacity-50 flex items-center gap-3 brutalist-shadow border border-foreground"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Account Status */}
                        <div className="space-y-6">
                            <div className="bg-primary text-primary-foreground border border-foreground p-8 relative overflow-hidden brutalist-shadow">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="w-24 h-24" />
                                </div>
                                <h3 className="font-mono text-xs uppercase tracking-widest text-primary-foreground/80 mb-2">Current Balance</h3>
                                <div className="font-syne font-bold text-5xl mb-1">
                                    {user.credits} <span className="text-2xl opacity-60">Credits</span>
                                </div>
                                <div className="font-mono text-sm text-primary-foreground/80 mb-8 leading-relaxed">
                                    On <strong className="border-b border-primary-foreground pb-0.5">Daily Basic</strong> plan. +1 free credit every 24h (max 5).
                                </div>
                                <Link href="/store" className="block w-full text-center px-6 py-3 bg-background text-primary font-bold font-mono text-sm hover:scale-105 transition-transform border border-foreground uppercase tracking-wider">
                                    Get More Credits
                                </Link>
                            </div>

                            {user.is_admin === 1 && (
                                <div className="bg-accent/10 border border-foreground p-6">
                                    <h3 className="font-mono text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Admin Access
                                    </h3>
                                    <p className="font-mono text-sm text-foreground/70 mb-6">
                                        You have administrative privileges to manage users and plans.
                                    </p>
                                    <Link href="/admin" className="block w-full text-center px-4 py-3 bg-background hover:bg-accent/20 border border-foreground text-foreground font-mono text-sm transition-colors uppercase tracking-wider">
                                        Admin Dashboard
                                    </Link>
                                </div>
                            )}

                            <div className="border border-foreground p-6 bg-background">
                                <h3 className="font-mono text-xs uppercase tracking-widest text-foreground/60 mb-4 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Active Plan
                                </h3>
                                <div className="flex items-center justify-between p-4 bg-accent/20 border border-foreground">
                                    <span className="font-syne font-bold text-lg">Daily Basic</span>
                                    <span className="text-xs px-2 py-1 bg-green-500 text-white font-mono uppercase tracking-widest border border-foreground">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
