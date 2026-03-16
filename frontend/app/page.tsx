"use client";

import UploadZone from "@/components/UploadZone";
import JobDashboard from "@/components/JobDashboard";
import ComparisonSlider from "@/components/ComparisonSlider";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Upload, Wand2, Download, ArrowRight, Menu, Play, Sparkles } from "lucide-react";

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
      {/* Navigation - Raw & Simple */}
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
        {user ? (
          <div className="container mx-auto px-4 pt-32 pb-32 max-w-7xl">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6 border-b border-foreground pb-8">
              <h1 className="font-syne font-bold text-6xl md:text-8xl text-primary leading-[0.9]">
                Dash<br />board
              </h1>
              <p className="font-mono text-sm max-w-xs mb-2">
                Manage your restoration queue and download results.
              </p>
            </div>

            {/* Feature Explanation Cards */}
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
          </div>
        ) : (
          <>
            {/* Hero Section - Asymmetric & Bold */}
            <section className="min-h-screen flex flex-col justify-center px-4 md:px-12 pt-32 pb-20 relative">
              <div className="max-w-[90vw] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 flex flex-col z-10">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <p className="font-mono text-xs md:text-sm tracking-widest text-primary uppercase">
                      Memory Preservation Specialists
                    </p>
                    <div className="px-2 py-1 bg-primary/10 border border-primary text-[10px] font-bold font-mono uppercase text-primary tracking-wider">
                      Free Daily Credits
                    </div>
                  </div>
                  <h1 className="font-syne font-bold text-[15vw] leading-[0.8] tracking-tighter text-foreground mix-blend-overlay opacity-90">
                    RE<span className="text-primary">STORE</span>
                  </h1>
                  <h1 className="font-syne font-bold text-[15vw] leading-[0.8] tracking-tighter text-transparent ml-[5vw] stroke-text">
                    RELIVE
                  </h1>
                  <style jsx>{`
                    .stroke-text {
                      -webkit-text-stroke: 2px var(--primary);
                    }
                  `}</style>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-8 mt-12 lg:mt-0 items-start lg:items-end">
                  <p className="font-mono text-lg text-foreground/60 mt-64 max-w-md">
                    We bring your digital scans back to life.
                  </p>

                  <Link href="/login" className="group relative inline-flex items-center gap-4 px-8 py-4 bg-foreground text-background font-syne font-bold text-xl hover:bg-primary transition-colors brutalist-shadow border border-foreground">
                    Start Restoring <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              <div className="absolute bottom-12 left-12 animate-bounce">
                <p className="font-mono text-xs rotate-90 origin-left translate-x-4">SCROLL</p>
              </div>
            </section>

            {/* Showcase - Masonry / Broken Grid */}
            <section className="py-32 px-4 md:px-12 bg-accent/20 border-t border-foreground">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-16 items-start">
                  <div className="md:w-1/3 sticky top-24">
                    <h2 className="font-syne font-bold text-5xl md:text-7xl mb-8 leading-none">
                      See<br />The<br /><span className="text-primary italic">Soul.</span>
                    </h2>
                    <p className="font-mono text-sm leading-relaxed mb-8">
                      Our restoration process isn&apos;t just about pixels. It&apos;s about recovering the atmosphere of the moment.
                    </p>

                  </div>

                  <div className="md:w-2/3 space-y-24">
                    <div className="relative">
                      <div className="absolute -top-8 -left-8 font-syne text-9xl text-foreground/5 z-0">01</div>
                      <div className="relative z-10 border-2 border-foreground p-2 bg-background rotate-1 hover:rotate-0 transition-transform duration-500 brutalist-shadow">
                        <ComparisonSlider
                          before="/examples/bw-before.jpg"
                          after="/examples/bw-after.jpg"
                          beforeLabel="Aged"
                          afterLabel="Restored"
                        />
                      </div>
                      <p className="font-mono text-xs mt-4 text-right uppercase tracking-widest">Wedding Portrait // 1954</p>
                    </div>

                    <div className="relative md:ml-20">
                      <div className="absolute -top-8 -right-8 font-syne text-9xl text-foreground/5 z-0">02</div>
                      <div className="relative z-10 border-2 border-foreground p-2 bg-background -rotate-1 hover:rotate-0 transition-transform duration-500 brutalist-shadow">
                        <ComparisonSlider
                          before="/examples/color-before.jpg"
                          after="/examples/color-after.jpg"
                          beforeLabel="Aged"
                          afterLabel="Restored"
                        />
                      </div>
                      <p className="font-mono text-xs mt-4 text-right uppercase tracking-widest">Summer Holiday // 1982</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Steps - Horizontal Scroll or List */}
            <section className="py-32 px-4 border-t border-foreground bg-background">
              <div className="max-w-7xl mx-auto">
                <h2 className="font-syne font-bold text-4xl mb-20 text-center uppercase tracking-tighter">How We Work</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-foreground">
                  <div className="p-12 border-b md:border-b-0 md:border-r border-foreground hover:bg-accent/30 transition-colors group">
                    <Upload className="w-12 h-12 mb-8 text-primary stroke-1 group-hover:scale-110 transition-transform" />
                    <h3 className="font-syne font-bold text-2xl mb-4">1. Upload</h3>
                    <p className="font-mono text-sm text-foreground/70">Drag and drop your raw scans. We handle the rest securely.</p>
                  </div>
                  <div className="p-12 border-b md:border-b-0 md:border-r border-foreground hover:bg-accent/30 transition-colors group">
                    <Wand2 className="w-12 h-12 mb-8 text-primary stroke-1 group-hover:rotate-12 transition-transform" />
                    <h3 className="font-syne font-bold text-2xl mb-4">2. Process</h3>
                    <p className="font-mono text-sm text-foreground/70">Our algorithms surgically remove dust and restore color.</p>
                  </div>
                  <div className="p-12 hover:bg-accent/30 transition-colors group">
                    <Download className="w-12 h-12 mb-8 text-primary stroke-1 group-hover:translate-y-2 transition-transform" />
                    <h3 className="font-syne font-bold text-2xl mb-4">3. Keep</h3>
                    <p className="font-mono text-sm text-foreground/70">Download your high-res memories forever.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer - Minimal */}
            <footer className="py-12 border-t border-foreground px-6 flex justify-between items-end">
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
      </main>
    </div>
  );
}
