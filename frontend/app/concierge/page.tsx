import Link from "next/link";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
    title: "Concierge — Mail-in Photo Restoration | SanBa",
    description:
        "Mail us your physical prints. SanBa scans and restores the set in Penang — WhatsApp +60 16 601 6074. Digital packs also available in the store.",
};

const WHATSAPP_URL = "https://wa.me/60166016074";

export default function ConciergePage() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-primary-foreground">
            <SiteNav />

            <main className="relative z-10 container mx-auto px-4 pt-28 sm:pt-32 pb-32 max-w-3xl">
                <PageHeader
                    title={<>Concierge.</>}
                    subtitle="Mail-physical-prints wedge — we scan & restore the set when the originals are still on paper."
                />

                <div className="space-y-6">
                    <div className="border-2 border-foreground bg-background p-5 sm:p-8 brutalist-shadow">
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">
                            Mail us the prints. We scan and restore the set.
                        </h2>
                        <div className="text-foreground/70 text-sm leading-relaxed space-y-3">
                            <p>
                                Still holding a shoebox, album, or envelope of physical photos? Send them to us.
                                We scan at high resolution, run Restore / Repair / Remaster across the set, and
                                return digital files — same look across the batch, not one photo at a time.
                            </p>
                            <p>
                                Built in Penang for Malaysian family archives. Tell us roughly how many prints
                                and we&apos;ll quote before you post anything.
                            </p>
                        </div>
                    </div>

                    <div className="border-2 border-foreground bg-background p-5 sm:p-8 brutalist-shadow">
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">Get in touch</h2>
                        <ul className="space-y-3 font-mono text-sm text-foreground/80">
                            <li>
                                WhatsApp:{" "}
                                <a
                                    href={WHATSAPP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-primary text-foreground"
                                >
                                    +60 16 601 6074
                                </a>
                            </li>
                            <li>Phone: +60 16 601 6074</li>
                            <li>Based in Penang, Malaysia</li>
                        </ul>
                        <a
                            href={WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-syne font-bold text-base hover:bg-primary transition-colors brutalist-shadow border border-foreground"
                        >
                            Message on WhatsApp
                        </a>
                    </div>

                    <div className="border-2 border-foreground bg-background p-5 sm:p-8 brutalist-shadow">
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">Already scanned?</h2>
                        <p className="text-foreground/70 text-sm leading-relaxed mb-4">
                            If you have digital files ready, skip the mail-in and use album packs — upload in
                            batch, process where each photo needs it, download a ZIP.
                        </p>
                        <div className="flex flex-wrap gap-4 font-mono text-xs">
                            <Link href="/store" className="underline hover:text-primary text-foreground">
                                Album packs in the Store →
                            </Link>
                            <Link href="/faq" className="underline hover:text-primary text-foreground/60">
                                FAQ
                            </Link>
                            <Link href="/guide" className="underline hover:text-primary text-foreground/60">
                                How it works
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
