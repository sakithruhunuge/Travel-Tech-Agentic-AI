"use client";

import React from "react";
import { useToast } from "@/context/ToastContext";

export default function Toasts() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    role="status"
                    className={`max-w-sm w-full px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 text-sm font-medium transition-transform transform origin-top-right animate-slide-in ${t.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : t.type === "error" ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-sky-50 border-sky-100 text-sky-700"
                        }`}
                >
                    <div className="flex-1">
                        {t.message}
                    </div>
                    <button onClick={() => removeToast(t.id)} aria-label="Dismiss" className="text-xs opacity-80 hover:opacity-100">
                        x
                    </button>
                </div>
            ))}
        </div>
    );
}
