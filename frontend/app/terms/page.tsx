import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Use — SanBa Photo Restoration",
    description: "Terms of use for SanBa photo restoration service.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="border-b border-foreground/10 py-4 px-4 sm:px-6">
                <Link href="/" className="font-bold text-lg hover:opacity-70 transition-opacity">
                    ← SanBa
                </Link>
            </nav>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
                <h1 className="font-syne font-bold text-3xl sm:text-5xl mb-4 leading-tight">Terms of Use</h1>
                <p className="text-foreground/50 font-mono text-sm mb-12">Last updated: April 2026</p>

                <div className="space-y-10 text-foreground/70 text-sm leading-relaxed">
                    <section>
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">1. Your Content</h2>
                        <p>
                            You retain ownership of any photos you upload to SanBa. By uploading, you confirm that you
                            have the right to use and process these images. You are solely responsible for the content
                            you upload — do not upload images that are illegal, infringe on others&apos; rights, or
                            contain prohibited material.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">2. AI Processing</h2>
                        <p>
                            SanBa uses AI models (including Google Gemini) to restore, repair, and remaster photos.
                            AI-generated results may contain imperfections — including altered details, colour
                            inaccuracies, resolution differences, or unintended changes to the original image. SanBa
                            does not guarantee the accuracy or quality of AI output. Some images may be declined by the
                            AI provider&apos;s content policies, which is outside our control.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">3. Data Handling</h2>
                        <p>
                            Uploaded photos are stored on our servers for processing and download. Files are subject to
                            automatic cleanup after a retention period. We will not sell, share, or use your photos for
                            any purpose other than providing the restoration service to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">4. Credits &amp; Refunds</h2>
                        <p>
                            Credits are consumed when you initiate processing operations. Purchased credits are
                            non-refundable. If processing fails or an image is declined by AI content policies,
                            credits are automatically refunded to your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">5. Limitation of Liability</h2>
                        <p>
                            SanBa is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied.
                            We are not liable for any loss or damage arising from AI output quality, content policy
                            decisions, service interruptions, or data loss. Use the service at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-syne font-bold text-xl mb-3 text-foreground">6. Changes to Terms</h2>
                        <p>
                            We may update these terms from time to time. Continued use of SanBa after changes are
                            posted constitutes acceptance of the revised terms.
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-foreground/10">
                    <Link href="/login" className="font-mono text-xs uppercase tracking-widest hover:underline">
                        ← Back to Sign In
                    </Link>
                </div>
            </main>
        </div>
    );
}
