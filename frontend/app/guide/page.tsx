import type { Metadata } from "next";
import Link from "next/link";
import { Upload, Play, Sparkles, Wand2, Download, Pencil, Share2, Copy, Zap, Gift, ArrowRight, Layers } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { PageHeader } from "@/components/ui/PageHeader";
import ComparisonSlider from "@/components/ComparisonSlider";

export const metadata: Metadata = {
    title: "How It Works — SanBa Photo Restoration Guide",
    description: "A simple visual guide to restoring, repairing, and remastering your old photos with SanBa.",
};

// Server-side fetches go directly to the backend container
const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://backend:8002/api/v1";

interface ModelPricing { ai_repair: number; ai_remaster_full: number; ai_remaster_discounted: number }

async function fetchPricing() {
    const fallback = { restore: 1, repairRange: "2–4", remasterRange: "1–4" };
    try {
        const res = await fetch(`${API_BASE}/jobs/pricing`, { next: { revalidate: 300 } });
        if (!res.ok) return fallback;
        const p = await res.json();
        const models: ModelPricing[] = p.models ? Object.values(p.models) : [];
        if (!models.length) return fallback;
        const rMin = Math.min(...models.map(m => m.ai_repair));
        const rMax = Math.max(...models.map(m => m.ai_repair));
        const mMin = Math.min(...models.map(m => m.ai_remaster_discounted));
        const mMax = Math.max(...models.map(m => m.ai_remaster_full));
        return {
            restore: p.restore ?? 1,
            repairRange: rMin === rMax ? `${rMin}` : `${rMin}–${rMax}`,
            remasterRange: mMin === mMax ? `${mMin}` : `${mMin}–${mMax}`,
        };
    } catch {
        return fallback;
    }
}

