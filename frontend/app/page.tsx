"use client";

import UploadZone from "@/components/UploadZone";
import JobDashboard from "@/components/JobDashboard";
import ComparisonSlider from "@/components/ComparisonSlider";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Wand2, ArrowRight, Play, Sparkles } from "lucide-react";

export default function Home() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-secondary selection:text-primary-foreground">
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
          {!user ? (
            <>
              <Link href="/gallery" className="hover:underline decoration-1">Gallery</Link>
              <Link href="/login" className="hover:underline decoration-1">Login</Link>
              <Link href="/signup" className="hover:underline decoration-1">Join</Link>
            </>
          ) : (
            <>
              <Link href="/store" className="hover:underline decoration-1 text-primary font-bold">
                Credits: {user.credits}
              </Link>
              <Link href="/store" className="hover:underline decoration-1 opacity-60 hidden sm:inline">
                Buy More
              </Link>
              <Link href="/profile" className="hover:underline decoration-1">
                Account
              </Link>
              <button onClick={logout} className="hover:underline decoration-1 text-destructive/80 hover:text-destructive">
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="relative z-10 w-full">
        <div className="container mx-auto px-4 pt-32 pb-32 max-w-7xl">

          {/* ── LOGGED-OUT ONLY: SEO H1 + tagline ── */}
          {!user && (
            <>
              <h1 className="sr-only">Photo Restoration Service — Malaysia</h1>
              <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-6">
                — Breathe new life into old photographs.
              </p>
            </>
          )}

          {/* ── LOGGED-IN ONLY: Dashboard heading ── */}
          {user && (
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6 border-b border-foreground pb-8">
              <h1 className="font-syne font-bold text-6xl md:text-8xl text-primary leading-[0.9]">
                Dash<br />board
              </h1>
              <p className="font-mono text-sm max-w-xs mb-2">
                Manage your restoration queue and download results.
              </p>
            </div>
          )}

          {/* ── UNIVERSAL: Feature Explanation Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-foreground mb-16 brutalist-shadow">
            {/* Restore */}
            <div className="p-8 border-b sm:border-b-0 sm:border-r border-foreground group hover:bg-foreground/5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Play className="w-8 h-8 text-foreground/60 stroke-1 group-hover:scale-110 transition-transform" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-foreground/30 px-2 py-0.5 text-foreground/50">
                  1 credit / photo
                </span>
              </div>
              <h3 className="font-syne font-bold text-xl mb-2">Restore</h3>
              <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                Denoise, colour-correct, and recover black-and-white tones. The required first step — run this before Repair or Remaster.
              </p>
            </div>

            {/* Repair */}
            <div className="p-8 border-b sm:border-b-0 sm:border-r border-foreground group hover:bg-amber-400/5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Sparkles className="w-8 h-8 text-amber-400 stroke-1 group-hover:scale-110 transition-transform" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-amber-400/40 px-2 py-0.5 text-amber-400/70">
                  3 credits / photo
                </span>
              </div>
              <h3 className="font-syne font-bold text-xl mb-2 text-amber-400">Repair</h3>
              <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                Gemini AI reconstructs torn edges, fills missing areas, and removes heavy damage. Available after Restore completes.
              </p>
            </div>

            {/* Remaster */}
            <div className="p-8 group hover:bg-violet-400/5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <Wand2 className="w-8 h-8 text-violet-400 stroke-1 group-hover:rotate-12 transition-transform" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-violet-400/40 px-2 py-0.5 text-violet-400/70">
                  3 credits / photo
                </span>
              </div>
              <h3 className="font-syne font-bold text-xl mb-2 text-violet-400">Remaster</h3>
              <p className="font-mono text-xs text-foreground/60 leading-relaxed">
                Gemini AI enhances sharpness and upscales resolution. Uses the Repaired image if available, otherwise Restored. Available after Restore.
              </p>
            </div>
          </div>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="border-2 border-foreground p-2 bg-background brutalist-shadow">
                    <ComparisonSlider
                      before="/examples/bw-before.jpg"
                      after="/examples/bw-after.jpg"
                      beforeLabel="Aged"
                      afterLabel="Restored"
                      maxHeightVh={45}
                    />
                    <p className="font-mono text-[10px] mt-2 text-right uppercase tracking-widest text-foreground/40">
                      Wedding Portrait // 1954
                    </p>
                  </div>
                  <div className="border-2 border-foreground p-2 bg-background brutalist-shadow">
                    <ComparisonSlider
                      before="/examples/color-before.jpg"
                      after="/examples/color-after.jpg"
                      beforeLabel="Original"
                      afterLabel="Remastered"
                      maxHeightVh={45}
                    />
                    <p className="font-mono text-[10px] mt-2 text-right uppercase tracking-widest text-foreground/40">
                      Summer Holiday // 1982
                    </p>
                  </div>
                </div>

                <div className="flex justify-center md:justify-start">
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-4 px-8 py-4 bg-foreground text-background font-syne font-bold text-xl hover:bg-primary transition-colors brutalist-shadow border border-foreground w-full md:w-auto justify-center md:justify-start"
                  >
                    Reclaim your moments
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
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
