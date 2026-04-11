"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
    daily_claim: "Daily Claim",
    admin_grant: "Admin Grant",
    admin_deduct: "Admin Deduct",
    purchase: "Purchase",
    purchase_credits: "Purchase",
    refund_repair: "Refund (Repair)",
    refund_remaster: "Refund (Remaster)",
    signup_bonus: "Signup Bonus",
    restore: "Restore",
    ai_repair: "AI Repair",
    ai_remaster: "AI Remaster",
};

interface LedgerEntry {
    id: string;
    user_id: string;
    user_email: string;
    action: string;
    amount: number;
    balance_after: number;
    actor: string;
    job_id: string | null;
    payment_id: string | null;
    note: string | null;
    created_at: string | null;
}

const PAGE_SIZE = 50;

export default function CreditLedgerPage() {
    const { user, loading: authLoading } = useAuth();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [emailFilter, setEmailFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Sorting
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Debounce email input
    const [emailInput, setEmailInput] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => {
            setEmailFilter(emailInput);
            setPage(0);
        }, 400);
        return () => clearTimeout(timer);
    }, [emailInput]);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(page * PAGE_SIZE),
                sort_by: sortBy,
                sort_order: sortOrder,
            });
            if (emailFilter) params.set("user_email", emailFilter);
            if (actionFilter) params.set("action", actionFilter);
            if (startDate) params.set("start_date", new Date(startDate).toISOString());
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                params.set("end_date", end.toISOString());
            }
            const { data } = await api.get(`/admin/credit-ledger?${params}`);
            setEntries(data.entries);
            setTotal(data.total);
        } catch {
            console.error("Failed to fetch credit ledger");
        } finally {
            setLoading(false);
        }
    }, [page, emailFilter, actionFilter, startDate, endDate, sortBy, sortOrder]);

    useEffect(() => {
        if (user?.is_admin) fetchEntries();
    }, [user, fetchEntries]);

    const handleSort = (col: string) => {
        if (sortBy === col) {
            setSortOrder(sortOrder === "desc" ? "asc" : "desc");
        } else {
            setSortBy(col);
            setSortOrder("desc");
        }
        setPage(0);
    };

    const downloadCSV = async () => {
        try {
            const startStr = startDate
                ? new Date(startDate).toISOString()
                : subDays(new Date(), 30).toISOString();
            const endStr = endDate
                ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d.toISOString(); })()
                : new Date().toISOString();

            const response = await api.get(
                `/admin/reports/export?type=credit_ledger&start_date=${startStr}&end_date=${endStr}`,
                { responseType: "blob" }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `credit_ledger_${format(new Date(), "yyyy-MM-dd")}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            console.error("Download failed", e);
            alert("Download failed: " + (e.message || "Unknown error"));
        }
    };

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

    const formatDate = (iso: string | null) => {
        if (!iso) return "\u2014";
        const d = new Date(iso);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-20" />;
        return sortOrder === "asc"
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />;
    };

    const thClass = "px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60 cursor-pointer select-none hover:text-foreground/80 transition-colors";

    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="border-b border-foreground/10 py-4 px-6 flex items-center justify-between">
                <Link href="/admin" className="font-bold text-lg hover:opacity-70 transition-opacity">
                    &larr; Admin
                </Link>
                <span className="font-mono text-xs text-foreground/50 uppercase tracking-widest">Credit Ledger</span>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="font-syne font-bold text-3xl">Credit Ledger</h1>
                            <p className="font-mono text-xs text-foreground/50 mt-1">{total} total transactions</p>
                        </div>
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-3 py-1.5 bg-background border border-foreground hover:bg-foreground hover:text-background transition-colors text-xs uppercase tracking-widest font-bold"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="text"
                            placeholder="Filter by email..."
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="bg-background border border-foreground/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48"
                        />
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                            className="bg-background border border-foreground/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="">All Actions</option>
                            {Object.entries(ACTION_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <label className="font-mono text-xs text-foreground/50">From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                            className="bg-background border border-foreground/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <label className="font-mono text-xs text-foreground/50">To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                            className="bg-background border border-foreground/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {(emailInput || actionFilter || startDate || endDate) && (
                            <button
                                onClick={() => { setEmailInput(""); setActionFilter(""); setStartDate(""); setEndDate(""); setPage(0); }}
                                className="font-mono text-xs text-foreground/50 hover:text-foreground underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="border-2 border-foreground brutalist-shadow overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-foreground bg-foreground/5">
                                <th className={thClass} onClick={() => handleSort("created_at")}>
                                    <span className="flex items-center gap-1">Date <SortIcon col="created_at" /></span>
                                </th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">User</th>
                                <th className={thClass} onClick={() => handleSort("action")}>
                                    <span className="flex items-center gap-1">Action <SortIcon col="action" /></span>
                                </th>
                                <th className={`${thClass} text-right`} onClick={() => handleSort("amount")}>
                                    <span className="flex items-center justify-end gap-1">Amount <SortIcon col="amount" /></span>
                                </th>
                                <th className={`${thClass} text-right`} onClick={() => handleSort("balance_after")}>
                                    <span className="flex items-center justify-end gap-1">Balance <SortIcon col="balance_after" /></span>
                                </th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">Actor</th>
                                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-foreground/60">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-foreground/30" />
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center font-mono text-xs text-foreground/40">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : entries.map((e) => (
                                <tr key={e.id} className="border-b border-foreground/10 hover:bg-foreground/[0.03] transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-xs text-foreground/70 whitespace-nowrap">
                                        {formatDate(e.created_at)}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-foreground/70 max-w-[180px] truncate">
                                        {e.user_email}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs">
                                        {ACTION_LABELS[e.action] || e.action}
                                    </td>
                                    <td className={`px-4 py-2.5 font-mono text-xs text-right font-bold ${e.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                                        {e.amount >= 0 ? `+${e.amount}` : e.amount}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-right text-foreground/70">
                                        {e.balance_after}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-[10px] text-foreground/50">
                                        {e.actor === "system" ? "system" : e.actor.slice(0, 8)}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-[10px] text-foreground/50 max-w-[200px] truncate">
                                        {e.note || "\u2014"}
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
