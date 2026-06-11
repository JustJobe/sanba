"use client";

import { useState, useEffect } from "react";
import { Check, Layers, Package, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { SiteNav } from "@/components/SiteNav";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

interface CreditPackage {
    credits: number;
    price_myr_cents: number;
    price_cents: number;
    currency: string;
    currency_symbol: string;
    label: string;
    per_credit_label: string;
    badge?: string;
}

const WHATSAPP_QUOTE_URL = `https://wa.me/60166016074?text=${encodeURIComponent("Hi SanBa, I'd like a quote for the Concierge Scanning service.")}`;

export default function StorePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [packages, setPackages] = useState<Record<string, CreditPackage>>({});
    const [loadingKey, setLoadingKey] = useState<string | null>(null);
    const [currency, setCurrency] = useState<string>("myr");

    useEffect(() => {
        const detectCurrency = async () => {
            const cached = localStorage.getItem("detected_currency");
            if (cached) return cached;
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 2000);
                const res = await fetch("https://ipapi.co/currency/", { signal: controller.signal });
                clearTimeout(timeout);
                const code = (await res.text()).trim().toLowerCase();
                const supported = ["myr", "usd", "sgd", "eur", "gbp", "aud", "jpy", "idr", "thb", "php"];
                const detected = supported.includes(code) ? code : "usd";
                localStorage.setItem("detected_currency", detected);
                return detected;
            } catch {
                return "usd";
            }
        };
        detectCurrency().then((cur) => {
            setCurrency(cur);
            api.get(`/payments/packages?currency=${cur}`).then((res) => setPackages(res.data)).catch(console.error);
        });
    }, []);

    const handleBuy = async (packageKey: string) => {
        if (!user) {
            router.push("/login");
            return;
        }
        setLoadingKey(packageKey);
        try {
            const res = await api.post("/payments/checkout", { package_key: packageKey, currency });
            window.location.href = res.data.checkout_url;
        } catch (error) {
            console.error(error);
            alert("Failed to start checkout. Please try again.");
            setLoadingKey(null);
        }
    };

    const formatPrice = (pkg: CreditPackage) => {
        const sym = pkg.currency_symbol || "RM";
        const cents = pkg.price_cents ?? pkg.price_myr_cents;
        if (pkg.currency === "jpy") return `${sym} ${cents}`;
        return `${sym} ${(cents / 100).toFixed(2)}`;
    };

    const packageEntries = Object.entries(packages);

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-primary-foreground">
            <SiteNav />

            <main className="relative z-10 container mx-auto px-4 pt-28 sm:pt-32 pb-32 max-w-5xl">
                <PageHeader
                    title={<>Store &<br />Services.</>}
                    subtitle="Credits for digital restoration, or hands-on help with the physical shoebox."
                />

                <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                    {/* Digital Credits */}
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <Layers className="w-8 h-8 text-primary stroke-1" />
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-foreground/30 px-2 py-0.5 text-foreground/50">
                                Instant
                            </span>
                        </div>
                        <h2 className="font-syne font-bold text-2xl mb-2">Digital Credits</h2>
                        <p className="font-mono text-xs text-foreground/60 leading-relaxed mb-8">
                            Buy credits in bulk for restoration, AI repair, and remastering.
                        </p>

                        <div className="space-y-4 mb-8">
                            {packageEntries.length === 0 && (
                                <div className="flex items-center justify-center py-8 text-foreground/40">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                            )}
                            {packageEntries.map(([key, pkg]) => (
                                <button
                                    key={key}
                                    onClick={() => handleBuy(key)}
                                    disabled={loadingKey !== null}
                                    className="relative w-full flex items-center justify-between p-4 bg-background border-2 border-foreground hover:bg-foreground hover:text-background transition-colors text-left disabled:opacity-50 disabled:cursor-wait group"
                                >
                                    {pkg.badge && (
                                        <span className="absolute -top-3 right-3 font-mono text-[9px] font-bold uppercase tracking-widest bg-accent text-background px-2 py-0.5 border border-foreground">
                                            {pkg.badge}
                                        </span>
                                    )}
                                    <span>
                                        <span className="font-syne font-bold text-lg block">{pkg.label}</span>
                                        {pkg.per_credit_label && (
                                            <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                                                {pkg.per_credit_label}
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-mono font-bold text-base shrink-0">
                                        {loadingKey === key ? <Loader2 className="w-4 h-4 animate-spin" /> : formatPrice(pkg)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 text-center">
                            {currency === "myr"
                                ? "Accepts cards, FPX, Touch ’n Go, and GrabPay"
                                : "Accepts all major cards"}
                        </p>
                    </Card>

                    {/* Physical Scanning */}
                    <Card>
                        <div className="flex items-center justify-between mb-6">
                            <Package className="w-8 h-8 text-accent stroke-1" />
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-accent/40 px-2 py-0.5 text-accent/70">
                                By hand
                            </span>
                        </div>
                        <h2 className="font-syne font-bold text-2xl mb-2">Concierge Scanning</h2>
                        <p className="font-mono text-xs text-foreground/60 leading-relaxed mb-8">
                            Send us your physical shoeboxes. We scan, restore, and upload them for you.
                        </p>

                        <ul className="space-y-3 mb-8">
                            {["Professional 600 DPI Scanning", "Hardware Scratch Removal", "Return Shipping Included"].map((item) => (
                                <li key={item} className="flex items-center gap-3 font-mono text-xs text-foreground/80">
                                    <Check className="w-4 h-4 text-accent shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <ButtonLink href={WHATSAPP_QUOTE_URL} external variant="accent" size="md" className="w-full">
                            Get a Quote on WhatsApp
                        </ButtonLink>
                    </Card>
                </div>
            </main>
        </div>
    );
}
