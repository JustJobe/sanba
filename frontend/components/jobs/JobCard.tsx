"use client";

import { RefreshCw, Download, Image as ImageIcon, Play, ChevronDown, ChevronUp, Trash2, Eye, Sparkles, Wand2, Copy } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import {
    Job, Pricing, ComparisonStep,
    getFileUrl, toPreviewUrl, formatJobDate, jobTitle, getModelDisplay,
    modelShort, repairEligibleIndexes, countComparisons, PreviewImg,
} from './helpers';

interface JobCardProps {
    job: Job;
    pricing: Pricing;
    aiModel: string;
    onSetModel: (model: string) => void;
    expanded: boolean;
    onToggleExpand: () => void;
    highlighted: boolean;
    processing: boolean;
    onRestore: () => void;
    onDelete: () => void;
    onRepair: (fileIndex: number) => void;
    onRepairAll: () => void;
    onRemaster: (fileIndex: number) => void;
    onDuplicate: (fileIndex: number) => void;
    onDownloadZip: () => void;
    onCompare: (step: ComparisonStep) => void;
    onSlideshow: () => void;
}

export function JobCard({
    job, pricing, aiModel, onSetModel, expanded, onToggleExpand, highlighted, processing,
    onRestore, onDelete, onRepair, onRepairAll, onRemaster, onDuplicate, onDownloadZip, onCompare, onSlideshow,
}: JobCardProps) {

    const compareRestored = (index: number) => {
        const beforeUrl = getFileUrl(job.files[index]);
        const afterUrl = getFileUrl(job.processed_files[index]);
        onCompare({
            before: toPreviewUrl(beforeUrl),
            after: toPreviewUrl(afterUrl),
            beforeFallback: beforeUrl,
            afterFallback: afterUrl,
            label: 'Original vs Restored',
            beforeLabel: 'Original',
            afterLabel: 'Restored (Sanba Restore)',
            jobId: job.id, fileIndex: index, comparisonType: 'restored',
        });
    };

    const modelSelect = (
        pricing.models && Object.keys(pricing.models).length > 1 ? (
            <select
                value={aiModel}
                onChange={e => onSetModel(e.target.value)}
                className="bg-background border border-foreground/40 text-foreground font-mono text-[10px] uppercase tracking-wide px-2 py-2 cursor-pointer focus:outline-none"
                title="Select AI quality tier for Repair & Remaster"
                aria-label="AI quality tier"
            >
                {Object.entries(pricing.models).map(([id, m]) => (
                    <option key={id} value={id}>{m.display_name}</option>
                ))}
            </select>
        ) : null
    );

    const zipButton = (
        <button
            onClick={onDownloadZip}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-foreground hover:bg-foreground hover:text-background text-xs font-mono uppercase tracking-widest transition-colors"
        >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span> ZIP
        </button>
    );

    const repairEligible = repairEligibleIndexes(job);
    const repairAllCost = (pricing.models?.[aiModel]?.ai_repair ?? pricing.ai_repair) * repairEligible.length;

    // ── AI Repair control for a single file slot ──
    const renderAiRepair = (index: number, size: 'sm' | 'md' = 'md') => {
        const aiFile = job.ai_repaired_files?.[index];
        const aiStatus = job.ai_repair_status?.[index] ?? null;
        const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
        const thumbSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
        const btnPad = size === 'sm' ? 'p-1.5' : 'p-2';

        if (aiFile) {
            return (
                <>
                    <a
                        href={getFileUrl(aiFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group/thumb relative block ${thumbSize} border-2 border-amber-400 overflow-hidden hover:scale-105 transition-transform`}
                        title={`View AI-Repaired (${getModelDisplay(pricing, job.ai_repair_models?.[index])})`}
                    >
                        <PreviewImg src={getFileUrl(aiFile)} alt="AI Repaired" />
                        <div className="absolute inset-0 flex items-center justify-center bg-amber-400/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Sparkles className={`${iconSize} text-amber-300 drop-shadow-md`} />
                        </div>
                    </a>
                    <div className="flex flex-col items-center">
                        <button
                            onClick={() => {
                                const origUrl = getFileUrl(job.files[index]);
                                const aiUrl = getFileUrl(aiFile);
                                const repairModel = job.ai_repair_models?.[index];
                                onCompare({
                                    before: toPreviewUrl(origUrl),
                                    after: toPreviewUrl(aiUrl),
                                    beforeFallback: origUrl,
                                    afterFallback: aiUrl,
                                    label: `Original vs Repaired`,
                                    modelBadge: repairModel ? modelShort[repairModel] || repairModel : undefined,
                                    beforeLabel: 'Original',
                                    afterLabel: `Repaired\n(${getModelDisplay(pricing, repairModel)})`,
                                    jobId: job.id, fileIndex: index, comparisonType: 'repaired',
                                });
                            }}
                            className={`${btnPad} border border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-background transition-colors`}
                            title="Review: Original vs Repaired"
                            aria-label="Compare original with repaired"
                        >
                            <Eye className={iconSize} />
                        </button>
                        {job.ai_repair_models?.[index] && (
                            <span className="font-mono text-[8px] font-bold text-amber-400/70 uppercase tracking-wider mt-0.5">
                                {modelShort[job.ai_repair_models[index]!] || job.ai_repair_models[index]}
                            </span>
                        )}
                    </div>
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
                        AI Declined<br />
                        <a href="/faq#repair-declined" className="underline hover:text-blue-200">Learn more</a>
                    </span>
                    <button
                        onClick={() => onRepair(index)}
                        title="Retry"
                        aria-label="Retry AI repair"
                        className="ml-auto shrink-0 p-1 border border-blue-400/40 text-blue-300 hover:bg-blue-400 hover:text-background transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
            );
        }

        const isFailed = aiStatus === "failed";
        const repairCost = pricing.models?.[aiModel]?.ai_repair ?? pricing.ai_repair;
        return (
            <button
                onClick={() => onRepair(index)}
                className={`flex items-center gap-1 px-2 ${btnPad} border text-[10px] font-mono uppercase tracking-wide transition-colors
                    ${isFailed
                        ? 'border-red-400 text-red-400 hover:bg-red-400 hover:text-background'
                        : 'border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-background'}`}
                title={`AI Repair — ${repairCost} credits\nQuality: ${getModelDisplay(pricing, aiModel)}\nOutput resolution may differ from original`}
            >
                <Sparkles className={iconSize} />
                {isFailed ? 'Retry' : `Repair · ${repairCost}cr`}
            </button>
        );
    };

    // ── AI Remaster control for a single file slot ──
    const renderAiRemaster = (index: number, size: 'sm' | 'md' = 'md') => {
        const remasterFile = job.ai_remastered_files?.[index];
        const remasterStatus = job.ai_remaster_status?.[index] ?? null;
        const repairDone = !!job.ai_repaired_files?.[index];
        const repairPending = job.ai_repair_status?.[index] === 'pending';
        const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
        const thumbSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
        const btnPad = size === 'sm' ? 'p-1.5' : 'p-2';

        if (remasterFile) {
            return (
                <>
                    <a
                        href={getFileUrl(remasterFile)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group/thumb relative block ${thumbSize} border-2 border-violet-400 overflow-hidden hover:scale-105 transition-transform`}
                        title={`View Remastered (${getModelDisplay(pricing, job.ai_remaster_models?.[index])})`}
                    >
                        <PreviewImg src={getFileUrl(remasterFile)} alt="Remastered" />
                        <div className="absolute inset-0 flex items-center justify-center bg-violet-400/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <Wand2 className={`${iconSize} text-violet-300 drop-shadow-md`} />
                        </div>
                    </a>
                    <div className="flex flex-col items-center">
                        <button
                            onClick={() => {
                                const origUrl = getFileUrl(job.files[index]);
                                const remasterUrl = getFileUrl(remasterFile);
                                const remasterModel = job.ai_remaster_models?.[index];
                                onCompare({
                                    before: toPreviewUrl(origUrl),
                                    after: toPreviewUrl(remasterUrl),
                                    beforeFallback: origUrl,
                                    afterFallback: remasterUrl,
                                    label: `Original vs Remastered`,
                                    modelBadge: remasterModel ? modelShort[remasterModel] || remasterModel : undefined,
                                    beforeLabel: 'Original',
                                    afterLabel: `Remastered\n(${getModelDisplay(pricing, remasterModel)})`,
                                    jobId: job.id, fileIndex: index, comparisonType: 'remastered',
                                });
                            }}
                            className={`${btnPad} border border-violet-400 text-violet-400 hover:bg-violet-400 hover:text-background transition-colors`}
                            title="Review: Original vs Remastered"
                            aria-label="Compare original with remastered"
                        >
                            <Eye className={iconSize} />
                        </button>
                        {job.ai_remaster_models?.[index] && (
                            <span className="font-mono text-[8px] font-bold text-violet-400/70 uppercase tracking-wider mt-0.5">
                                {modelShort[job.ai_remaster_models[index]!] || job.ai_remaster_models[index]}
                            </span>
                        )}
                    </div>
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
                        AI Declined<br />
                        <a href="/faq#repair-declined" className="underline hover:text-blue-200">Learn more</a>
                    </span>
                    <button
                        onClick={() => onRemaster(index)}
                        title="Retry"
                        aria-label="Retry AI remaster"
                        className="ml-auto shrink-0 p-1 border border-blue-400/40 text-blue-300 hover:bg-blue-400 hover:text-background transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                </div>
            );
        }

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

        const isFailed = remasterStatus === "failed";
        const modelPricing = pricing.models?.[aiModel];
        const dynamicCost = repairDone
            ? (modelPricing?.ai_remaster_discounted ?? pricing.ai_remaster_discounted)
            : (modelPricing?.ai_remaster_full ?? pricing.ai_remaster_full);
        return (
            <button
                onClick={() => onRemaster(index)}
                className={`flex items-center gap-1 px-2 ${btnPad} border text-[10px] font-mono uppercase tracking-wide transition-colors
                    ${isFailed
                        ? 'border-red-400 text-red-400 hover:bg-red-400 hover:text-background'
                        : 'border-violet-400 text-violet-400 hover:bg-violet-400 hover:text-background'}`}
                title={`AI Remaster — ${dynamicCost} credits${repairDone ? ' (discount applied — Repair already done)' : ''}\nQuality: ${getModelDisplay(pricing, aiModel)}\nOutput resolution may differ from original`}
            >
                <Wand2 className={iconSize} />
                {isFailed ? 'Retry' : `Remaster · ${dynamicCost}cr`}
            </button>
        );
    };

    return (
        <div
            id={`job-${job.id}`}
            className={`relative bg-background border-2 border-foreground p-4 sm:p-6 brutalist-shadow group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all ${highlighted ? 'animate-highlight-flash' : ''}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                    {job.files.length > 1 ? (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                            {job.files[2] && (
                                <div className="absolute top-[8px] left-[8px] w-16 h-16 sm:w-20 sm:h-20 border border-foreground bg-foreground/5 overflow-hidden opacity-30">
                                    <PreviewImg src={getFileUrl(job.files[2])} alt="" />
                                </div>
                            )}
                            {job.files[1] && (
                                <div className="absolute top-[4px] left-[4px] w-16 h-16 sm:w-20 sm:h-20 border border-foreground bg-foreground/5 overflow-hidden opacity-60">
                                    <PreviewImg src={getFileUrl(job.files[1])} alt="" />
                                </div>
                            )}
                            <div className="absolute top-0 left-0 w-16 h-16 sm:w-20 sm:h-20 border border-foreground bg-foreground/5 overflow-hidden">
                                <PreviewImg src={getFileUrl(job.files[0])} alt="" className="w-full h-full object-cover opacity-80" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-foreground bg-foreground/5 flex items-center justify-center overflow-hidden">
                            {job.files.length > 0 ? (
                                <PreviewImg src={getFileUrl(job.files[0])} alt="Thumbnail" className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-foreground/20" />
                            )}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-2 min-w-0">
                            <span className="font-mono font-bold text-lg truncate max-w-[180px] sm:max-w-[300px]" title={jobTitle(job)}>
                                {jobTitle(job)}
                                {job.files.length > 1 && (
                                    <span className="text-foreground/40 font-normal"> +{job.files.length - 1}</span>
                                )}
                            </span>
                            <StatusBadge status={job.status} className="shrink-0" />
                        </div>
                        <p className="font-mono text-xs text-foreground/40 uppercase tracking-widest">
                            {formatJobDate(job.created_at)}
                        </p>
                        <p className="font-mono text-xs text-foreground/60 mt-1">
                            #{job.id.slice(0, 8)} • {job.files.length} FILE(S) • {job.source}
                        </p>
                    </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 flex-wrap">
                    {job.status === 'queued' && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onRestore}
                                disabled={processing}
                                className="flex items-center gap-2 px-6 py-2 bg-foreground text-background hover:bg-primary transition-colors font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                title={`Costs ${job.files.length} Credit${job.files.length > 1 ? 's' : ''}`}
                            >
                                {processing ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                Restore
                            </button>
                        </div>
                    )}

                    {job.status !== 'processing' && (
                        <button
                            onClick={onDelete}
                            disabled={processing}
                            className="p-2 text-foreground/40 hover:text-destructive transition-colors"
                            title="Delete Job"
                            aria-label="Delete job"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}

                    {job.status === 'completed' && job.files.length > 1 ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2">
                                {modelSelect}
                                {zipButton}
                            </div>
                            {repairEligible.length > 1 && (
                                <button
                                    onClick={onRepairAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-background text-[10px] font-mono uppercase tracking-widest transition-colors"
                                    title={`AI Repair all ${repairEligible.length} remaining photos`}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Repair all {repairEligible.length} · {repairAllCost}cr
                                </button>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSlideshow(); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-foreground/30 hover:bg-foreground hover:text-background text-[10px] font-mono uppercase tracking-widest transition-colors"
                                    title="Slideshow: browse all comparisons"
                                >
                                    <Play className="w-3 h-3" />
                                    Slideshow
                                </button>
                                <div
                                    className="relative w-16 h-16 cursor-pointer group/stack"
                                    onClick={onToggleExpand}
                                    title={expanded ? 'Hide files' : `Show all ${job.files.length} files`}
                                >
                                    {(job.processed_files?.[2] ?? job.files[2]) && (
                                        <div className="absolute top-[7px] left-[7px] w-12 h-12 border border-foreground bg-foreground/5 overflow-hidden opacity-30">
                                            <PreviewImg src={getFileUrl(job.processed_files?.[2] ?? job.files[2])} alt="" />
                                        </div>
                                    )}
                                    {(job.processed_files?.[1] ?? job.files[1]) && (
                                        <div className="absolute top-[3px] left-[3px] w-12 h-12 border border-foreground bg-foreground/5 overflow-hidden opacity-60">
                                            <PreviewImg src={getFileUrl(job.processed_files?.[1] ?? job.files[1])} alt="" />
                                        </div>
                                    )}
                                    <div className="absolute top-0 left-0 w-12 h-12 border border-foreground bg-foreground/5 overflow-hidden group-hover/stack:border-primary transition-colors">
                                        <PreviewImg src={getFileUrl(job.processed_files?.[0] ?? job.files[0])} alt="" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : job.status === 'completed' && (
                        <div className="flex items-center gap-2">
                            {modelSelect}
                            {zipButton}
                        </div>
                    )}

                </div>
            </div>

            {/* Single-file completed job — thumbnails + actions on a full-width row so they never get
                squeezed into the narrow header column and wrap */}
            {job.status === 'completed' && job.files.length === 1 && !expanded && job.processed_files?.[0] && (
                <div className="mt-4 flex flex-wrap items-center justify-start sm:justify-end gap-2">
                    <div className="flex items-center gap-2">
                        {countComparisons(job) > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSlideshow(); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-foreground/30 hover:bg-foreground hover:text-background text-[10px] font-mono uppercase tracking-widest transition-colors"
                                title="Slideshow: browse all comparisons"
                            >
                                <Play className="w-3 h-3" />
                                Slideshow
                            </button>
                        )}
                        {(job.ai_repaired_files?.[0] || job.ai_remastered_files?.[0]) && (
                            <button
                                onClick={() => onDuplicate(0)}
                                className="p-2 text-foreground/40 hover:text-foreground transition-colors"
                                title="Duplicate restored image to a new job for another Repair/Remaster attempt"
                                aria-label="Duplicate restored image to a new job"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                        <a
                            href={getFileUrl(job.processed_files[0])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/thumb relative block w-12 h-12 border border-foreground overflow-hidden hover:scale-105 transition-transform"
                            title="View Restored"
                        >
                            <PreviewImg src={getFileUrl(job.processed_files[0])} alt="Restored" />
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                <Download className="w-4 h-4 text-white drop-shadow-md" />
                            </div>
                        </a>
                        <button
                            onClick={() => compareRestored(0)}
                            className="p-2 bg-background border border-foreground hover:bg-foreground hover:text-background transition-colors"
                            title="Review: Original vs Restored"
                            aria-label="Compare original with restored"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {renderAiRepair(0, 'md')}
                    </div>
                    <div className="flex items-center gap-2">
                        {renderAiRemaster(0, 'md')}
                    </div>
                </div>
            )}

            {job.status === 'processing' && (
                <div className="mt-4 flex items-center gap-3 px-4 py-3 border border-yellow-500/40 bg-yellow-500/10 text-yellow-400" aria-live="polite">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <div>
                        <p className="font-mono text-xs font-bold uppercase tracking-widest">Restoration in progress</p>
                        <p className="font-mono text-[10px] text-yellow-400/60 mt-0.5">This page updates automatically.</p>
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
                    <div className={`mt-4 flex items-center gap-3 px-4 py-3 border ${isRemaster ? 'border-violet-500/30 bg-violet-500/10 text-violet-400/80' : 'border-amber-500/30 bg-amber-500/10 text-amber-400/80'}`} aria-live="polite">
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
                        onClick={onToggleExpand}
                        className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors ml-auto"
                        aria-expanded={expanded}
                    >
                        {expanded ? (
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

                    {expanded && (
                        <div className="mt-4 space-y-3 pl-3 sm:pl-6 border-l-2 border-dashed border-foreground/20">
                            {job.files.map((file: string, index: number) => {
                                const processed = job.processed_files ? job.processed_files[index] : null;
                                return (
                                    <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-foreground/5 p-3 border border-foreground/5">
                                        <span className="text-xs font-mono truncate text-foreground/50 sm:flex-1 min-w-0">
                                            {file.split(/[/\\]/).pop()}
                                        </span>

                                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                            <a
                                                href={getFileUrl(file)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group/thumb relative block w-14 h-14 shrink-0 border border-foreground/30 overflow-hidden hover:scale-105 transition-transform"
                                                title="View Original"
                                            >
                                                <PreviewImg src={getFileUrl(file)} alt="Original" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center">
                                                    <span className="text-[7px] text-white/70 font-mono uppercase tracking-widest">Orig</span>
                                                </div>
                                            </a>

                                            {processed && (
                                                <div className="w-px self-stretch bg-foreground/15 shrink-0 mx-1" />
                                            )}

                                            {processed && (
                                                <>
                                                    {(job.ai_repaired_files?.[index] || job.ai_remastered_files?.[index]) && (
                                                        <button
                                                            onClick={() => onDuplicate(index)}
                                                            className="p-1.5 text-foreground/40 hover:text-foreground transition-colors"
                                                            title="Duplicate restored image to a new job"
                                                            aria-label="Duplicate restored image to a new job"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <a
                                                        href={getFileUrl(processed)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="relative block w-10 h-10 border border-green-500/50 hover:border-green-600 transition-colors overflow-hidden shrink-0"
                                                        title="View Restored"
                                                    >
                                                        <PreviewImg src={getFileUrl(processed)} alt="Restored" />
                                                    </a>
                                                    <button
                                                        onClick={() => compareRestored(index)}
                                                        className="p-1.5 border border-foreground/20 hover:bg-foreground hover:text-background transition-colors"
                                                        title="Review: Original vs Restored"
                                                        aria-label="Compare original with restored"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {renderAiRepair(index, 'sm')}
                                                    {renderAiRemaster(index, 'sm')}
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
    );
}
