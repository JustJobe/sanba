"use client";

import { useCallback, useState } from 'react';
import { RefreshCw, Clock, ChevronDown } from 'lucide-react';
import { useJobs } from './jobs/useJobs';
import { JobCard } from './jobs/JobCard';
import { CompareModal } from './jobs/CompareModal';
import { Job, ComparisonStep, buildSlideshowSteps } from './jobs/helpers';
import { Modal } from './ui/Modal';

export default function JobDashboard() {
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [failDontShowAgain, setFailDontShowAgain] = useState(false);
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
    const [highlightJobId, setHighlightJobId] = useState<string | null>(null);

    // Comparison modal + slideshow state
    const [comparingFiles, setComparingFiles] = useState<ComparisonStep | null>(null);
    const [slideshowSteps, setSlideshowSteps] = useState<ComparisonStep[] | null>(null);
    const [slideshowIndex, setSlideshowIndex] = useState(0);

    const showFailurePopup = () => {
        if (typeof window !== 'undefined' && localStorage.getItem('hideFailModal') === '1') return;
        setShowFailModal(true);
    };

    const {
        jobs, loading, hasMore, loadMore, fetchJobs, pricing, processingId,
        getAiModel, setAiModel,
        startProcessing, startAiRepair, startAiRepairAll, startAiRemaster,
        deleteJob, duplicateJob, downloadZip,
    } = useJobs({
        onInsufficientCredits: () => setShowCreditModal(true),
        onAiFailure: showFailurePopup,
    });

    const dismissFailModal = () => {
        if (failDontShowAgain && typeof window !== 'undefined') {
            localStorage.setItem('hideFailModal', '1');
        }
        setShowFailModal(false);
        setFailDontShowAgain(false);
    };

    const toggleExpand = (jobId: string) => {
        setExpandedJobs(prev => {
            const next = new Set(prev);
            if (next.has(jobId)) next.delete(jobId);
            else next.add(jobId);
            return next;
        });
    };

    const handleDuplicate = async (jobId: string, fileIndex: number) => {
        const newJobId = await duplicateJob(jobId, fileIndex);
        if (newJobId) {
            setHighlightJobId(newJobId);
            setTimeout(() => {
                const el = document.getElementById(`job-${newJobId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            setTimeout(() => setHighlightJobId(null), 2000);
        }
    };

    const startSlideshow = (job: Job) => {
        const steps = buildSlideshowSteps(job, pricing);
        if (steps.length === 0) return;
        setSlideshowSteps(steps);
        setSlideshowIndex(0);
        setComparingFiles(steps[0]);
    };

    const slideshowGo = useCallback((delta: number) => {
        setSlideshowSteps(prev => {
            if (!prev) return prev;
            setSlideshowIndex(idx => {
                const next = idx + delta;
                if (next < 0 || next >= prev.length) return idx;
                setComparingFiles(prev[next]);
                return next;
            });
            return prev;
        });
    }, []);

    const closeCompareModal = useCallback(() => {
        setSlideshowSteps(null);
        setSlideshowIndex(0);
        setComparingFiles(null);
    }, []);

    return (
        <div className="w-full mt-12 mb-24">
            <div className="flex items-center justify-between mb-8 border-b-2 border-foreground pb-4">
                <h2 className="font-syne font-bold text-3xl text-foreground flex items-center gap-3">
                    <Clock className="w-8 h-8" />
                    Archive
                </h2>
                <button
                    onClick={fetchJobs}
                    className="p-3 bg-background border border-foreground hover:bg-foreground hover:text-background transition-colors brutalist-shadow"
                    aria-label="Refresh job list"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-6">
                {jobs.map((job, jobIdx) => (
                    <div key={job.id}>
                        {job.is_sample && (
                            <div className="flex items-center gap-3 mb-4">
                                {jobIdx > 0 && <div className="flex-1 border-t border-foreground/15" />}
                                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/30">sample</span>
                                <div className="flex-1 border-t border-foreground/15" />
                            </div>
                        )}
                        <JobCard
                            job={job}
                            pricing={pricing}
                            aiModel={getAiModel(job.id)}
                            onSetModel={(m) => setAiModel(job.id, m)}
                            expanded={expandedJobs.has(job.id)}
                            onToggleExpand={() => toggleExpand(job.id)}
                            highlighted={highlightJobId === job.id}
                            processing={processingId === job.id}
                            onRestore={() => startProcessing(job.id)}
                            onDelete={() => deleteJob(job.id)}
                            onRepair={(i) => startAiRepair(job.id, i)}
                            onRepairAll={() => startAiRepairAll(job)}
                            onRemaster={(i) => startAiRemaster(job.id, i)}
                            onDuplicate={(i) => handleDuplicate(job.id, i)}
                            onDownloadZip={() => downloadZip(job.id)}
                            onCompare={setComparingFiles}
                            onSlideshow={() => startSlideshow(job)}
                        />
                    </div>
                ))}

                {hasMore && (
                    <button
                        onClick={loadMore}
                        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-foreground/30 text-foreground/60 hover:border-foreground hover:text-foreground font-mono text-xs uppercase tracking-widest transition-colors"
                    >
                        <ChevronDown className="w-4 h-4" />
                        Load older jobs
                    </button>
                )}

                {jobs.length === 0 && !loading && (
                    <div className="text-center py-24 border-2 border-dashed border-foreground/20">
                        <p className="font-syne text-xl text-foreground/40">Nothing in the archives yet.</p>
                        <p className="font-mono text-xs text-foreground/40 uppercase mt-2">Upload a photo to begin.</p>
                    </div>
                )}
            </div>

            {/* Comparison Modal */}
            {comparingFiles && (
                <CompareModal
                    step={comparingFiles}
                    slideshow={slideshowSteps ? { index: slideshowIndex, total: slideshowSteps.length } : null}
                    onNav={slideshowGo}
                    onClose={closeCompareModal}
                />
            )}

            {/* AI Failure Modal */}
            <Modal open={showFailModal} onClose={dismissFailModal} label="AI processing failed" className="p-10 max-w-sm">
                <h3 className="font-syne font-bold text-2xl mb-3 text-foreground">Processing Hiccup</h3>
                <p className="font-mono text-xs text-foreground/60 mb-6 leading-relaxed">
                    AI models occasionally fail due to high demand. No credits were charged — simply hit Retry when ready.
                </p>
                <label className="flex items-center justify-center gap-2 cursor-pointer mb-6">
                    <input
                        type="checkbox"
                        checked={failDontShowAgain}
                        onChange={(e) => setFailDontShowAgain(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-foreground/40 uppercase tracking-widest">{"Don't show this again"}</span>
                </label>
                <button
                    onClick={dismissFailModal}
                    className="w-full py-3 bg-foreground text-background hover:bg-primary font-mono text-xs uppercase tracking-widest transition-colors"
                >
                    Got it
                </button>
            </Modal>

            {/* Credit Modal */}
            <Modal open={showCreditModal} onClose={() => setShowCreditModal(false)} label="Out of credits" className="p-12 max-w-md">
                <div className="w-20 h-20 bg-destructive/10 border border-destructive flex items-center justify-center mx-auto mb-8 rounded-full">
                    <Clock className="w-10 h-10 text-destructive" />
                </div>

                <h3 className="font-syne font-bold text-3xl mb-4 text-foreground">Out of Credits</h3>
                <p className="font-mono text-sm text-foreground/60 mb-8 leading-relaxed">
                    You've used all your free credits for today. Credits replenish daily, or you can top up immediately.
                </p>

                <div className="flex flex-col gap-4">
                    <a
                        href="/store"
                        className="w-full py-4 bg-foreground text-background hover:bg-primary font-bold font-syne uppercase tracking-wider transition-colors"
                    >
                        Get More Credits
                    </a>
                    <button
                        onClick={() => setShowCreditModal(false)}
                        className="w-full py-4 bg-transparent border border-foreground hover:bg-foreground/5 font-mono text-xs uppercase tracking-widest transition-colors text-foreground"
                    >
                        I'll Wait for Tomorrow
                    </button>
                </div>
            </Modal>
        </div>
    );
}
