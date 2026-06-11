"use client";

import { useEffect, useState } from 'react';
import { X, Eye, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import ComparisonSlider from '../ComparisonSlider';
import { ComparisonStep } from './helpers';

interface CompareModalProps {
    step: ComparisonStep;
    slideshow: { index: number; total: number } | null;
    onNav: (delta: number) => void;
    onClose: () => void;
}

export function CompareModal({ step, slideshow, onNav, onClose }: CompareModalProps) {
    const [shareStatus, setShareStatus] = useState<'idle' | 'copying' | 'copied'>('idle');

    // Reset share state whenever the displayed comparison changes
    useEffect(() => setShareStatus('idle'), [step]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (slideshow && e.key === 'ArrowLeft') onNav(-1);
            else if (slideshow && e.key === 'ArrowRight') onNav(1);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [slideshow, onNav, onClose]);

    const handleShare = async () => {
        if (shareStatus !== 'idle') return;
        setShareStatus('copying');
        try {
            const res = await api.post('/shares/', {
                job_id: step.jobId,
                file_index: step.fileIndex,
                comparison_type: step.comparisonType,
            });
            await navigator.clipboard.writeText(res.data.url);
            setShareStatus('copied');
            setTimeout(() => setShareStatus('idle'), 2000);
        } catch (err) {
            console.error('Share failed', err);
            setShareStatus('idle');
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={step.label ?? 'Comparison view'}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                aria-label="Close comparison"
                className="fixed top-4 right-4 z-[110] p-2 bg-black/60 hover:bg-white/20 rounded-full transition-colors"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            <div
                className="w-full max-w-4xl flex flex-col gap-4 my-auto py-12"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-syne font-bold text-xl flex items-center gap-2 text-white truncate">
                            <Eye className="w-5 h-5 text-white/60 shrink-0" />
                            <span className="truncate">{step.label ?? 'Comparison View'}</span>
                        </h3>
                        {slideshow && (
                            <span className="font-mono text-sm text-white/50 shrink-0">
                                {slideshow.index + 1}/{slideshow.total}
                            </span>
                        )}
                    </div>
                    {step.comparisonType && (
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-colors text-xs font-mono uppercase tracking-widest rounded shrink-0 ml-2"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            {shareStatus === 'copied' ? 'Link Copied!' : shareStatus === 'copying' ? 'Copying...' : 'Share'}
                        </button>
                    )}
                </div>
                <div className="relative group/nav">
                    {slideshow && slideshow.index > 0 && (
                        <button
                            onClick={() => onNav(-1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-white/20 rounded-full transition-colors"
                            title="Previous (← arrow key)"
                            aria-label="Previous comparison"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                    )}
                    <div className="border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                        <ComparisonSlider
                            key={slideshow ? slideshow.index : 'single'}
                            before={step.before}
                            after={step.after}
                            beforeFallback={step.beforeFallback}
                            afterFallback={step.afterFallback}
                            beforeLabel={step.beforeLabel}
                            afterLabel={step.afterLabel}
                            maxHeightVh={72}
                            modelBadge={step.modelBadge}
                        />
                    </div>
                    {slideshow && slideshow.index < slideshow.total - 1 && (
                        <button
                            onClick={() => onNav(1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-white/20 rounded-full transition-colors"
                            title="Next (→ arrow key)"
                            aria-label="Next comparison"
                        >
                            <ChevronRight className="w-6 h-6 text-white" />
                        </button>
                    )}
                </div>
                <p className="text-center text-xs font-mono text-white/40 uppercase tracking-widest">
                    {slideshow ? 'Use ← → arrow keys or click arrows to navigate' : 'Drag slider to compare'}
                </p>
            </div>
        </div>
    );
}
