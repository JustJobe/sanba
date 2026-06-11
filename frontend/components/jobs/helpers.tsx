export interface ModelPricing {
    id: string;
    display_name: string;
    description: string;
    ai_repair: number;
    ai_remaster_full: number;
    ai_remaster_discounted: number;
}

export interface Pricing {
    restore: number;
    ai_repair: number;
    ai_remaster_full: number;
    ai_remaster_discounted: number;
    daily_credit_threshold: number;
    models?: Record<string, ModelPricing>;
    default_model?: string;
}

export interface Job {
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
    ai_repair_models?: (string | null)[];
    ai_remaster_models?: (string | null)[];
    is_sample?: boolean;
}

export interface ComparisonStep {
    before: string;
    after: string;
    beforeFallback?: string;
    afterFallback?: string;
    label?: string;
    modelBadge?: string;
    beforeLabel?: string;
    afterLabel?: string;
    jobId?: string;
    fileIndex?: number;
    comparisonType?: 'restored' | 'repaired' | 'remastered';
}

export const modelShort: Record<string, string> = { pro: 'PRM', flash: 'STD' };

export const getFileUrl = (path: string) => {
    if (!path) return '';
    const relativePath = path.replace(/\\/g, '/').replace(/^uploads\//, '');
    return `/files/${relativePath}`;
};

export const toPreviewUrl = (fileUrl: string): string => {
    const lastDot = fileUrl.lastIndexOf('.');
    if (lastDot === -1) return fileUrl;
    return fileUrl.substring(0, lastDot) + '_preview' + fileUrl.substring(lastDot);
};

export const formatJobDate = (iso: string) => {
    // Backend timestamps are UTC but carry no timezone marker
    const d = new Date(/Z|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z');
    return d.toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** Human-friendly job title from the first filename; falls back to the short id. */
export const jobTitle = (job: Job): string => {
    const name = (job.files[0] || '').split(/[/\\]/).pop() || '';
    const base = name.replace(/\.[^.]+$/, '');
    return base || `Job #${job.id.slice(0, 8)}`;
};

export const getModelDisplay = (pricing: Pricing, tierOrNull: string | null | undefined) => {
    const tier = tierOrNull || pricing.default_model || 'pro';
    return pricing.models?.[tier]?.display_name || 'Premium';
};

/** All steps for the batch slideshow: restored / repaired / remastered per file. */
export const buildSlideshowSteps = (job: Job, pricing: Pricing): ComparisonStep[] => {
    const steps: ComparisonStep[] = [];
    for (let i = 0; i < job.files.length; i++) {
        const origUrl = getFileUrl(job.files[i]);
        const fileName = job.files[i].split(/[/\\]/).pop() ?? `File ${i + 1}`;

        const processed = job.processed_files?.[i];
        if (processed) {
            const afterUrl = getFileUrl(processed);
            steps.push({
                before: toPreviewUrl(origUrl), after: toPreviewUrl(afterUrl),
                beforeFallback: origUrl, afterFallback: afterUrl,
                label: `${fileName} — Original vs Restored`,
                beforeLabel: 'Original', afterLabel: 'Restored (Sanba Restore)',
                jobId: job.id, fileIndex: i, comparisonType: 'restored',
            });
        }

        const repaired = job.ai_repaired_files?.[i];
        if (repaired) {
            const aiUrl = getFileUrl(repaired);
            const model = job.ai_repair_models?.[i];
            steps.push({
                before: toPreviewUrl(origUrl), after: toPreviewUrl(aiUrl),
                beforeFallback: origUrl, afterFallback: aiUrl,
                label: `${fileName} — Original vs Repaired`,
                modelBadge: model ? modelShort[model] || model : undefined,
                beforeLabel: 'Original', afterLabel: `Repaired\n(${getModelDisplay(pricing, model)})`,
                jobId: job.id, fileIndex: i, comparisonType: 'repaired',
            });
        }

        const remastered = job.ai_remastered_files?.[i];
        if (remastered) {
            const remUrl = getFileUrl(remastered);
            const model = job.ai_remaster_models?.[i];
            steps.push({
                before: toPreviewUrl(origUrl), after: toPreviewUrl(remUrl),
                beforeFallback: origUrl, afterFallback: remUrl,
                label: `${fileName} — Original vs Remastered`,
                modelBadge: model ? modelShort[model] || model : undefined,
                beforeLabel: 'Original', afterLabel: `Remastered\n(${getModelDisplay(pricing, model)})`,
                jobId: job.id, fileIndex: i, comparisonType: 'remastered',
            });
        }
    }
    return steps;
};

/** File indexes still eligible for AI repair (restored, not repaired, not pending). */
export const repairEligibleIndexes = (job: Job): number[] => {
    const indexes: number[] = [];
    for (let i = 0; i < (job.processed_files?.length ?? 0); i++) {
        if (!job.processed_files[i]) continue;
        if (job.ai_repaired_files?.[i]) continue;
        if (job.ai_repair_status?.[i] === 'pending') continue;
        indexes.push(i);
    }
    return indexes;
};

/** Thumbnail that loads the lightweight _preview variant, falling back to the full-size file. */
export function PreviewImg({ src, alt = '', className = 'w-full h-full object-cover' }: { src: string; alt?: string; className?: string }) {
    return (
        <img
            src={toPreviewUrl(src)}
            alt={alt}
            loading="lazy"
            className={className}
            onError={(e) => {
                const img = e.currentTarget;
                if (img.dataset.fallback !== '1') {
                    img.dataset.fallback = '1';
                    img.src = src;
                }
            }}
        />
    );
}
