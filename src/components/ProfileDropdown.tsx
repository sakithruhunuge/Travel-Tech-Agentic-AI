"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/context/ToastContext";
import { useLocale } from "next-intl";

export default function ProfileDropdown() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const { addToast } = useToast();
    const locale = useLocale();

    useEffect(() => {
        function onDoc(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: false });
            addToast("info", "Signed out");
            window.location.href = `/${locale}`;
        } catch {
            addToast("error", "Could not sign out. Please try again.");
        }
    };

    if (!session) return null;

    return (
        <div ref={ref} className="relative flex items-center">
            <button
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                }}
                className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-full bg-white/70 border border-slate-200/80 hover:bg-white shadow-sm transition-all focus:outline-none"
            >
                {session.user?.image ? (
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                        <Image src={session.user.image} alt={session.user.name || "Avatar"} fill className="object-cover" sizes="24px" referrerPolicy="no-referrer" />
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] flex items-center justify-center font-bold">
                        {(session.user?.name || "").slice(0, 1).toUpperCase()}
                    </div>
                )}
                <div className="text-left hidden xl:block max-w-[110px]">
                    <div className="text-xs font-bold text-slate-800 truncate leading-none">
                        {session.user?.name?.split(" ")[0] || session.user?.name}
                    </div>
                </div>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div role="menu" aria-label="Profile options" className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-lg border border-white/40 rounded-2xl shadow-xl overflow-hidden animate-fade-in-up z-50">
                    <div className="p-3 border-b border-slate-100">
                        <div className="text-sm font-bold text-slate-800">{session.user?.name}</div>
                        <div className="text-xxs text-slate-500 truncate">{session.user?.email}</div>
                    </div>
                    <div className="flex flex-col py-2">
                        {(session.user as any)?.role === "super_admin" ? (
                            <Link href={`/${locale}/admin`} className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">SuperAdmin Console</Link>
                        ) : (
                            <Link href={`/${locale}/dashboard`} className="px-4 py-2 text-sm hover:bg-slate-50">Dashboard</Link>
                        )}
                        <Link href={`/${locale}/dashboard/profile`} className="px-4 py-2 text-sm hover:bg-slate-50">Profile</Link>
                        <button onClick={handleSignOut} className="text-left px-4 py-2 text-sm hover:bg-slate-50">Sign Out</button>
                    </div>
                </div>
            )}
        </div>
    );
}
