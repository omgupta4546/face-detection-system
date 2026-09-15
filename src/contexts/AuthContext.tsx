import React, { createContext, useState, useEffect, useContext } from "react";
import api from "@/lib/api";

type User = {
    _id: string;
    name: string;
    email: string;
    role: "student" | "professor" | "admin" | "college_admin" | "super_admin";
    faceDataRegistered?: boolean;
} | null;

interface AuthContextType {
    user: User;
    loading: boolean;
    login: (email: string, password: string) => Promise<any>;
    register: (userData: any) => Promise<void>;
    googleLogin: (token: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    api: typeof api;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const res = await api.get("/auth/me");
                setUser(res.data);
            } catch (err) {
                console.error("Token invalid or expired");
                localStorage.removeItem("token");
                setUser(null);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
        return res.data.user;
    };

    const register = async (userData: any) => {
        const res = await api.post("/auth/register", userData);
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
    };

    const googleLogin = async (token: string) => {
        const res = await api.post("/auth/google", { token });
        localStorage.setItem("token", res.data.token);
        // Call checkAuth to re-fetch the full user profile and commit state
        // before the caller navigates, preventing the ProtectedRoute race condition.
        await checkAuth();
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, checkAuth, api }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
