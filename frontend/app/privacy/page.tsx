import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
    title: "Privacy & Photo Retention — SanBa",
    description: "How SanBa stores, protects, and automatically deletes your photos.",
};

const sections = [
    {
        title: "What we store",
        body: (
            <>
                <p className="mb-3">
                    When you upload a photo, we store the original file and every processed version
                    (restored, repaired, remastered) on our server so you can download and compare them.
                </p>
                <p>
                    We also keep your account email, an activity log of your jobs and credit usage,
                    and payment records. Card details are handled entirely by Stripe — they never touch our servers.
                </p>
            </>
        ),
    },
    {
        title: "Automatic deletion after 90 days",
        body: (
            <>
                <p className="mb-3">
                    Your photos are <strong className="text-foreground">automatically and permanently deleted 90 days after upload</strong> —
                    originals, processed versions, and the job record itself.
                </p>
                <p className="mb-3">
                    We email you a reminder about 7 days before deletion so you can download anything
                    you want to keep.
                </p>
                <p className="text-foreground/60 text-xs font-mono">
                    Exception: photos you have created a public share link for are kept so the shared
                    page keeps working. Delete the job to remove them at any time.
                </p>
            </>
        ),
    },
    {
        title: "Delete anytime",
        body: (
            <p>
                You can delete any job — and all its photos — from your dashboard at any moment using
                the trash button on the job card. Deletion is immediate and permanent.
            </p>
        ),
    },
    {
        title: "AI processing",
        body: (
            <p>
                AI Repair and Remaster send your photo to Google Gemini for processing. Photos declined
                by the provider&apos;s content policy are not charged. The basic Restore step runs entirely
                on our own server.
            </p>
        ),
    },
    {
        title: "Questions",
        body: (
            <p>
                Message us on{" "}
                <a
                    href="https://wa.me/60166016074"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                >
                    WhatsApp
                </a>{" "}
                — we&apos;re a small team in Penang and reply quickly.
            </p>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-secondary selection:text-primary-foreground">
            <SiteNav />

            <main className="relative z-10 container mx-auto px-4 pt-28 sm:pt-32 pb-32 max-w-3xl">
                <PageHeader
                    title={<>Your<br />photos.</>}
                    subtitle="What we store, how long we keep it, and how to remove it."
                />

                <div className="space-y-6">
                    {sections.map(({ title, body }) => (
                        <div key={title} className="border-2 border-foreground bg-background p-5 sm:p-8 brutalist-shadow">
                            <h2 className="font-syne font-bold text-xl mb-3 text-foreground">{title}</h2>
                            <div className="text-foreground/70 text-sm leading-relaxed">{body}</div>
                        </div>
                    ))}
                </div>

                <p className="font-mono text-xs text-foreground/40 mt-12 text-center">
                    See also the <Link href="/faq" className="underline hover:text-primary">FAQ</Link> and{" "}
                    <Link href="/terms" className="underline hover:text-primary">Terms of Use</Link>.
                </p>
            </main>
        </div>
    );
}
