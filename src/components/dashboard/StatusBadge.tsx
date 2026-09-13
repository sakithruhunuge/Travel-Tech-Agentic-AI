import { useTranslations } from "next-intl";

type StatusBadgeProps = {
    status: string;
};

const statusStyles: Record<string, string> = {
    pending: "bg-brand-primary/10 text-brand-primary border border-brand-primary/20",
    approved: "bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20",
    rejected: "bg-rose-100/70 text-rose-800 border border-rose-200",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const normalized = status.toLowerCase();
    const t = useTranslations("Dashboard.Status");
    return (
        <span
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold capitalize tracking-wide ${statusStyles[normalized] || "bg-white/10 text-brand-muted border border-white/10"
                }`}
        >
            {t(normalized)}
        </span>
    );
}
