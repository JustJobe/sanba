import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import ShareClient from "./ShareClient";

// Server-side fetches go directly to the backend container; browser env var goes through nginx
const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:8002/api/v1";
const SITE_URL = "https://sanba.my";

interface ShareData {
    share_id: string;
    before: string;
    after: string;
    before_preview: string;
    after_preview: string;
    before_label: string;
    after_label: string;
    comparison_type: string;
    model_badge: string | null;
    og_image: string;
}

async function fetchShare(id: string): Promise<ShareData | null> {
    try {
        const res = await fetch(`${API_BASE}/shares/${id}`, {
            cache: "no-store",
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

function typeLabel(type: string): string {
    switch (type) {
        case "restored": return "Restored";
        case "repaired": return "Repaired";
        case "remastered": return "Remastered";
        default: return "Compared";
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const data = await fetchShare(id);
    if (!data) return { title: "Share Not Found | SanBa" };

    const label = typeLabel(data.comparison_type);
    const title = `Before & After: ${label} | SanBa`;
    const description = `See this photo ${label.toLowerCase()} with SanBa. Drag to compare the original with the result.`;
    const ogImage = `${SITE_URL}${data.og_image}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url: `${SITE_URL}/share/${id}`,
            images: [{ url: ogImage, width: 1200, height: 630, alt: `Before and after ${label}` }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImage],
        },
    };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const data = await fetchShare(id);
    if (!data) notFound();

    const label = typeLabel(data.comparison_type);

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 mix-blend-difference text-white px-6 py-8 flex justify-between items-start pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-6">
                    <Link href="/" className="font-syne font-bold text-4xl tracking-tighter leading-[0.8]">
                        San<br />Ba.
                    </Link>
                    <div className="mt-1">
                        <ThemeToggle />
                    </div>
                </div>
                <div className="pointer-events-auto flex flex-wrap justify-end items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm underline-offset-4">
                    <Link href="/gallery" className="hover:underline decoration-1">Gallery</Link>
                    <Link href="/login" className="hover:underline decoration-1">Login</Link>
                    <Link href="/login?ref=share" className="hover:underline decoration-1">Join</Link>
                </div>
            </nav>

            <ShareClient data={data} label={label} />

            {/* Acquisition CTA — every shared photo is a landing page */}
            <section className="container mx-auto px-4 pb-24 max-w-3xl text-center">
                <div className="border-2 border-foreground bg-background p-8 sm:p-12 brutalist-shadow">
                    <h2 className="font-syne font-bold text-2xl sm:text-3xl mb-3">
                        Got old photos of your own?
                    </h2>
                    <p className="font-mono text-xs text-foreground/60 mb-8 leading-relaxed max-w-md mx-auto">
                        Restore faded colours, repair damage, and bring black-and-white memories
                        to life — like this one — in seconds.
                    </p>
                    <Link
                        href="/login?ref=share"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-syne font-bold text-lg hover:bg-primary transition-colors brutalist-shadow border border-foreground"
                    >
                        Restore yours free — 10 credits
                    </Link>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-4">
                        No card required
                    </p>
                </div>
            </section>
        </div>
    );
}
