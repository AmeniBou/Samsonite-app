import { useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "samsonite_admin_token";
const USER_KEY = "samsonite_admin_user";

// In dev, the Vite proxy will forward to the Express server
const API_BASE = "/api";

interface AuthState {
    token: string | null;
    username: string | null;
    loading: boolean;
}

export const useAuth = () => {
    const [state, setState] = useState<AuthState>({
        token: localStorage.getItem(TOKEN_KEY),
        username: localStorage.getItem(USER_KEY),
        loading: true,
    });

    // Verify the token on mount
    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setState({ token: null, username: null, loading: false });
            return;
        }

        fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Token invalide");
                return res.json();
            })
            .then((data: { username: string }) => {
                setState({ token, username: data.username, loading: false });
            })
            .catch(() => {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                setState({ token: null, username: null, loading: false });
            });
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) return false;

            const data = await res.json();
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, data.username);
            setState({ token: data.token, username: data.username, loading: false });
            return true;
        } catch {
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setState({ token: null, username: null, loading: false });
    }, []);

    return {
        token: state.token,
        username: state.username,
        isAuthenticated: Boolean(state.token),
        loading: state.loading,
        login,
        logout,
    };
};
