"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ComparisonSlider from "@/components/ComparisonSlider";

const EXAMPLES = [
  {
    id: "wedding-walk",
    before: "/examples/gentleman-before.jpg",
    after: "/examples/gentleman-after.jpg",
    beforeLabel: "Original",
    afterLabel: "Remastered",
    title: "The Walk",
    year: "c. 1960",
    type: "Remaster",
    typeColor: "text-violet-400",
    typeBorder: "border-violet-400/40",
    description: "Black-and-white wedding procession colorized with AI. Foliage, clothing, and skin tones brought to life.",
  },
  {
    id: "wedding-portrait",
    before: "/examples/wedding-before.jpg",
    after: "/examples/wedding-after.jpg",
    beforeLabel: "Original",
    afterLabel: "Remastered",
    title: "Wedding Day",
    year: "c. 1960",
    type: "Remaster",
    typeColor: "text-violet-400",
    typeBorder: "border-violet-400/40",
    description: "Black-and-white wedding photo brought to life with AI colorization and enhanced clarity.",
  },
  {
    id: "bicycle-portrait",
    before: "/examples/bicycle-before.jpg",
    after: "/examples/bicycle-after.jpg",
    beforeLabel: "Original",
    afterLabel: "Remastered",
    title: "The Cyclist",
    year: "c. 1950",
    type: "Remaster",
    typeColor: "text-violet-400",
    typeBorder: "border-violet-400/40",
    description: "Faded black-and-white snapshot colorized and sharpened. Background and clothing details restored.",
  },
  {
    id: "village-kids",
    before: "/examples/gathering-before.jpg",
    after: "/examples/gathering-after.jpg",
    beforeLabel: "Original",
    afterLabel: "Remastered",
    title: "Village Kids",
    year: "c. 1950",
    type: "Remaster",
    typeColor: "text-violet-400",
    typeBorder: "border-violet-400/40",
    description: "Faded black-and-white group photo colorized and sharpened. Faces, clothing, and village backdrop restored.",
  },
];

export default function GalleryClient() {
  return (
    <main className="container mx-auto px-4 pt-32 pb-32 max-w-7xl">
      {/* Header */}
      <div className="mb-16">
        <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-4">
          — Real restorations, real results
        </p>
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-foreground pb-8">
          <h1 className="font-syne font-bold text-6xl md:text-8xl text-primary leading-[0.9]">
            Gal<br />lery
          </h1>
          <p className="font-mono text-sm max-w-xs text-foreground/60 mb-2">
            Drag the slider to reveal before and after.<br />
            Each photo restored with SanBa.
          </p>
        </div>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
        {EXAMPLES.map((ex) => (
          <div key={ex.id} className="border-2 border-foreground p-3 bg-background brutalist-shadow">
            <ComparisonSlider
              before={ex.before}
              after={ex.after}
              beforeLabel={ex.beforeLabel}
              afterLabel={ex.afterLabel}
              maxHeightVh={50}
            />
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-syne font-bold text-lg leading-tight">{ex.title}</h2>
                <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40 mt-0.5">
                  {ex.year}
                </p>
                <p className="font-mono text-xs text-foreground/50 mt-2 max-w-xs leading-relaxed">
                  {ex.description}
                </p>
              </div>
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 shrink-0 ${ex.typeBorder} ${ex.typeColor}`}
              >
                {ex.type}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA section */}
      <section className="border-t border-foreground pt-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-foreground/50 mb-3">
              — Your photos next
            </p>
            <h2 className="font-syne font-bold text-4xl md:text-5xl text-foreground leading-[0.95]">
              Ready to restore<br />your memories?
            </h2>
            <p className="font-mono text-xs text-foreground/50 mt-4 max-w-sm leading-relaxed">
              Sign up free and get 10 credits to try. Plus 1 free credit daily. No card required.
            </p>
          </div>
          <Link
            href="/login"
            className="group inline-flex items-center gap-4 px-8 py-4 bg-foreground text-background font-syne font-bold text-xl hover:bg-primary transition-colors brutalist-shadow border border-foreground w-full md:w-auto justify-center md:justify-start shrink-0"
          >
            Start restoring
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
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
    </main>
  );
}
