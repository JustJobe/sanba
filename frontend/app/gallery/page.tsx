import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "Gallery — Before & After Photo Restorations",
  description:
    "Browse real before-and-after photo restoration results from SanBa. See damaged, faded, and black-and-white photos brought back to life with AI.",
  alternates: {
    canonical: "https://sanba.my/gallery",
  },
  openGraph: {
    title: "Gallery — Before & After Photo Restorations | SanBa",
    description:
      "Browse stunning before-and-after photo restorations. See what SanBa can do for your old photographs.",
    url: "https://sanba.my/gallery",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery — Before & After Photo Restorations | SanBa",
    description: "See real photo restoration results. Drag to reveal the difference.",
    images: ["/og-image.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  name: "SanBa Photo Restoration Gallery",
  description:
    "Before and after comparisons of photos restored, repaired, and remastered by SanBa.",
  url: "https://sanba.my/gallery",
  provider: {
    "@type": "LocalBusiness",
    name: "SanBa",
    url: "https://sanba.my",
  },
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          <Link href="/gallery" className="font-bold underline decoration-1">Gallery</Link>
          <Link href="/login" className="hover:underline decoration-1">Login</Link>
          <Link href="/login" className="hover:underline decoration-1">Join</Link>
        </div>
      </nav>

      <GalleryClient />
    </div>
  );
}
