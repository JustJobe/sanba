"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Users, Shield, Zap, CheckCircle, XCircle, Check, X, CreditCard, BarChart3, Settings, Save } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { ThemeToggle } from "@/components/ThemeToggle";
import ReportsDashboard from "@/components/admin/ReportsDashboard";

interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    credits: number;
    is_admin: number;
}

interface IncentivePlan {
    id: string;
    name: string;
    reward_amount: number;
    cooldown_hours: number;
    is_active: boolean;
    max_balance_cap: number;
}

interface SystemSetting {
    key: string;
    value: string;
}

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'reports' | 'settings'>('users');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [plans, setPlans] = useState<IncentivePlan[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Editing State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editCredits, setEditCredits] = useState<string>("");
    const [isSavingStart, setIsSaving] = useState(false);

    // Fetch data
    useEffect(() => {
        if (!user) return;
        if (loading) return;

        if (user.is_admin !== 1) {
            router.push("/");
            return;
        }

        fetchData();
    }, [user, loading, router]);

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const [usersRes, plansRes, settingsRes] = await Promise.all([
                api.get("/admin/users"),
                api.get("/admin/incentives"),
                api.get("/admin/settings")
            ]);
            setUsers(usersRes.data);
            setPlans(plansRes.data);

            const settingsMap: Record<string, string> = {};
            settingsRes.data.forEach((s: SystemSetting) => {
                settingsMap[s.key] = s.value;
            });
            setSettings(settingsMap);
        } catch (e) {
            console.error("Failed to fetch admin data", e);
        } finally {
            setIsLoadingData(false);
        }
    };

    const startEditing = (user: AdminUser) => {
        setEditingUserId(user.id);
        setEditCredits(user.credits.toString());
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditCredits("");
    };

    const saveCredits = async (userId: string) => {
        const amount = parseInt(editCredits);
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid non-negative number.");
            return;
        }

        setIsSaving(true);
        try {
            await api.put(`/admin/users/${userId}/credits`, { amount });

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, credits: amount } : u));
            setEditingUserId(null);

            // Background refresh
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Failed to update credits. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const saveSetting = async (key: string, value: string) => {
        setIsSaving(true);
        try {
            await api.put(`/admin/settings/${key}`, { value });
            setSettings(prev => ({ ...prev, [key]: value }));
            alert("Setting saved!");
        } catch (e) {
            console.error(e);
            alert("Failed to save setting.");
        } finally {
            setIsSaving(false);
        }
    };

    const updatePlan = async (planId: string, data: Partial<IncentivePlan>) => {
        if (!confirm("Are you sure you want to update this plan?")) return;
        setIsSaving(true);
        try {
            const res = await api.put(`/admin/incentives/${planId}`, data);
            setPlans(plans.map(p => p.id === planId ? res.data : p));
        } catch (e) {
            console.error(e);
            alert("Failed to update plan");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !user || user.is_admin !== 1) return <div className="min-h-screen bg-background" />;

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground font-mono">
            <nav className="border-b border-foreground/10 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-foreground/60" />
                        </Link>
                        <div className="font-syne font-bold text-xl">SanBa Admin</div>
                        <div className="h-6 w-px bg-foreground/10" />
                        <span className="font-syne font-bold text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Admin Dashboard
                        </span>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-8">
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-none border font-medium transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground/60 border-foreground/20 hover:text-foreground hover:border-foreground'}`}
                    >
                        <Users className="w-4 h-4" /> Users
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-4 py-2 rounded-none border font-medium transition-colors flex items-center gap-2 ${activeTab === 'plans' ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground/60 border-foreground/20 hover:text-foreground hover:border-foreground'}`}
                    >
                        <Zap className="w-4 h-4" /> Incentive Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-none border font-medium transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground/60 border-foreground/20 hover:text-foreground hover:border-foreground'}`}
                    >
                        <BarChart3 className="w-4 h-4" /> Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-none border font-medium transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'bg-foreground text-background border-foreground' : 'bg-background text-foreground/60 border-foreground/20 hover:text-foreground hover:border-foreground'}`}
                    >
                        <Settings className="w-4 h-4" /> Settings
                    </button>
                </div>

                {isLoadingData ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                    <>
                        {activeTab === 'users' && (
                            <div className="bg-background border-2 border-foreground brutalist-shadow overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-foreground text-foreground/60 text-xs uppercase tracking-widest bg-accent/20">
                                            <th className="p-4 font-bold">User</th>
                                            <th className="p-4 font-bold">Contact</th>
                                            <th className="p-4 font-bold">Credits</th>
                                            <th className="p-4 font-bold">Role</th>
                                            <th className="p-4 font-bold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-foreground/10">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-accent/10 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-foreground">{u.full_name || "Unknown"}</div>
                                                    <div className="text-xs text-foreground/40 font-mono">{u.id}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-foreground">{u.email}</div>
                                                    <div className="text-xs text-foreground/40 font-mono">{u.phone || "-"}</div>
                                                </td>
                                                <td className="p-4 font-mono">
                                                    {editingUserId === u.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={editCredits}
                                                                onChange={(e) => setEditCredits(e.target.value)}
                                                                className="w-20 bg-background border border-primary rounded-none px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-primary font-bold">{u.credits}</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {u.is_admin === 1 ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 border border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-500 text-xs font-bold uppercase tracking-wider">
                                                            <Shield className="w-3 h-3" /> Admin
                                                        </span>
                                                    ) : (
                                                        <span className="text-foreground/40 text-xs uppercase tracking-wider">User</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {editingUserId === u.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => saveCredits(u.id)}
                                                                disabled={isSavingStart}
                                                                className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 border border-green-700 transition-colors"
                                                                title="Save"
                                                            >
                                                                {isSavingStart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={cancelEditing}
                                                                disabled={isSavingStart}
                                                                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-700 transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEditing(u)}
                                                            className="px-3 py-1.5 bg-background hover:bg-foreground hover:text-background border border-foreground text-foreground text-xs uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_currentColor] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                                                        >
                                                            Edit Credits
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'plans' && (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {plans.map(plan => (
                                    <div key={plan.id} className="bg-background border-2 border-foreground p-6 hover:shadow-[8px_8px_0px_0px_currentColor] transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-bold font-syne text-foreground">{plan.name}</h3>
                                            {plan.is_active ? <CheckCircle className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                        </div>
                                        <div className="space-y-4 text-sm font-mono text-foreground/60">
                                            <div className="flex justify-between items-center border-b border-foreground/10 pb-2">
                                                <span>Reward:</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold">+</span>
                                                    <input
                                                        type="number"
                                                        className="w-12 bg-transparent border-b border-foreground/20 text-right text-foreground font-bold focus:outline-none focus:border-primary"
                                                        defaultValue={plan.reward_amount}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (val !== plan.reward_amount) updatePlan(plan.id, { reward_amount: val });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-foreground/10 pb-2">
                                                <span>Max Cap:</span>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        className="w-12 bg-transparent border-b border-foreground/20 text-right text-foreground font-bold focus:outline-none focus:border-primary"
                                                        defaultValue={plan.max_balance_cap}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            if (val !== plan.max_balance_cap) updatePlan(plan.id, { max_balance_cap: val });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Cooldown:</span>
                                                <span className="text-foreground">{plan.cooldown_hours}h</span>
                                            </div>
                                            <p className="text-xs italic opacity-50 pt-2">
                                                {plan.cooldown_hours >= 20 ? "Runs daily at UTC midnight if balance < cap." : "Runs every X hours."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="max-w-2xl mx-auto space-y-8">
                                <div className="bg-background border-2 border-foreground p-8 brutalist-shadow">
                                    <h3 className="text-xl font-syne font-bold mb-6 flex items-center gap-2">
                                        <Zap className="w-6 h-6 text-primary" /> Global Defaults
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="grid gap-2">
                                            <label className="font-mono text-sm font-bold uppercase tracking-wider">New User Free Credits</label>
                                            <p className="text-xs text-foreground/60 mb-2">Credits assigned to users immediately upon signup.</p>
                                            <div className="flex gap-4">
                                                <input
                                                    type="number"
                                                    className="flex-1 bg-accent/10 border-2 border-foreground p-3 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    value={settings['new_user_credits'] || '10'}
                                                    onChange={(e) => setSettings({ ...settings, new_user_credits: e.target.value })}
                                                />
                                                <button
                                                    onClick={() => saveSetting('new_user_credits', settings['new_user_credits'])}
                                                    disabled={isSavingStart}
                                                    className="bg-foreground text-background px-6 font-bold hover:bg-primary hover:text-foreground transition-colors border-2 border-transparent hover:border-foreground"
                                                >
                                                    {isSavingStart ? <Loader2 className="animate-spin" /> : "SAVE"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <ReportsDashboard />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
