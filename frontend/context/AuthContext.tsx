"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    credits: number;
    full_name?: string;
    phone?: string;
    is_admin?: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, otp: string) => Promise<void>;
    loginWithToken: (token: string) => Promise<void>;
    requestOtp: (email: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    updateProfile: (data: { full_name?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            // Set default header
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
            refreshUser().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const refreshUser = async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch (error) {
            console.error("Failed to fetch user", error);
            logout();
        }
    };

    const requestOtp = async (email: string) => {
        await api.post("/auth/request-otp", { email });
    };

    const login = async (email: string, otp: string) => {
        const { data } = await api.post("/auth/verify-otp", { email, otp });
        localStorage.setItem("token", data.access_token);
        api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
        await refreshUser();
        router.push("/");
    };

    const loginWithToken = async (token: string) => {
        localStorage.setItem("token", token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        await refreshUser();
        router.push("/");
    };

    const logout = () => {
        localStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
        setUser(null);
        router.push("/");
    };


    const updateProfile = async (data: { full_name?: string; phone?: string }) => {
        try {
            const { data: updatedUser } = await api.put("/auth/me", data);
            setUser(updatedUser);
        } catch (error) {
            console.error("Failed to update profile", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithToken, requestOtp, logout, refreshUser, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
