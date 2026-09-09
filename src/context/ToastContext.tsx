"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextValue {
    toasts: ToastItem[];
    addToast: (type: ToastType, message: string, ttl?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, ttl = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const toast: ToastItem = { id, type, message };
        setToasts((prev) => [toast, ...prev]);
        if (ttl > 0) {
            setTimeout(() => removeToast(id), ttl);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
}