export default async function GuidePage() {
    const pricing = await fetchPricing();

    const steps = [
        {
            n: "01",
            icon: <Upload className="w-10 h-10 stroke-1" />,
            title: "Upload",
            body: "Drag your photos in — up to 50 at a time. Phone snaps of physical photos work great too.",
        },
        {
            n: "02",
            icon: <Sparkles className="w-10 h-10 stroke-1 text-amber-400" />,
            title: "Pick your magic",
            body: "Restore happens automatically. Add AI Repair for damage or Remaster for colour — per photo, only where needed.",
        },
        {
            n: "03",
            icon: <Download className="w-10 h-10 stroke-1 text-violet-400" />,
            title: "Compare & download",
            body: "Drag the before/after slider, then download everything as a ZIP or share a link with family.",
        },
    ];

    const tools = [
        {
            question: "Colours faded or washed out?",
            tool: "Restore",
            cost: `${pricing.restore} credit / photo`,
            chipClass: "border-foreground/40 text-foreground/80",
            body: "Reverses fading and ageing while keeping every original detail. No AI reinterpretation — just your photo, the way it used to look. Runs automatically when you upload.",
            before: "/examples/color-before.jpg",
            after: "/examples/color-after.jpg",
            afterLabel: "Restored",
        },
        {
            question: "Tears, stains, or missing pieces?",
            tool: "Repair",
            cost: `${pricing.repairRange} credits / photo`,
            chipClass: "border-amber-400/60 text-amber-400",
            body: "AI reconstructs torn corners, fills gaps, and removes heavy scratches — anchored to your original so faces stay true.",
            before: "/examples/gathering-before.jpg",
            after: "/examples/gathering-after.jpg",
            afterLabel: "Repaired",
        },
        {
            question: "Black & white photo you wish was colour?",
            tool: "Remaster",
            cost: `${pricing.remasterRange} credits / photo`,
            chipClass: "border-violet-400/60 text-violet-400",
            body: "Brings B&W shots to life with natural colour and modern depth. Discounted when you've already repaired the photo.",
            before: "/examples/bw-before.jpg",
            after: "/examples/bw-after.jpg",
            afterLabel: "Remastered",
        },
    ];

    const features = [
        { icon: <Play className="w-5 h-5" />, title: "Slideshow", body: "One click plays every before/after comparison in a job — sit back and drag through them." },
        { icon: <Pencil className="w-5 h-5" />, title: "Rename a job", body: "Click the pencil next to a job's name. Your name is also used for the downloaded files." },
        { icon: <Share2 className="w-5 h-5" />, title: "Share a result", body: "Open any comparison and hit Share — you get a link anyone can view, no account needed." },
        { icon: <Copy className="w-5 h-5" />, title: "Try again", body: "The duplicate button copies a restored photo to a new job, so you can re-run Repair or Remaster for a different take." },
        { icon: <Sparkles className="w-5 h-5" />, title: "Repair all", body: "Batch job? One button repairs every remaining photo in it, with one confirmation and one total price." },
        { icon: <Zap className="w-5 h-5" />, title: "Standard vs Premium", body: "Each job has a quality picker. Standard is fast and affordable; Premium gives the best results for precious photos." },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-primary-foreground">
            <SiteNav />

            <main className="relative z-10 container mx-auto px-4 pt-28 sm:pt-32 pb-32 max-w-5xl">
                <PageHeader
                    title={<>How it<br />works.</>}
                    subtitle="From shoebox to slideshow in three steps — here's everything, visually."
                />

                {/* ── The 3 steps ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-foreground brutalist-shadow mb-20">
                    {steps.map((s, i) => (
                        <div key={s.n} className={`p-6 sm:p-8 ${i < steps.length - 1 ? "border-b sm:border-b-0 sm:border-r border-foreground" : ""}`}>
                            <div className="flex items-start justify-between mb-6">
                                {s.icon}
                                <span className="font-syne font-bold text-5xl text-foreground/10">{s.n}</span>
                            </div>
                            <h2 className="font-syne font-bold text-xl mb-2">{s.title}</h2>
                            <p className="font-mono text-xs text-foreground/60 leading-relaxed">{s.body}</p>
                        </div>
                    ))}
                </div>

                {/* ── Which tool? ── */}
                <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-3">
                    — Which tool does my photo need?
                </p>
                <h2 className="font-syne font-bold text-3xl sm:text-4xl mb-10">
                    Match the problem<br />to the magic.
                </h2>

                <div className="space-y-12 mb-20">
                    {tools.map((t) => (
                        <div key={t.tool} className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
                            <div>
                                <h3 className="font-syne font-bold text-2xl mb-4">{t.question}</h3>
                                <span className={`inline-block font-mono text-xs font-bold uppercase tracking-widest border px-3 py-1.5 mb-4 ${t.chipClass}`}>
                                    → {t.tool} · {t.cost}
                                </span>
                                <p className="font-mono text-xs text-foreground/60 leading-relaxed max-w-md">{t.body}</p>
                            </div>
                            <div className="border-2 border-foreground p-3 bg-background brutalist-shadow">
                                <ComparisonSlider
                                    before={t.before}
                                    after={t.after}
                                    beforeLabel="Original"
                                    afterLabel={t.afterLabel}
                                    maxHeightVh={50}
                                />
                                <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-3 text-center">
                                    Drag the slider
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Handy features ── */}
                <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-3">
                    — Once your photos are done
                </p>
                <h2 className="font-syne font-bold text-3xl sm:text-4xl mb-10">Small buttons,<br />big helpers.</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
                    {features.map((f) => (
                        <div key={f.title} className="border border-foreground bg-background p-5">
                            <div className="flex items-center gap-3 mb-3 text-primary">
                                {f.icon}
                                <h3 className="font-syne font-bold text-lg text-foreground">{f.title}</h3>
                            </div>
                            <p className="font-mono text-xs text-foreground/60 leading-relaxed">{f.body}</p>
                        </div>
                    ))}
                </div>

                {/* ── Credits ── */}
                <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-3">
                    — Paying for it
                </p>
                <h2 className="font-syne font-bold text-3xl sm:text-4xl mb-10">Credits, simply.</h2>

                <div className="border-2 border-foreground brutalist-shadow p-6 sm:p-10 mb-20">
                    <div className="flex flex-wrap items-center gap-2 mb-8 font-mono text-[11px] uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 border border-foreground/30 px-3 py-1.5 text-foreground/70">
                            <Play className="w-3.5 h-3.5" /> Restore · {pricing.restore}cr
                        </span>
                        <span className="flex items-center gap-1.5 border border-amber-400/40 px-3 py-1.5 text-amber-400/90">
                            <Sparkles className="w-3.5 h-3.5" /> Repair · {pricing.repairRange}cr
                        </span>
                        <span className="flex items-center gap-1.5 border border-violet-400/40 px-3 py-1.5 text-violet-400/90">
                            <Wand2 className="w-3.5 h-3.5" /> Remaster · {pricing.remasterRange}cr
                        </span>
                    </div>
                    <ul className="space-y-4 font-mono text-xs text-foreground/70 leading-relaxed max-w-2xl">
                        <li className="flex gap-3">
                            <Gift className="w-4 h-4 shrink-0 text-accent" />
                            <span><strong className="text-foreground">Free to start</strong> — signup credits included, and if you run low, log in daily for a free top-up credit.</span>
                        </li>
                        <li className="flex gap-3">
                            <Share2 className="w-4 h-4 shrink-0 text-accent" />
                            <span><strong className="text-foreground">Give 5, get 5</strong> — share your referral link from the dashboard; you both get 5 credits when a friend joins.</span>
                        </li>
                        <li className="flex gap-3">
                            <Layers className="w-4 h-4 shrink-0 text-accent" />
                            <span><strong className="text-foreground">Need more?</strong> Credit packs start at RM 2.90 in the <Link href="/store" className="underline hover:text-primary">store</Link> — cards, FPX, Touch &rsquo;n Go, and GrabPay accepted. Failed operations are always refunded automatically.</span>
                        </li>
                    </ul>
                </div>

                {/* ── CTA ── */}
                <div className="text-center border-2 border-foreground bg-background p-8 sm:p-12 brutalist-shadow">
                    <h2 className="font-syne font-bold text-2xl sm:text-3xl mb-3">Ready to try it?</h2>
                    <p className="font-mono text-xs text-foreground/60 mb-8">
                        Your first photos are on us — no card required.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-foreground text-background font-syne font-bold text-lg hover:bg-primary transition-colors brutalist-shadow border border-foreground"
                    >
                        Start free — 10 credits
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-6">
                        Questions? See the <Link href="/faq" className="underline hover:text-primary">FAQ</Link> or message us on{" "}
                        <a href="https://wa.me/60166016074" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">WhatsApp</a>
                    </p>
                </div>
            </main>
        </div>
    );
}
