"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Job, Pricing, repairEligibleIndexes } from './helpers';

const PAGE_SIZE = 20;
const POLL_ACTIVE_MS = 5000;
const POLL_IDLE_MS = 45000;

interface UseJobsOptions {
    onInsufficientCredits: () => void;
    onAiFailure: () => void;
}

export function useJobs({ onInsufficientCredits, onAiFailure }: UseJobsOptions) {
    const { refreshUser } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [pricing, setPricing] = useState<Pricing>({
        restore: 1, ai_repair: 4, ai_remaster_full: 4, ai_remaster_discounted: 3, daily_credit_threshold: 3,
    });
    const [aiModels, setAiModels] = useState<Record<string, string>>({});
    const visibleCountRef = useRef(PAGE_SIZE);

    const getAiModel = (jobId: string) => aiModels[jobId] || pricing.default_model || 'pro';
    const setAiModel = (jobId: string, model: string) => setAiModels(prev => ({ ...prev, [jobId]: model }));

    const fetchJobs = useCallback(async () => {
        try {
            const count = visibleCountRef.current;
            // Ask for one extra row to know whether more pages exist
            const response = await api.get(`/jobs/?limit=${count + 1}`);
            const data: Job[] = response.data;
            setHasMore(data.length > count);
            setJobs(
                data.slice(0, count).sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
            );
        } catch (error) {
            console.error('Failed to fetch jobs', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        visibleCountRef.current += PAGE_SIZE;
        fetchJobs();
    }, [fetchJobs]);

    // Initial load + pricing
    useEffect(() => {
        fetchJobs();
        api.get('/jobs/pricing').then(res => setPricing(res.data)).catch(() => {});
    }, [fetchJobs]);

    // Adaptive polling: fast while anything is in flight, slow when idle
    const hasActiveWork = jobs.some(j =>
        j.status === 'processing' ||
        j.ai_repair_status?.some(s => s === 'pending') ||
        j.ai_remaster_status?.some(s => s === 'pending')
    );
    useEffect(() => {
        const interval = setInterval(fetchJobs, hasActiveWork ? POLL_ACTIVE_MS : POLL_IDLE_MS);
        return () => clearInterval(interval);
    }, [hasActiveWork, fetchJobs]);

    const startProcessing = async (jobId: string) => {
        setProcessingId(jobId);
        try {
            await api.post(`/jobs/${jobId}/process?operation=restoration_full`);
            fetchJobs();
            refreshUser();
        } catch (error: any) {
            console.error('Failed to start processing', error);
            if (error.response?.status === 402) {
                onInsufficientCredits();
            } else {
                alert('Failed to start processing');
            }
        } finally {
            setProcessingId(null);
        }
    };

    const startAiRepair = async (jobId: string, fileIndex: number) => {
        try {
            await api.post(`/jobs/${jobId}/ai_repair/${fileIndex}`, { model: getAiModel(jobId) });
            refreshUser();
            fetchJobs();
        } catch (error: any) {
            console.error('AI repair failed', error);
            if (error.response?.status === 402) onInsufficientCredits();
            else onAiFailure();
        }
    };

    const startAiRepairAll = async (job: Job) => {
        const eligible = repairEligibleIndexes(job);
        if (eligible.length === 0) return;
        const cost = (pricing.models?.[getAiModel(job.id)]?.ai_repair ?? pricing.ai_repair) * eligible.length;
        if (!confirm(`Repair ${eligible.length} photo${eligible.length > 1 ? 's' : ''} for ${cost} credits?`)) return;
        try {
            await api.post(`/jobs/${job.id}/ai_repair_all`, { model: getAiModel(job.id) });
            refreshUser();
            fetchJobs();
        } catch (error: any) {
            console.error('Batch AI repair failed', error);
            if (error.response?.status === 402) onInsufficientCredits();
            else onAiFailure();
        }
    };

    const startAiRemaster = async (jobId: string, fileIndex: number) => {
        try {
            await api.post(`/jobs/${jobId}/ai_remaster/${fileIndex}`, { model: getAiModel(jobId) });
            refreshUser();
            fetchJobs();
        } catch (error: any) {
            console.error('AI remaster failed', error);
            if (error.response?.status === 402) onInsufficientCredits();
            else onAiFailure();
        }
    };

    const deleteJob = async (jobId: string) => {
        if (!confirm('Delete this job and all its photos? This cannot be undone.')) return;
        try {
            await api.delete(`/jobs/${jobId}`);
            fetchJobs();
        } catch (error) {
            console.error('Failed to delete job', error);
            alert('Failed to delete job');
        }
    };

    /** Returns the new job id so the caller can highlight/scroll to it. */
    const duplicateJob = async (jobId: string, fileIndex: number): Promise<string | null> => {
        try {
            const res = await api.post(`/jobs/${jobId}/duplicate/${fileIndex}`);
            await fetchJobs();
            return res.data?.id ?? null;
        } catch (error) {
            console.error('Duplicate failed', error);
            return null;
        }
    };

    const downloadZip = async (jobId: string) => {
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
            console.error('Failed to download zip', error);
            alert('Failed to download zip');
        }
    };

    return {
        jobs, loading, hasMore, loadMore, fetchJobs, pricing, processingId,
        getAiModel, setAiModel,
        startProcessing, startAiRepair, startAiRepairAll, startAiRemaster,
        deleteJob, duplicateJob, downloadZip,
    };
}
