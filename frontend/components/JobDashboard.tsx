"use client";
// AI Repair: button text is "Repair" in both single-file and batch views (v2 — conservative Gemini prompt)

import { useEffect, useState } from 'react';
import { RefreshCw, Download, Image as ImageIcon, Clock, Play, ChevronDown, ChevronUp, Trash2, Eye, X, Sparkles, Wand2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ComparisonSlider from './ComparisonSlider';

const AI_MODEL_DISPLAY = "Gemini 3 Pro Image Preview";

interface Job {
    id: string;
    status: string;
    created_at: string;
    source: string;
    files: string[];
    processed_files: string[];
    file_types: string[];
    ai_repaired_files: (string | null)[];
    ai_repair_status: (string | null)[];
    ai_remastered_files: (string | null)[];
    ai_remaster_status: (string | null)[];
}

export default function JobDashboard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { refreshUser } = useAuth();
    const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [failDontShowAgain, setFailDontShowAgain] = useState(false);
    const [pricing, setPricing] = useState({ restore: 1, ai_repair: 4, ai_remaster_full: 4, ai_remaster_discounted: 3, daily_credit_threshold: 3 });
    const [comparingFiles, setComparingFiles] = useState<{
        before: string; after: string;
        beforeFallback?: string; afterFallback?: string;
        label?: string;
    } | null>(null);

    const showFailurePopup = () => {
        if (typeof window !== 'undefined' && localStorage.getItem('hideFailModal') === '1') return;
        setShowFailModal(true);
    };

    const dismissFailModal = () => {
        if (failDontShowAgain && typeof window !== 'undefined') {
            localStorage.setItem('hideFailModal', '1');
        }
        setShowFailModal(false);
        setFailDontShowAgain(false);
    };

    const fetchJobs = async () => {
        try {
            const response = await api.get('/jobs/');
            const sorted = response.data.sort((a: Job, b: Job) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setJobs(sorted);
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        } finally {
            setLoading(false);
        }
    };

    const deleteJob = async (jobId: string) => {
        if (!confirm("Are you sure? This action is permanent.")) return;
        try {
            await api.delete(`/jobs/${jobId}`);
            fetchJobs();
        } catch (error) {
            console.error("Failed to delete job", error);
            alert("Failed to delete job");
        }
    };

    const startProcessing = async (jobId: string) => {
        setProcessingId(jobId);
        try {
            await api.post(`/jobs/${jobId}/process?operation=restoration_full`);
            fetchJobs();
            refreshUser();
        } catch (error: any) {
            console.error("Failed to start processing", error);
            if (error.response && error.response.status === 402) {
                setShowCreditModal(true);
            } else {
                alert("Failed to start processing");
            }
        } finally {
            setProcessingId(null);
        }
    };

    const startAiRepair = async (jobId: string, fileIndex: number) => {
        try {
            await api.post(`/jobs/${jobId}/ai_repair/${fileIndex}`);
            refreshUser();
            fetchJobs(); // immediately picks up the "pending" status set by the endpoint
        } catch (error: any) {
            console.error("AI repair failed", error);
            if (error.response?.status === 402) {
                setShowCreditModal(true);
            } else {
                showFailurePopup();
            }
        }
    };

    const startAiRemaster = async (jobId: string, fileIndex: number) => {
        try {
            await api.post(`/jobs/${jobId}/ai_remaster/${fileIndex}`);
            refreshUser();
            fetchJobs(); // immediately picks up the "pending" status set by the endpoint
        } catch (error: any) {
            console.error("AI remaster failed", error);
            if (error.response?.status === 402) {
                setShowCreditModal(true);
            } else {
                showFailurePopup();
            }
        }
    };

    const handleDownloadZip = async (jobId: string) => {
        try {
            const response = await api.get(`/jobs/${jobId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `job_${jobId}_restored.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download zip", error);
            alert("Failed to download zip");
        }
    };

    const toggleExpand = (jobId: string) => {
        const newExpanded = new Set(expandedJobs);
        if (newExpanded.has(jobId)) {
            newExpanded.delete(jobId);
        } else {
            newExpanded.add(jobId);
        }
        setExpandedJobs(newExpanded);
    };

    useEffect(() => {
        fetchJobs();
        api.get('/jobs/pricing').then(res => setPricing(res.data)).catch(() => {});
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500';
            case 'processing': return 'bg-yellow-100 text-yellow-700 border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-500';
            case 'failed': return 'bg-destructive/10 text-destructive border-destructive';
            default: return 'bg-foreground/5 text-foreground/60 border-foreground/20';
        }
    };

    const getFileUrl = (path: string) => {
        if (!path) return '';
        const relativePath = path.replace(/\\/g, '/').replace(/^uploads\//, '');
        return `/files/${relativePath}`;
    };

    const toPreviewUrl = (fileUrl: string): string => {
        const lastDot = fileUrl.lastIndexOf('.');
        if (lastDot === -1) return fileUrl;
        return fileUrl.substring(0, lastDot) + '_preview' + fileUrl.substring(lastDot);
    };

    // Render the AI Repair control for a single file slot
    const renderAiRepair = (job: Job, index: number, size: 'sm' | 'md' = 'md') => {
        const aiFile = job.ai_repaired_files?.[index];
        const aiStatus = job.ai_repair_status?.[index] ?? null;
        const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
        const thumbSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
        const btnPad = size === 'sm' ? 'p-1.5' : 'p-2';

        if (aiFile) {
            // Repair done — show gold thumbnail + Original → AI compare button
            return (
                <>
                    <a
                        href={getFileUrl(aiFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group/thumb relative block ${thumbSize} border-2 border-amber-400 overflow-hidden hover:scale-105 transition-transform`}
                        title={`View AI-Repaired (${AI_MODEL_DISPLAY})`}
                    >
                        <img src={getFileUrl(aiFile)} alt="AI Repaired" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-amber-400/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Sparkles className={`${iconSize} text-amber-300 drop-shadow-md`} />
                        </div>
                    </a>
                    <button
                        onClick={() => {
                            const origUrl = getFileUrl(job.files[index]);
                            const aiUrl = getFileUrl(aiFile);
                            setComparingFiles({
                                before: toPreviewUrl(origUrl),
                                after: toPreviewUrl(aiUrl),
                                beforeFallback: origUrl,
                                afterFallback: aiUrl,
                                label: `Original vs Repaired`,
                            });
                        }}
                        className={`${btnPad} border border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-background transition-colors`}
                        title="Review: Original vs Repaired"
                    >
                        <Eye className={iconSize} />
                    </button>
                </>
            );
        }

        if (aiStatus === "pending") {
            return (
                <div className={`flex items-center gap-2 px-2 ${btnPad} border border-amber-400/40 bg-amber-400/10 text-amber-400`}>
                    <RefreshCw className={`${iconSize} animate-spin shrink-0`} />
                    <span className="font-mono text-[10px] uppercase tracking-wide leading-tight">
                        Repairing…<br />
                        <span className="text-amber-400/50 normal-case tracking-normal">Updates in ~30s</span>
                    </span>
                </div>
            );
        }

        if (aiStatus === "content_policy") {
            return (
                <div className={`flex items-center gap-2 px-2 ${btnPad} border border-blue-400/40 bg-blue-400/10 text-blue-300`}>
                    <span className="font-mono text-[10px] leading-tight">
                        Photo declined by AI.<br />
                        <a href="/faq#repair-declined" className="underline hover:text-blue-200">Learn more</a>
                                            </span>
                    <button
                        onClick={() => startAiRepair(job.id, index)}
                        className="ml-auto shrink-0 px-2 py-0.5 border border-blue-400/40 text-blue-300 hover:bg-blue-400 hover:text-background transition-colors font-mono text-[10px] uppercase tracking-wide"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        // Not started or failed — active button (red "Retry" if previously failed)
        const isFailed = aiStatus === "failed";
        return (
            <button
                onClick={() => startAiRepair(job.id, index)}
                className={`flex items-center gap-1 px-2 ${btnPad} border text-[10px] font-mono uppercase tracking-wide transition-colors
                    ${isFailed
                        ? 'border-red-400 text-red-400 hover:bg-red-400 hover:text-background'
                        : 'border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-background'}`}
                title={`AI Repair — ${pricing.ai_repair} credits\nModel: ${AI_MODEL_DISPLAY}\nOutput resolution may differ from original`}
            >
                <Sparkles className={iconSize} />
                {isFailed ? 'Retry' : `Repair · ${pricing.ai_repair}cr`}
            </button>
        );
    };

    // Render the AI Remaster control for a single file slot
    const renderAiRemaster = (job: Job, index: number, size: 'sm' | 'md' = 'md') => {
        const remasterFile = job.ai_remastered_files?.[index];
        const remasterStatus = job.ai_remaster_status?.[index] ?? null;
        const repairDone = !!job.ai_repaired_files?.[index];
        const repairPending = job.ai_repair_status?.[index] === 'pending';
        const creditCost = repairDone ? pricing.ai_remaster_discounted : pricing.ai_remaster_full;
        const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
        const thumbSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
        const btnPad = size === 'sm' ? 'p-1.5' : 'p-2';

        if (remasterFile) {
            // Remaster done — show violet thumbnail + Original → Remastered compare button
            return (
                <>
                    <a
                        href={getFileUrl(remasterFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group/thumb relative block ${thumbSize} border-2 border-violet-400 overflow-hidden hover:scale-105 transition-transform`}
                        title={`View Remastered (${AI_MODEL_DISPLAY})`}
                    >
                        <img src={getFileUrl(remasterFile)} alt="Remastered" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-violet-400/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Wand2 className={`${iconSize} text-violet-300 drop-shadow-md`} />
                        </div>
                    </a>
                    <button
                        onClick={() => {
                            const origUrl = getFileUrl(job.files[index]);
                            const remasterUrl = getFileUrl(remasterFile);
                            setComparingFiles({
                                before: toPreviewUrl(origUrl),
                                after: toPreviewUrl(remasterUrl),
                                beforeFallback: origUrl,
                                afterFallback: remasterUrl,
                                label: `Original vs Remastered`,
                            });
                        }}
                        className={`${btnPad} border border-violet-400 text-violet-400 hover:bg-violet-400 hover:text-background transition-colors`}
                        title="Review: Original vs Remastered"
                    >
                        <Eye className={iconSize} />
                    </button>
                </>
            );
        }

        if (remasterStatus === "pending") {
            return (
                <div className={`flex items-center gap-2 px-2 ${btnPad} border border-violet-400/40 bg-violet-400/10 text-violet-400`}>
                    <RefreshCw className={`${iconSize} animate-spin shrink-0`} />
                    <span className="font-mono text-[10px] uppercase tracking-wide leading-tight">
                        Remastering…<br />
                        <span className="text-violet-400/50 normal-case tracking-normal">Updates in ~30s</span>
                    </span>
                </div>
            );
        }

        if (remasterStatus === "content_policy") {
            return (
                <div className={`flex items-center gap-2 px-2 ${btnPad} border border-blue-400/40 bg-blue-400/10 text-blue-300`}>
                    <span className="font-mono text-[10px] leading-tight">
                        Photo declined by AI.<br />
                        <a href="/faq#repair-declined" className="underline hover:text-blue-200">Learn more</a>
                                            </span>
                    <button
                        onClick={() => startAiRemaster(job.id, index)}
                        className="ml-auto shrink-0 px-2 py-0.5 border border-blue-400/40 text-blue-300 hover:bg-blue-400 hover:text-background transition-colors font-mono text-[10px] uppercase tracking-wide"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        // Blocked while repair is running — grey out with reason
        if (repairPending) {
            return (
                <button
                    disabled
                    className={`flex items-center gap-1 px-2 ${btnPad} border text-[10px] font-mono uppercase tracking-wide border-foreground/20 text-foreground/30 cursor-not-allowed`}
                    title="Waiting for Repair to complete first"
                >
                    <Wand2 className={iconSize} />
                    Remaster
                </button>
            );
        }

        // Not started or failed — active button (red "Retry" if previously failed)
        const isFailed = remasterStatus === "failed";
        return (
            <button
                onClick={() => startAiRemaster(job.id, index)}
                className={`flex items-center gap-1 px-2 ${btnPad} border text-[10px] font-mono uppercase tracking-wide transition-colors
                    ${isFailed
                        ? 'border-red-400 text-red-400 hover:bg-red-400 hover:text-background'
                        : 'border-violet-400 text-violet-400 hover:bg-violet-400 hover:text-background'}`}
                title={`AI Remaster — ${creditCost} credits${repairDone ? ' (1 credit discount applied — Repair already done)' : ''}\nModel: ${AI_MODEL_DISPLAY}\nOutput resolution may differ from original`}
            >
                <Wand2 className={iconSize} />
                {isFailed ? 'Retry' : `Remaster · ${creditCost}cr`}
            </button>
        );
    };

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
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-6">
                {jobs.map((job) => (
                    <div
                        key={job.id}
                        className="relative bg-background border-2 border-foreground p-6 brutalist-shadow group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                {job.files.length > 1 ? (
                                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                                        {job.files[2] && (
                                            <div className="absolute top-[8px] left-[8px] w-16 h-16 sm:w-20 sm:h-20 border border-foreground bg-foreground/5 overflow-hidden opacity-30">
                                                <img src={getFileUrl(job.files[2])} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        {job.files[1] && (
                                            <div className="absolute top-[4px] left-[4px] w-16 h-16 sm:w-20 sm:h-20 border border-foreground bg-foreground/5 overflow-hidden opacity-60">
                                                <img src={getFileUrl(job.files[1])} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="absolute top-0 left-0 w-16 h-16 sm:w-20 sm:h-20 border border-foreground bg-foreground/5 overflow-hidden">
                                            <img src={getFileUrl(job.files[0])} className="w-full h-full object-cover opacity-80" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-foreground bg-foreground/5 flex items-center justify-center overflow-hidden">
                                        {job.files.length > 0 ? (
                                            <img src={getFileUrl(job.files[0])} alt="Thumbnail" className="w-full h-full object-cover opacity-80" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-foreground/20" />
                                        )}
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono font-bold text-lg">Job #{job.id.slice(0, 8)}</span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 border ${getStatusColor(job.status)}`}>
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="font-mono text-xs text-foreground/40 uppercase tracking-widest">
                                        {new Date(job.created_at).toLocaleString()}
                                    </p>
                                    <p className="font-mono text-xs text-foreground/60 mt-1">
                                        {job.files.length} FILE(S) • {job.source}
                                    </p>
                                    {job.files.length === 1 && job.files[0] && (
                                        <p className="font-mono text-xs text-foreground/40 mt-0.5 truncate max-w-[180px] sm:max-w-[260px]">
                                            {job.files[0].split(/[/\\]/).pop()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 flex-wrap">
                                {job.status === 'queued' && (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => startProcessing(job.id)}
                                            disabled={processingId === job.id}
                                            className="flex items-center gap-2 px-6 py-2 bg-foreground text-background hover:bg-primary transition-colors font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={`Costs ${job.files.length} Credit${job.files.length > 1 ? 's' : ''}`}
                                        >
                                            {processingId === job.id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                            Restore
                                        </button>
                                    </div>
                                )}

                                {job.status === 'queued' && (
                                    <button
                                        onClick={() => deleteJob(job.id)}
                                        disabled={processingId === job.id}
                                        className="p-2 text-foreground/40 hover:text-destructive transition-colors"
                                        title="Delete Job"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}

                                {job.status === 'completed' && job.files.length > 1 ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => handleDownloadZip(job.id)}
                                            className="flex items-center gap-2 px-4 py-2 bg-background border border-foreground hover:bg-foreground hover:text-background text-xs font-mono uppercase tracking-widest transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden sm:inline">Download</span> ZIP
                                        </button>
                                        <div
                                            className="relative w-16 h-16 cursor-pointer group/stack mt-1"
                                            onClick={() => toggleExpand(job.id)}
                                            title={expandedJobs.has(job.id) ? 'Hide files' : `Show all ${job.files.length} files`}
                                        >
                                            {(job.processed_files?.[2] ?? job.files[2]) && (
                                                <div className="absolute top-[7px] left-[7px] w-12 h-12 border border-foreground bg-foreground/5 overflow-hidden opacity-30">
                                                    <img src={getFileUrl(job.processed_files?.[2] ?? job.files[2])} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            {(job.processed_files?.[1] ?? job.files[1]) && (
                                                <div className="absolute top-[3px] left-[3px] w-12 h-12 border border-foreground bg-foreground/5 overflow-hidden opacity-60">
                                                    <img src={getFileUrl(job.processed_files?.[1] ?? job.files[1])} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="absolute top-0 left-0 w-12 h-12 border border-foreground bg-foreground/5 overflow-hidden group-hover/stack:border-primary transition-colors">
                                                <img src={getFileUrl(job.processed_files?.[0] ?? job.files[0])} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    </div>
                                ) : job.status === 'completed' && (
                                    <button
                                        onClick={() => handleDownloadZip(job.id)}
                                        className="flex items-center gap-2 px-4 py-2 bg-background border border-foreground hover:bg-foreground hover:text-background text-xs font-mono uppercase tracking-widest transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">Download</span> ZIP
                                    </button>
                                )}

                                {/* Single-file completed job — thumbnails + actions (no repeated original, it's on the left) */}
                                {job.status === 'completed' && job.files.length === 1 && !expandedJobs.has(job.id) && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {job.processed_files?.[0] && (
                                            <a
                                                href={getFileUrl(job.processed_files[0])}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group/thumb relative block w-12 h-12 border border-foreground overflow-hidden hover:scale-105 transition-transform"
                                                title="View Restored"
                                            >
                                                <img src={getFileUrl(job.processed_files[0])} alt="Restored" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-primary/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                                    <Download className="w-4 h-4 text-white drop-shadow-md" />
                                                </div>
                                            </a>
                                        )}
                                        {job.processed_files?.[0] && (
                                            <button
                                                onClick={() => {
                                                    const beforeUrl = getFileUrl(job.files[0]);
                                                    const afterUrl = getFileUrl(job.processed_files[0]);
                                                    setComparingFiles({
                                                        before: toPreviewUrl(beforeUrl),
                                                        after: toPreviewUrl(afterUrl),
                                                        beforeFallback: beforeUrl,
                                                        afterFallback: afterUrl,
                                                        label: 'Original vs Restored',
                                                    });
                                                }}
                                                className="p-2 bg-background border border-foreground hover:bg-foreground hover:text-background transition-colors"
                                                title="Review: Original vs Restored"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        )}
                                        {/* AI Repair + Remaster */}
                                        {job.processed_files?.[0] && renderAiRepair(job, 0, 'md')}
                                        {job.processed_files?.[0] && renderAiRemaster(job, 0, 'md')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {job.status === 'processing' && (
                            <div className="mt-4 flex items-center gap-3 px-4 py-3 border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
                                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                <div>
                                    <p className="font-mono text-xs font-bold uppercase tracking-widest">Restoration in progress</p>
                                    <p className="font-mono text-[10px] text-yellow-400/60 mt-0.5">This page updates automatically every 5 seconds.</p>
                                </div>
                            </div>
                        )}

                        {job.status === 'completed' &&
                            (job.ai_repair_status?.some(s => s === 'pending') ||
                             job.ai_remaster_status?.some(s => s === 'pending')) && (() => {
                            const repairPending = job.ai_repair_status?.some(s => s === 'pending');
                            const remasterPending = job.ai_remaster_status?.some(s => s === 'pending');
                            const isRemaster = remasterPending && !repairPending;
                            return (
                                <div className={`mt-4 flex items-center gap-3 px-4 py-3 border ${isRemaster ? 'border-violet-500/30 bg-violet-500/10 text-violet-400/80' : 'border-amber-500/30 bg-amber-500/10 text-amber-400/80'}`}>
                                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                    <div>
                                        <p className="font-mono text-xs font-bold uppercase tracking-widest">
                                            {isRemaster ? 'Remastering in progress' : repairPending ? 'Repairing in progress' : 'AI operation in progress'}
                                        </p>
                                        <p className={`font-mono text-[10px] mt-0.5 ${isRemaster ? 'text-violet-400/50' : 'text-amber-400/50'}`}>Results will appear automatically when complete.</p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Collapsible Batch View */}
                        {job.files.length > 1 && (
                            <div className="mt-6 border-t border-foreground/10 pt-4">
                                <button
                                    onClick={() => toggleExpand(job.id)}
                                    className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors ml-auto"
                                >
                                    {expandedJobs.has(job.id) ? (
                                        <>
                                            <ChevronUp className="w-4 h-4" />
                                            Hide files
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4" />
                                            Show all {job.files.length} files
                                        </>
                                    )}
                                </button>

                                {expandedJobs.has(job.id) && (
                                    <div className="mt-4 space-y-3 pl-6 border-l-2 border-dashed border-foreground/20">
                                        {job.files.map((file: string, index: number) => {
                                            const processed = job.processed_files ? job.processed_files[index] : null;
                                            return (
                                                <div key={index} className="flex items-center gap-3 bg-foreground/5 p-3 border border-foreground/5">
                                                    {/* Filename — left side */}
                                                    <span className="text-xs font-mono truncate text-foreground/50 flex-1 min-w-0">
                                                        {file.split(/[/\\]/).pop()}
                                                    </span>

                                                    {/* Thumbnails + actions — right side */}
                                                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                                        {/* Original — larger */}
                                                        <a
                                                            href={getFileUrl(file)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group/thumb relative block w-14 h-14 shrink-0 border border-foreground/30 overflow-hidden hover:scale-105 transition-transform"
                                                            title="View Original"
                                                        >
                                                            <img src={getFileUrl(file)} className="w-full h-full object-cover" />
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center">
                                                                <span className="text-[7px] text-white/70 font-mono uppercase tracking-widest">Orig</span>
                                                            </div>
                                                        </a>

                                                        {/* Vertical separator */}
                                                        {processed && (
                                                            <div className="w-px self-stretch bg-foreground/15 shrink-0 mx-1" />
                                                        )}

                                                        {/* Restored + AI actions */}
                                                        {processed && (
                                                            <>
                                                                <a
                                                                    href={getFileUrl(processed)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="relative block w-10 h-10 border border-green-500/50 hover:border-green-600 transition-colors overflow-hidden shrink-0"
                                                                    title="View Restored"
                                                                >
                                                                    <img src={getFileUrl(processed)} className="w-full h-full object-cover" />
                                                                </a>
                                                                <button
                                                                    onClick={() => {
                                                                        const beforeUrl = getFileUrl(file);
                                                                        const afterUrl = getFileUrl(processed);
                                                                        setComparingFiles({
                                                                            before: toPreviewUrl(beforeUrl),
                                                                            after: toPreviewUrl(afterUrl),
                                                                            beforeFallback: beforeUrl,
                                                                            afterFallback: afterUrl,
                                                                            label: 'Original vs Restored',
                                                                        });
                                                                    }}
                                                                    className="p-1.5 border border-foreground/20 hover:bg-foreground hover:text-background transition-colors"
                                                                    title="Review: Original vs Restored"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                                {renderAiRepair(job, index, 'sm')}
                                                                {renderAiRemaster(job, index, 'sm')}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {jobs.length === 0 && !loading && (
                    <div className="text-center py-24 border-2 border-dashed border-foreground/20">
                        <p className="font-syne text-xl text-foreground/40">Nothing in the archives yet.</p>
                        <p className="font-mono text-xs text-foreground/40 uppercase mt-2">Upload a photo to begin.</p>
                    </div>
                )}
            </div>

            {/* Comparison Modal */}
            {comparingFiles && (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/90 backdrop-blur-md p-4"
                    onClick={() => setComparingFiles(null)}
                >
                    <button
                        onClick={() => setComparingFiles(null)}
                        className="fixed top-4 right-4 z-[110] p-2 bg-black/60 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    <div
                        className="w-full max-w-4xl flex flex-col gap-4 my-auto py-12"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-syne font-bold text-xl flex items-center gap-2 text-white">
                            <Eye className="w-5 h-5 text-white/60" />
                            {comparingFiles.label ?? 'Comparison View'}
                        </h3>
                        <div className="border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                            <ComparisonSlider
                                before={comparingFiles.before}
                                after={comparingFiles.after}
                                beforeFallback={comparingFiles.beforeFallback}
                                afterFallback={comparingFiles.afterFallback}
                                maxHeightVh={72}
                            />
                        </div>
                        <p className="text-center text-xs font-mono text-white/40 uppercase tracking-widest">Drag slider to compare</p>
                    </div>
                </div>
            )}

            {/* AI Failure Modal */}
            {showFailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
                    <div className="bg-background border-2 border-foreground p-10 max-w-sm w-full text-center shadow-[8px_8px_0px_rgba(0,0,0,1)]">
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
                    </div>
                </div>
            )}

            {/* Credit Modal */}
            {showCreditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
                    <div className="bg-background border-2 border-foreground p-12 max-w-md w-full text-center shadow-[8px_8px_0px_rgba(0,0,0,1)]">
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
                    </div>
                </div>
            )}
        </div>
    );
}
