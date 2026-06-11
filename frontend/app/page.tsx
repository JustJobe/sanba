"use client";

import { useState, useEffect } from "react";
import UploadZone from "@/components/UploadZone";
import JobDashboard from "@/components/JobDashboard";
import ComparisonSlider from "@/components/ComparisonSlider";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Link from "next/link";
import CreditClaimPopup from "@/components/CreditClaimPopup";
import { SiteNav } from "@/components/SiteNav";
import { Loader2, Wand2, ArrowRight, Play, Sparkles } from "lucide-react";

interface ModelPricing {
  ai_repair: number;
  ai_remaster_full: number;
  ai_remaster_discounted: number;
}

interface Pricing {
  restore: number;
  ai_repair: number;
  ai_remaster_full: number;
  ai_remaster_discounted: number;
  daily_credit_threshold: number;
  models?: Record<string, ModelPricing>;
}

const EXAMPLES = [
  {
    before: "/examples/wedding-before.jpg",
    after: "/examples/wedding-after.jpg",
    title: "Wedding Day",
    year: "c. 1960",
    description: "Black-and-white wedding photo brought to life with AI colorization and enhanced clarity.",
  },
  {
    before: "/examples/bicycle-before.jpg",
    after: "/examples/bicycle-after.jpg",
    title: "The Cyclist",
    year: "c. 1950",
    description: "Faded black-and-white snapshot colorized and sharpened. Background and clothing details restored.",
  },
  {
    before: "/examples/gathering-before.jpg",
    after: "/examples/gathering-after.jpg",
    title: "Village Kids",
    year: "c. 1950",
    description: "Faded black-and-white group photo colorized and sharpened. Faces, clothing, and village backdrop restored.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [pricing, setPricing] = useState<Pricing>({ restore: 1, ai_repair: 4, ai_remaster_full: 4, ai_remaster_discounted: 3, daily_credit_threshold: 3 });

  // Compute min/max across all model tiers for display ranges
  const modelValues = pricing.models ? Object.values(pricing.models) : [];
  const repairMin = modelValues.length ? Math.min(...modelValues.map(m => m.ai_repair)) : pricing.ai_repair;
  const repairMax = modelValues.length ? Math.max(...modelValues.map(m => m.ai_repair)) : pricing.ai_repair;
  const remasterMin = modelValues.length ? Math.min(...modelValues.map(m => m.ai_remaster_discounted)) : pricing.ai_remaster_discounted;
  const remasterMax = modelValues.length ? Math.max(...modelValues.map(m => m.ai_remaster_full)) : pricing.ai_remaster_full;

  useEffect(() => {
    api.get("/jobs/pricing").then(res => setPricing(res.data)).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-secondary selection:text-primary-foreground">
      {user && <CreditClaimPopup />}
      <SiteNav creditThreshold={pricing.daily_credit_threshold} />

      <main className="relative z-10 w-full">
        <div className="container mx-auto px-4 pt-28 sm:pt-32 pb-32 max-w-7xl">

          {/* ── LOGGED-OUT ONLY: Hero ── */}
          {!user && (
            <section className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center mb-20 sm:mb-28 md:min-h-[60vh]">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-6">
                  — Photo restoration, Malaysia
                </p>
                <h1 className="font-syne font-bold text-5xl sm:text-6xl lg:text-7xl leading-[0.95] mb-6">
                  Old photos,<br />made <span className="text-accent">new</span>.
                </h1>
                <p className="font-mono text-sm text-foreground/60 max-w-md leading-relaxed mb-10">
                  Restore faded colours, repair tears and scratches, and bring black-and-white
                  memories to life — in seconds, not weeks.
                </p>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-4 px-8 py-4 bg-foreground text-background font-syne font-bold text-xl hover:bg-primary transition-colors brutalist-shadow border border-foreground"
                >
                  Restore your first photo
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="font-mono text-xs text-foreground/50 mt-4">
                  Sign up free — 10 credits included, plus a free credit daily. No card required.
                </p>
              </div>
              <div>
                <div className="border-2 border-foreground p-3 bg-background brutalist-shadow">
                  <ComparisonSlider
                    before="/examples/gentleman-before.jpg"
                    after="/examples/gentleman-after.jpg"
                    beforeLabel="Original"
                    afterLabel="Remastered"
                    maxHeightVh={55}
                  />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-3 text-center">
                  Drag the slider — The Walk, c. 1960
                </p>
              </div>
            </section>
          )}

          {/* ── LOGGED-IN ONLY: Dashboard heading + compact pricing strip ── */}
          {user && (
            <>
              <div className="flex flex-col md:flex-row items-end justify-between mb-10 gap-6 border-b border-foreground pb-8">
                <h1 className="font-syne font-bold text-4xl sm:text-6xl md:text-8xl text-primary leading-[0.9]">
                  Dash<br />board
                </h1>
                <p className="font-mono text-sm max-w-xs mb-2">
                  Manage your restoration queue and download results.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-12 font-mono text-[11px] uppercase tracking-widest">
                <span className="flex items-center gap-1.5 border border-foreground/30 px-3 py-1.5 text-foreground/70">
                  <Play className="w-3.5 h-3.5" />
                  Restore · {pricing.restore}cr
                </span>
                <span className="flex items-center gap-1.5 border border-amber-400/40 px-3 py-1.5 text-amber-400/90">
                  <Sparkles className="w-3.5 h-3.5" />
                  Repair · {repairMin === repairMax ? repairMin : `${repairMin}–${repairMax}`}cr
                </span>
                <span className="flex items-center gap-1.5 border border-violet-400/40 px-3 py-1.5 text-violet-400/90">
                  <Wand2 className="w-3.5 h-3.5" />
                  Remaster · {remasterMin === remasterMax ? remasterMin : `${remasterMin}–${remasterMax}`}cr
                </span>
                <Link href="/faq" className="text-foreground/40 hover:text-foreground hover:underline px-2 py-1.5">
                  Prices per photo — how it works →
                </Link>
              </div>
            </>
          )}

          {/* ── LOGGED-OUT ONLY: Feature Explanation Cards ── */}
          {!user && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-foreground mb-16 brutalist-shadow">
              <div className="p-5 sm:p-8 border-b sm:border-b-0 sm:border-r border-foreground group hover:bg-foreground/5 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <Play className="w-8 h-8 text-foreground/60 stroke-1 group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-foreground/30 px-2 py-0.5 text-foreground/50">
                    {pricing.restore} credit{pricing.restore !== 1 ? 's' : ''} / photo
                  </span>
                </div>
                <h3 className="font-syne font-bold text-xl mb-2">Restore</h3>
                <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                  Reverses fading and aging while keeping every original detail — no AI reinterpretation.
                </p>
              </div>

              <div className="p-5 sm:p-8 border-b sm:border-b-0 sm:border-r border-foreground group hover:bg-amber-400/5 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <Sparkles className="w-8 h-8 text-amber-400 stroke-1 group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-amber-400/40 px-2 py-0.5 text-amber-400/70">
                    {repairMin === repairMax ? repairMin : `${repairMin}–${repairMax}`} credit{repairMax !== 1 ? 's' : ''} / photo
                  </span>
                </div>
                <h3 className="font-syne font-bold text-xl mb-2 text-amber-400">Repair</h3>
                <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                  AI reconstructs tears, fills gaps, and removes heavy scratches — anchored to your original.
                </p>
              </div>

              <div className="p-5 sm:p-8 group hover:bg-violet-400/5 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <Wand2 className="w-8 h-8 text-violet-400 stroke-1 group-hover:rotate-12 transition-transform" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-violet-400/40 px-2 py-0.5 text-violet-400/70">
                    {remasterMin === remasterMax ? remasterMin : `${remasterMin}–${remasterMax}`} credit{remasterMax !== 1 ? 's' : ''} / photo
                  </span>
                </div>
                <h3 className="font-syne font-bold text-xl mb-2 text-violet-400">Remaster</h3>
                <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                  Vibrant colour and modern depth for B&W shots — discounted after a Repair.
                </p>
              </div>
            </div>
          )}

          {/* ── CONDITIONAL CONTENT ── */}
          {user ? (
            /* Logged-in: Upload zone + Job archive */
            <div className="grid lg:grid-cols-12 gap-12">
              {/* UploadZone: first in DOM for mobile, visually right on lg+ */}
              <div className="lg:col-span-4 order-first lg:order-last">
                <div className="sticky top-32">
                  <UploadZone />
                </div>
              </div>
              {/* JobDashboard: second in DOM for mobile, visually left on lg+ */}
              <div className="lg:col-span-8 order-last lg:order-first space-y-12">
                <JobDashboard />
              </div>
            </div>
          ) : (
            /* Logged-out: Proof section + CTA + Footer */
            <>
              <section className="pt-12 border-t border-foreground">
                <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-8">
                  — See it in action
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {EXAMPLES.map((ex) => (
                    <div key={ex.title} className="border-2 border-foreground p-3 bg-background brutalist-shadow">
                      <ComparisonSlider
                        before={ex.before}
                        after={ex.after}
                        beforeLabel="Original"
                        afterLabel="Remastered"
                        maxHeightVh={45}
                      />
                      <div className="mt-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-syne font-bold text-lg leading-tight">{ex.title}</h3>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-0.5">
                            {ex.year}
                          </p>
                          <p className="font-mono text-xs text-foreground/50 mt-2 max-w-xs leading-relaxed">
                            {ex.description}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 shrink-0 border-violet-400/40 text-violet-400">
                          Remaster
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center md:items-start">
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-4 px-8 py-4 bg-foreground text-background font-syne font-bold text-xl hover:bg-primary transition-colors brutalist-shadow border border-foreground w-full md:w-auto justify-center md:justify-start"
                  >
                    Reclaim your moments
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <p className="font-mono text-xs text-foreground/50 mt-4 text-center md:text-left">
                    Sign up free — 10 credits included, no card required.
                  </p>
                </div>
              </section>

              <footer className="mt-24 py-12 border-t border-foreground flex justify-between items-end">
                <div>
                  <Link href="/" className="font-syne font-bold text-2xl tracking-tighter">SanBa.</Link>
                  <div className="font-mono text-xs mt-4 text-foreground/50">
                    <p>Penang, Malaysia</p>
                    <p>+60 16 601 6074</p>
                  </div>
                </div>
                <p className="font-mono text-xs text-foreground/30">
                  &copy; {new Date().getFullYear()}
                </p>
              </footer>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
