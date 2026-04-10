import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "FAQ — SanBa Photo Restoration",
    description: "Frequently asked questions about SanBa photo restoration, Repair & Remaster, and credit policies.",
};

const faqs = [
    {
        id: "repair-declined",
        q: "Why was my photo declined for Repair & Remaster?",
        a: (
            <>
                <p className="mb-3">
                    Our AI-powered Repair &amp; Remaster uses Google Gemini, which has content policies that restrict
                    certain images — including some photos of children. This is not a judgment on your photo; it is a
                    limitation of our AI provider.
                </p>
                <ul className="list-disc list-inside space-y-1 mb-3 text-foreground/70">
                    <li><strong className="text-foreground">No credits are charged</strong> for photos that cannot be processed.</li>
                    <li>Most other photos (landscapes, portraits of adults, documents) process without issue.</li>
                    <li>
                        Our{" "}
                        <Link href="/concierge" className="underline hover:text-primary">
                            Concierge Service
                        </Link>{" "}
                        is a personal alternative — mail us your physical photo and our team will handle the restoration by hand.
                    </li>
                </ul>
                <p className="text-foreground/60 text-xs font-mono">
                    If you believe your photo was declined in error, please contact us.
                </p>
            </>
        ),
    },
    {
        id: "credits",
        q: "How do credits work?",
        a: (
            <>
                <p className="mb-2">Credits are consumed when you process a photo:</p>
                <ul className="list-disc list-inside space-y-1 text-foreground/70">
                    <li><strong className="text-foreground">Restore</strong> — 1 credit per photo (colour enhancement or B&amp;W clean-up)</li>
                    <li><strong className="text-foreground">AI Repair</strong> — 4 credits per photo (damage repair via Gemini)</li>
                    <li><strong className="text-foreground">AI Remaster</strong> — 4 credits per photo (3 credits if Repair was already done)</li>
                </ul>
                <p className="mt-3 text-foreground/70 text-sm leading-relaxed">
                    <strong className="text-foreground">Running low?</strong> If your balance falls below the free-credit
                    threshold, simply log in once per day to claim a bonus credit — up to the threshold. No purchase required.
                </p>
                <p className="mt-2 text-foreground/60 text-xs font-mono">
                    Credits are refunded automatically if processing fails for any reason.
                </p>
            </>
        ),
    },
    {
        id: "resolution",
        q: "Will AI Repair or Remaster change my photo's resolution?",
        a: (
            <p>
                Yes — AI Repair and Remaster are powered by Gemini&apos;s image generation model,
                which may output images at a different resolution than the original (typically
                around 800–1400 px on the longest side). The Restore step always preserves
                your original resolution. You can download both the Restored and AI-processed
                versions from your dashboard.
            </p>
        ),
    },
    {
        id: "ai-models",
        q: "What AI models power Repair and Remaster?",
        a: (
            <>
                <p className="mb-2">
                    Both AI Repair and AI Remaster use a two-phase pipeline powered by Google Gemini:
                </p>
                <ul className="list-disc list-inside space-y-1 text-foreground/70">
                    <li><strong className="text-foreground">Analysis</strong> — <code className="text-xs bg-foreground/10 px-1 py-0.5 rounded">gemini-3-flash-preview</code> evaluates the photo&apos;s damage, colours, and context.</li>
                    <li><strong className="text-foreground">Generation</strong> — <code className="text-xs bg-foreground/10 px-1 py-0.5 rounded">gemini-3-pro-image-preview</code> produces the restored or remastered output.</li>
                </ul>
                <p className="mt-2 text-foreground/60 text-xs font-mono">
                    The basic Restore step uses local OpenCV processing — no AI model is involved.
                </p>
            </>
        ),
    },
    {
        id: "concierge",
        q: "What is the Concierge Service?",
        a: (
            <p>
                The Concierge Service lets you mail in physical photos for professional restoration by a real person.
                It is a great option for precious family photos, batch orders, or photos that cannot be processed
                digitally. Contact us to arrange a concierge order.
            </p>
        ),
    },
];

export default function FaqPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="border-b border-foreground/10 py-4 px-4 sm:px-6">
                <Link href="/" className="font-bold text-lg hover:opacity-70 transition-opacity">
                    ← SanBa
                </Link>
            </nav>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                <h1 className="font-syne font-bold text-3xl sm:text-5xl mb-4 leading-tight">FAQ</h1>
                <p className="text-foreground/50 font-mono text-sm mb-12">Frequently asked questions.</p>

                <div className="space-y-10">
                    {faqs.map(({ id, q, a }) => (
                        <div key={id} id={id} className="scroll-mt-8">
                            <h2 className="font-syne font-bold text-xl mb-3 text-foreground">{q}</h2>
                            <div className="text-foreground/70 text-sm leading-relaxed">{a}</div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
