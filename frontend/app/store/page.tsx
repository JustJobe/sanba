"use client";

import { useState, useEffect } from "react";
import { Check, Layers, Package, Zap, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface CreditPackage {
    credits: number;
    price_myr_cents: number;
    label: string;
    per_credit_label: string;
    badge?: string;
}

export default function StorePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [packages, setPackages] = useState<Record<string, CreditPackage>>({});
    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    useEffect(() => {
        api.get("/payments/packages").then((res) => setPackages(res.data)).catch(console.error);
    }, []);

    const handleBuy = async (packageKey: string) => {
        if (!user) {
            router.push("/login");
            return;
        }
        setLoadingKey(packageKey);
        try {
            const res = await api.post("/payments/checkout", { package_key: packageKey });
            window.location.href = res.data.checkout_url;
        } catch (error) {
            console.error(error);
            alert("Failed to start checkout. Please try again.");
            setLoadingKey(null);
        }
    };

    const formatPrice = (cents: number) => `RM ${(cents / 100).toFixed(2)}`;

    const packageEntries = Object.entries(packages);

    return (
        <div className="min-h-screen bg-background text-foreground p-8 pb-32">
            <div className="container mx-auto max-w-5xl">
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className="text-foreground/60 hover:text-foreground transition-colors">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold">Store & Services</h1>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Digital Credits */}
                    <div className="bg-foreground/5 border border-foreground/10 rounded-2xl p-8 hover:border-primary/30 transition-all">
                        <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Digital Credits</h2>
                        <p className="text-foreground/40 mb-6">Purchase bulk credits for high-volume batch processing.</p>

                        <div className="space-y-4 mb-8">
                            {packageEntries.map(([key, pkg]) => {
                                const isPopular = pkg.badge === "POPULAR";
                                const isBestValue = pkg.badge === "BEST VALUE";
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleBuy(key)}
                                        disabled={loadingKey !== null}
                                        className={`w-full flex items-center justify-between p-4 bg-background/40 rounded-lg border transition-all text-left ${
                                            isBestValue
                                                ? "border-violet-400/40 hover:border-violet-400/70"
                                                : isPopular
                                                ? "border-primary/30 hover:border-primary/60"
                                                : "border-foreground/5 hover:border-foreground/20"
                                        } relative overflow-hidden disabled:opacity-50 disabled:cursor-wait`}
                                    >
                                        {pkg.badge && (
                                            <div
                                                className={`absolute top-0 right-0 text-[10px] px-2 py-0.5 rounded-bl-lg font-bold flex items-center gap-1 ${
                                                    isBestValue
                                                        ? "bg-violet-500 text-white"
                                                        : "bg-primary text-background"
                                                }`}
                                            >
                                                {isBestValue && <Zap className="w-2.5 h-2.5" />}
                                                {pkg.badge}
                                            </div>
                                        )}
                                        <div>
                                            <span className={`font-medium ${isBestValue ? "text-violet-300" : ""}`}>
                                                {pkg.label}
                                            </span>
                                            <p className="text-xs text-foreground/40 mt-0.5">{pkg.per_credit_label}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {loadingKey === key ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-foreground/40" />
                                            ) : (
                                                <span className={`font-bold ${isBestValue ? "text-violet-300" : "text-primary"}`}>
                                                    {formatPrice(pkg.price_myr_cents)}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-xs text-foreground/30 text-center">
                            Accepts cards, FPX, Touch &apos;n Go, and GrabPay
                        </p>
                    </div>

                    {/* Physical Scanning */}
                    <div className="bg-foreground/5 border border-foreground/10 rounded-2xl p-8 hover:border-accent/30 transition-all">
                        <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center mb-6">
                            <Package className="w-8 h-8 text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Concierge Scanning</h2>
                        <p className="text-foreground/40 mb-6">Send us your physical shoeboxes. We scan, restore, and upload them for you.</p>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-sm text-foreground/80">
                                <Check className="w-4 h-4 text-green-400" />
                                Professional 600 DPI Scanning
                            </li>
                            <li className="flex items-center gap-3 text-sm text-foreground/80">
                                <Check className="w-4 h-4 text-green-400" />
                                Hardware Scratch Removal
                            </li>
                            <li className="flex items-center gap-3 text-sm text-foreground/80">
                                <Check className="w-4 h-4 text-green-400" />
                                Return Shipping Included
                            </li>
                        </ul>
                        <button className="w-full bg-accent hover:bg-accent/80 text-background font-bold py-3 rounded-lg transition-colors">
                            Get a Quote
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
