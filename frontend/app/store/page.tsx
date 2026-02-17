"use client";

import { Check, Package, Layers } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function StorePage() {
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
                            <div className="flex items-center justify-between p-4 bg-background/40 rounded-lg border border-foreground/5">
                                <span className="font-medium">50 Credits</span>
                                <span className="text-primary font-bold">$3.00</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-background/40 rounded-lg border border-primary/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-primary text-background text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">POPULAR</div>
                                <span className="font-medium">200 Credits</span>
                                <span className="text-primary font-bold">$10.00</span>
                            </div>
                        </div>
                        <button disabled className="w-full bg-foreground/10 text-foreground/40 cursor-not-allowed font-bold py-3 rounded-lg transition-colors border border-foreground/5">
                            Coming soon
                        </button>
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
    )
}
