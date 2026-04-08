"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Link from "next/link";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, HardDrive, AlertTriangle } from "lucide-react";

interface JobRecord {
    id: string;
    user_email: string;
    status: string;
    created_at: string | null;
    completed_at: string | null;
    file_count: number;
    repair_count: number;
    remaster_count: number;
    files_on_disk: boolean;
}

const PAGE_SIZE = 50;

export default function JobHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const [jobs, setJobs] = useState<JobRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");

    const fetchJobs = async (p: number, status: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(p * PAGE_SIZE),
            });
            if (status) params.set("status", status);
            const { data } = await api.get(`/admin/jobs?${params}`);
            setJobs(data.jobs);
            setTotal(data.total);
        } catch {
            console.error("Failed to fetch job history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.is_admin) fetchJobs(page, statusFilter);
    }, [user, page, statusFilter]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!user?.is_admin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="font-mono text-sm text-foreground/50">Access denied.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const statusIcon = (s: string) => {
        switch (s) {
            case "completed": return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
            case "failed": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
            case "processing":
            case "pending":
            case "queued": return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
            default: return null;
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="border-b border-foreground/10 py-4 px-6 flex items-center justify-between">
                <Link href="/admin" className="font-bold text-lg hover:opacity-70 transition-opacity">
                    ← Admin
                </Link>
                <span className="font-mono text-xs text-foreground/50 uppercase tracking-widest">Job History Ledger</span>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="font-syne font-bold text-3xl">Job History</h1>
                        <p className="font-mono text-xs text-foreground/50 mt-1">{total} total jobs</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="font-mono text-xs text-foreground/50 uppercase">Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                            className="bg-background border border-foreground/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="">All</option>
                            <option value="completed">Completed</option>
                            <option value="queued">Queued</option>
                            <option value="processing">Processing</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="border-2 border-foreground brutalist-shadow overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-foreground bg-foreground/5">
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">Date</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">User</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">Status</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60 text-center">Photos</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60 text-center">Repairs</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60 text-center">Remasters</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60 text-center">On Disk</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">Job ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-foreground/30" />
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center font-mono text-xs text-foreground/40">
                                        No jobs found.
                                    </td>
                                </tr>
                            ) : jobs.map((job) => (
                                <tr key={job.id} className="border-b border-foreground/10 hover:bg-foreground/[0.03] transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-xs text-foreground/70 whitespace-nowrap">
                                        {formatDate(job.created_at)}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-foreground/70 max-w-[180px] truncate">
                                        {job.user_email}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                                            {statusIcon(job.status)}
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-center">{job.file_count}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-center">
                                        {job.repair_count > 0 ? <span className="text-amber-400">{job.repair_count}</span> : <span className="text-foreground/20">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-center">
                                        {job.remaster_count > 0 ? <span className="text-violet-400">{job.remaster_count}</span> : <span className="text-foreground/20">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        {job.files_on_disk ? (
                                            <HardDrive className="w-3.5 h-3.5 text-green-400 mx-auto" />
                                        ) : (
                                            <span title="Files pruned"><AlertTriangle className="w-3.5 h-3.5 text-red-400/60 mx-auto" /></span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-[10px] text-foreground/30 max-w-[120px] truncate">
                                        {job.id.slice(0, 8)}…
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="flex items-center gap-1 font-mono text-xs border border-foreground/30 px-3 py-1.5 disabled:opacity-20 hover:bg-foreground/5 transition-colors"
                        >
                            <ChevronLeft className="w-3 h-3" /> Prev
                        </button>
                        <span className="font-mono text-xs text-foreground/50">
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            className="flex items-center gap-1 font-mono text-xs border border-foreground/30 px-3 py-1.5 disabled:opacity-20 hover:bg-foreground/5 transition-colors"
                        >
                            Next <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
