"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format, subDays, startOfMonth, startOfYear } from "date-fns";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from "recharts";
import { Download, Calendar, Activity, Users, FileImage, Clock, Zap, Image, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";

import { useTheme } from "next-themes";

export default function ReportsDashboard() {
    const { theme } = useTheme();
    const [summary, setSummary] = useState<any>(null);
    const [chartData, setChartData] = useState<any>({ user_growth: [], job_activity: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState("30d"); // 30d, 90d, 1y

    useEffect(() => {
        fetchReports();
    }, [range]);

    const fetchReports = async () => {
        setLoading(true);
        setError(null);
        try {
            let startDate = new Date();
            if (range === "30d") startDate = subDays(new Date(), 30);
            if (range === "90d") startDate = subDays(new Date(), 90);
            if (range === "1y") startDate = subDays(new Date(), 365);
            // For 'All Time' we might handle differently, but let's stick to ranges for now.

            const startStr = startDate.toISOString();
            const endStr = new Date().toISOString();

            const [summaryRes, chartRes] = await Promise.all([
                api.get(`/admin/reports/summary?start_date=${startStr}&end_date=${endStr}`),
                api.get(`/admin/reports/chart?start_date=${startStr}&end_date=${endStr}&range_type=${range === '1y' ? 'monthly' : 'daily'}`)
            ]);

            setSummary(summaryRes.data);
            setChartData(chartRes.data);
        } catch (e: any) {
            console.error("Error fetching reports", e);
            setError(e.message || "Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = async (type: string) => {
        try {
            let startDate = new Date();
            if (range === "30d") startDate = subDays(new Date(), 30);
            if (range === "90d") startDate = subDays(new Date(), 90);
            if (range === "1y") startDate = subDays(new Date(), 365);

            const startStr = startDate.toISOString();
            const endStr = new Date().toISOString();

            const response = await api.get(`/admin/reports/export?type=${type}&start_date=${startStr}&end_date=${endStr}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e: any) {
            console.error("Download failed", e);
            alert("Download failed: " + (e.message || "Unknown error"));
        }
    };

    if (loading && !summary) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (error && !summary) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-destructive gap-4">
                <div>Error loading reports: {error}</div>
                <button
                    onClick={fetchReports}
                    className="px-4 py-2 bg-foreground/10 hover:bg-foreground/20 rounded-lg text-foreground transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const isDark = theme === 'dark';

    // Theme colors matching globals.css
    // Dark mode: Foreground is #FAFAF9 (Stone 50)
    // Light mode: Foreground is #292524 (Stone 800)
    const axisColor = isDark ? "#FAFAF980" : "#29252460"; // opacity for axis
    const linesColor = isDark ? "#A8A29E" : "#5D4B70"; // Stone 400 vs Purple
    const gridColor = isDark ? "#FAFAF920" : "#00000010";

    const chartTheme = {
        grid: gridColor,
        text: axisColor,
        tooltip: {
            backgroundColor: isDark ? '#1C1917' : '#fff',
            border: `2px solid ${isDark ? '#FAFAF9' : '#000'}`,
            borderRadius: '0px',
            color: isDark ? '#FAFAF9' : '#000',
            boxShadow: `4px 4px 0px 0px ${isDark ? '#FAFAF9' : '#000'}`
        }
    };

    return (
        <div className="space-y-8 font-mono">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-background p-4 border-2 border-foreground brutalist-shadow">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="bg-transparent border-b-2 border-foreground/20 rounded-none px-3 py-1.5 text-foreground focus:outline-none focus:border-foreground font-bold uppercase"
                    >
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 3 Months</option>
                        <option value="1y">Last Year</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => downloadCSV('users')} className="flex items-center gap-2 px-3 py-1.5 bg-background border border-foreground hover:bg-foreground hover:text-background transition-colors text-xs uppercase tracking-widest font-bold">
                        <Download className="w-4 h-4" /> Export Users
                    </button>
                    <button onClick={() => downloadCSV('jobs')} className="flex items-center gap-2 px-3 py-1.5 bg-background border border-foreground hover:bg-foreground hover:text-background transition-colors text-xs uppercase tracking-widest font-bold">
                        <Download className="w-4 h-4" /> Export Jobs
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard title="New Accounts" value={summary?.new_users ?? 0} icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />} sub={`Total: ${summary?.total_users ?? 0} users`} />
                <KpiCard title="Photos Restored" value={summary?.photos_restored ?? summary?.photos_processed ?? 0} icon={<Image className="w-5 h-5 text-green-600 dark:text-green-400" />} sub={`${summary?.credits_restore ?? 0} credits · ${summary?.avg_files_per_job ?? 0} avg per job`} />
                <KpiCard title="AI Repaired" value={summary?.photos_ai_repaired ?? 0} icon={<Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />} sub={`${summary?.credits_ai_repair ?? 0} credits spent`} />
                <KpiCard title="Active Users" value={summary?.active_users ?? 0} icon={<Activity className="w-5 h-5 text-primary" />} sub={`Of ${summary?.total_users ?? 0} total`} />
                <KpiCard title="Success Rate" value={`${summary?.success_rate?.toFixed(1) ?? "0.0"}%`} icon={<FileImage className="w-5 h-5 text-orange-600 dark:text-orange-400" />} sub={`${summary?.failed_jobs ?? 0} failed`} />
                <KpiCard title="Credits Used" value={summary?.credits_used ?? 0} icon={<Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />} sub={`${summary?.credits_restore ?? 0} restore · ${summary?.credits_ai_repair ?? 0} AI repair`} />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* User Growth */}
                <div className="bg-background border-2 border-foreground p-6 brutalist-shadow">
                    <h3 className="text-lg font-bold font-syne text-foreground mb-6">User Growth</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData.user_growth}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                <XAxis dataKey="date" stroke={chartTheme.text} fontSize={12} tickFormatter={(str) => format(new Date(str), range === '1y' ? 'MMM yyyy' : 'MMM d')} />
                                <YAxis stroke={chartTheme.text} fontSize={12} />
                                <Tooltip
                                    contentStyle={chartTheme.tooltip}
                                    labelStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="count" stroke={linesColor} strokeWidth={3} dot={{ r: 4, fill: linesColor }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Job Activity */}
                <div className="bg-background border-2 border-foreground p-6 brutalist-shadow">
                    <h3 className="text-lg font-bold font-syne text-foreground mb-6">Job Activity</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.job_activity}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                <XAxis dataKey="date" stroke={chartTheme.text} fontSize={12} tickFormatter={(str) => format(new Date(str), range === '1y' ? 'MMM yyyy' : 'MMM d')} />
                                <YAxis stroke={chartTheme.text} fontSize={12} />
                                <Tooltip
                                    contentStyle={chartTheme.tooltip}
                                    labelStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold' }}
                                    cursor={{ fill: gridColor }}
                                />
                                <Bar dataKey="count" fill={isDark ? "#A8A29E" : "#A098AD"} radius={[0, 0, 0, 0]} stroke={isDark ? "#FAFAF9" : "#000"} strokeWidth={1} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon, sub }: { title: string, value: string | number, icon: any, sub: string }) {
    return (
        <div className="bg-background border-2 border-foreground p-5 hover:translate-x-[2px] hover:translate-y-[2px] transition-transform">
            <div className="flex justify-between items-start mb-2">
                <span className="text-foreground/60 text-xs font-bold uppercase tracking-widest">{title}</span>
                <div className="p-2 bg-accent rounded-none border border-foreground">{icon}</div>
            </div>
            <div className="text-3xl font-bold font-syne text-foreground mb-1">{value}</div>
            <div className="text-xs font-mono text-foreground/40">{sub}</div>
        </div>
    );
}
