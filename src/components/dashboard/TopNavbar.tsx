"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { LogoutOutlined, SearchOutlined, BellOutlined } from "@ant-design/icons";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

type TopNavbarProps = {
    title: string;
    subtitle?: string;
};

export default function TopNavbar({ title, subtitle }: TopNavbarProps) {
    const { data: session } = useSession();
    const user = session?.user;
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const t = useTranslations("Dashboard.TopNavbar");

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const notifications = [
        { id: 1, title: "Booking Confirmed", message: "Your trip to Sigiriya has been confirmed.", time: "2 hours ago", unread: true },
        { id: 2, title: "Special Offer", message: "Get 20% off on your next booking to Mirissa.", time: "1 day ago", unread: true },
        { id: 3, title: "Profile Updated", message: "Your profile information was updated successfully.", time: "3 days ago", unread: false },
    ];

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/35 backdrop-blur-lg px-6 py-4 md:px-8 shadow-sm">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800 md:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center rounded-xl bg-white/40 border border-white/30 px-3.5 py-2 transition-all duration-200 focus-within:border-white/60 focus-within:ring-2 focus-within:ring-white/20 focus-within:bg-white/60">
                    <SearchOutlined className="text-slate-500 text-base" />
                    <input
                        placeholder={t("searchPlaceholder")}
                        className="ml-2 w-64 bg-transparent text-sm placeholder:text-slate-450 text-slate-850 focus:outline-none"
                    />
                </div>

                <div className="relative" ref={notificationsRef}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative inline-flex items-center rounded-xl p-2.5 text-slate-600 hover:bg-white/30 transition-colors border border-transparent hover:border-white/20"
                    >
                        <BellOutlined className="text-lg" />
                        <span className="absolute top-1.5 right-1.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border-2 border-white">
                            {notifications.filter(n => n.unread).length}
                        </span>
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-hidden z-50 origin-top-right animate-fade-in-up">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100/50 bg-slate-50/50">
                                <h3 className="font-bold text-slate-800">{t("notifications")}</h3>
                                <button className="text-xs font-semibold text-brand-primary hover:text-brand-secondary transition-colors">{t("markAllRead")}</button>
                            </div>
                            <div className="max-h-[320px] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    <div className="flex flex-col">
                                        {notifications.map((notification) => (
                                            <div key={notification.id} className={`px-4 py-3 border-b border-slate-100/50 hover:bg-white/60 transition-colors cursor-pointer ${notification.unread ? 'bg-brand-primary/5' : ''}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={`text-sm ${notification.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap ml-2 mt-0.5">{notification.time}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-snug">{notification.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                        {t("noNew")}
                                    </div>
                                )}
                            </div>
                            <div className="p-2 border-t border-slate-100/50 bg-slate-50/50 text-center">
                                <button className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors py-1 px-3 w-full rounded-lg hover:bg-slate-200/50">
                                    {t("viewAll")}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3.5 border-l border-white/25 pl-6">
                    {user?.image ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-white/40">
                            <Image src={user.image} alt={user.name || "User"} fill className="object-cover" sizes="40px" />
                        </div>
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white shadow-sm">
                            {user?.name?.[0]?.toUpperCase() || "T"}
                        </div>
                    )}
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name || "Traveler"}</p>
                        <p className="text-xs font-semibold text-slate-500">{user?.email}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                        className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/20 p-2.5 text-slate-600 transition-all hover:bg-white/50 hover:text-slate-900"
                        title={t("signOut")}
                    >
                        <LogoutOutlined className="text-base" />
                    </button>
                </div>
            </div>
        </header>
    );
}

