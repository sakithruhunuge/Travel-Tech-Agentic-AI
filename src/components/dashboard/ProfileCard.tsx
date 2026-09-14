import Image from "next/image";
import { useTranslations } from "next-intl";

type ProfileCardProps = {
    name: string;
    email: string;
    image?: string | null;
    provider: string;
    createdAt: string;
};

export default function ProfileCard({ name, email, image, provider, createdAt }: ProfileCardProps) {
    const t = useTranslations("Dashboard.Profile");
    return (
        <div className="rounded-2xl bg-white/60 backdrop-blur-sm p-6 border border-slate-200">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/20 text-xl font-semibold text-brand-dark">
                    {image ? (
                        <Image src={image} alt={name} width={64} height={64} className="h-full w-full object-cover" />
                    ) : (
                        name[0]?.toUpperCase() || "U"
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-brand-dark">{name}</h3>
                    <p className="text-sm text-brand-muted">{email}</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <span className="rounded-md border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-brand-dark">
                            {provider === "google" ? "Google" : t("emailPassword")}
                        </span>
                        <span className="rounded-md border border-brand-secondary/20 bg-brand-secondary/10 px-2.5 py-1 text-xs font-medium text-brand-secondary">
                            {t("joined")} {new Date(createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
