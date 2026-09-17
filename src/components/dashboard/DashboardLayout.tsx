"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import Sidebar from "@/components/dashboard/Sidebar";
import TopNavbar from "@/components/dashboard/TopNavbar";
import { motion, AnimatePresence } from "framer-motion";

import { useTenant } from "@/context/TenantBrandingContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const tenant = useTenant();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const locale = useLocale();
    const t = useTranslations("Dashboard.TopNavbar");
    const tHome = useTranslations("Dashboard.Home");

    useEffect(() => {
        if (status !== "authenticated") return;
        if (!session?.user) {
            router.replace(`/${locale}/login`);
        }
    }, [router, session, status, locale]);

    if (status === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-brand-light">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-light border-t-brand-dark" />
                    <p className="mt-4 text-sm font-medium text-brand-muted">{tHome("loadingDashboard")}</p>
                </div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            {/* Ambient background gradients for glassmorphism */}
            <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-orange-200/30 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-amber-100/45 blur-[120px] pointer-events-none" />
            <div className="absolute top-[30%] right-[20%] h-[500px] w-[500px] rounded-full bg-rose-100/20 blur-[100px] pointer-events-none" />

            <div className="flex min-h-screen relative z-10">
                {/* Desktop sidebar */}
                <div className={`hidden lg:flex ${isCollapsed ? "w-20" : "w-64"} transition-all duration-300 ease-in-out flex-shrink-0 h-screen fixed top-0 left-0 z-20`}>
                    <Sidebar 
                        onNavigate={() => undefined} 
                        onLogout={() => signOut({ callbackUrl: `/${locale}/login` })} 
                        isCollapsed={isCollapsed}
                        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    />
                </div>

                <div className={`flex flex-1 flex-col min-w-0 ${isCollapsed ? "lg:pl-20" : "lg:pl-64"} transition-all duration-300 ease-in-out`}>
                    {/* Mobile header bar */}
                    <div className="flex items-center gap-3 border-b border-white/20 bg-white/40 backdrop-blur-md px-4 py-3 lg:hidden">
                        <button
                            onClick={() => setMobileSidebarOpen((prev) => !prev)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 px-3 py-2 text-sm font-medium text-slate-650 transition-colors duration-200 hover:bg-white/60"
                            aria-label={mobileSidebarOpen ? t("close") : t("menu")}
                        >
                            {mobileSidebarOpen ? (
                                <>
                                    <CloseOutlined className="text-xs" />
                                    {t("close")}
                                </>
                            ) : (
                                <>
                                    <MenuOutlined className="text-xs" />
                                    {t("menu")}
                                </>
                            )}
                        </button>
                        <span className="text-sm font-semibold text-slate-800">{tenant?.name || "Ceylon Travel"}</span>
                    </div>

                    {/* Mobile sidebar overlay */}
                    {mobileSidebarOpen ? (
                        <div className="fixed inset-0 z-40 lg:hidden">
                            <div
                                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                                onClick={() => setMobileSidebarOpen(false)}
                            />
                            <div className="absolute inset-y-0 left-0 w-64 bg-white/90 backdrop-blur-lg shadow-lg">
                                <Sidebar
                                    onNavigate={() => setMobileSidebarOpen(false)}
                                    onLogout={() => signOut({ callbackUrl: `/${locale}/login` })}
                                    isCollapsed={false}
                                />
                            </div>
                        </div>
                    ) : null}

                    <TopNavbar title={t("title")} subtitle={t("subtitle")} />

                    <AnimatePresence mode="wait">
                        <motion.main
                            key={pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="flex-grow flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full"
                        >
                            {children}
                        </motion.main>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
