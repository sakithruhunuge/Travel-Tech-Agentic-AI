"use client";

import { FileTextOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";

type StatsOverviewCardProps = {
    stats: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
};

export default function StatsOverviewCard({ stats }: StatsOverviewCardProps) {
    const t = useTranslations("Dashboard.Home");

    return (
        <div className="w-full rounded-2xl bg-white/60 backdrop-blur-sm p-6 border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Total section */}
                <div className="flex items-center gap-4 md:border-r border-slate-200/80 md:pr-10 flex-shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary flex-shrink-0">
                        <FileTextOutlined className="text-xl" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">{t("stats.total")}</p>
                        <h3 className="text-3xl font-black tabular-nums text-brand-dark mt-0.5">{stats.total}</h3>
                    </div>
                </div>

                {/* Grid Breakdown */}
                <div className="grid grid-cols-3 flex-grow gap-4 sm:gap-6">
                    {/* Pending */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-550 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">{t("stats.pending")}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-xl font-bold text-slate-800 tabular-nums">{stats.pending}</span>
                                <span className="text-[10px] text-brand-muted hidden sm:inline">{t("stats.awaitingReview")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Approved */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-l border-slate-200/80 pl-4 sm:pl-6">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-550 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">{t("stats.approved")}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-xl font-bold text-slate-800 tabular-nums">{stats.approved}</span>
                                <span className="text-[10px] text-brand-muted hidden sm:inline">{t("stats.confirmed")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Rejected */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-l border-slate-200/80 pl-4 sm:pl-6">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-550 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-brand-muted uppercase tracking-wider">{t("stats.rejected")}</p>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-xl font-bold text-slate-800 tabular-nums">{stats.rejected}</span>
                                <span className="text-[10px] text-brand-muted hidden sm:inline">{t("stats.needsAttention")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Visual distribution bar */}
            {stats.total > 0 && (
                <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                        style={{ width: `${(stats.approved / stats.total) * 100}%` }} 
                        className="h-full bg-emerald-500 transition-all duration-500" 
                        title={`Approved: ${stats.approved}`}
                    />
                    <div 
                        style={{ width: `${(stats.pending / stats.total) * 100}%` }} 
                        className="h-full bg-amber-500 transition-all duration-500" 
                        title={`Pending: ${stats.pending}`}
                    />
                    <div 
                        style={{ width: `${(stats.rejected / stats.total) * 100}%` }} 
                        className="h-full bg-rose-500 transition-all duration-500" 
                        title={`Rejected: ${stats.rejected}`}
                    />
                </div>
            )}
        </div>
    );
}
