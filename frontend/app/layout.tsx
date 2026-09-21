import type { Metadata } from "next";
import { Syne, Space_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sanba.my"),
  title: {
    default: "SanBa — Photo Restoration, Repair & Remastering Services | Malaysia",
    template: "%s | SanBa",
  },
  description:
    "Restore whole family albums with SanBa — Penang's batch photo restoration service. Upload scans, get a ZIP. MYR pricing. Concierge for physical prints.",
  keywords: [
    "photo restoration malaysia",
    "batch photo restoration",
    "family album restoration",
    "photo colorization service",
    "restore old photos",
    "black and white photo colorization",
    "AI photo restoration",
    "damaged photo repair",
    "foto lama restore malaysia",
    "shoebox photo scanning penang",
    "photo enhancement service",
  ],
  authors: [{ name: "SanBa", url: "https://sanba.my" }],
  creator: "SanBa",
  publisher: "SanBa",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://sanba.my",
  },
  openGraph: {
    type: "website",
    locale: "en_MY",
    url: "https://sanba.my",
    siteName: "SanBa",
    title: "SanBa — Photo Restoration, Repair & Remastering Services",
    description:
      "Restore whole family albums with SanBa — Penang's batch photo restoration service. Upload scans, get a ZIP. MYR pricing. Concierge for physical prints.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SanBa Photo Restoration Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SanBa — Photo Restoration, Repair & Remastering Services",
    description:
      "Restore whole family albums with SanBa — Penang's batch photo restoration service. Upload scans, get a ZIP. MYR pricing. Concierge for physical prints.",
    images: ["/og-image.jpg"],
  },
};

import { ThemeProvider } from "@/components/theme-provider";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "SanBa",
  description:
    "Restore whole family albums with SanBa — Penang's batch photo restoration service. Upload scans, get a ZIP. MYR pricing. Concierge for physical prints.",
  url: "https://sanba.my",
  telephone: "+60166016074",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Penang",
    addressCountry: "MY",
  },
  priceRange: "MYR",
  sameAs: [],
  offers: {
    "@type": "Offer",
    description: "Photo restoration starting from 1 credit per photo",
    priceCurrency: "MYR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-MY" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${syne.variable} ${spaceMono.variable} ${cormorant.variable} antialiased bg-background text-foreground font-mono`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
