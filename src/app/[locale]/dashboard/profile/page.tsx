"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ProfileCard from "@/components/dashboard/ProfileCard";
import SettingsCard from "@/components/dashboard/SettingsCard";
import { useTranslations } from "next-intl";

type SessionUser = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    provider?: string;
    createdAt?: string | null;
};

const inputClassName =
    "w-full rounded-lg border border-brand-light/70 bg-brand-light/50 px-4 py-2.5 text-sm text-brand-dark transition-colors duration-200 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [name, setName] = useState("");
    const [image, setImage] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const t = useTranslations("Dashboard.Profile");

    useEffect(() => {
        if (session?.user) {
            const user = session.user as SessionUser;
            setName(user.name || "");
            setImage(user.image || "");
        }
    }, [session]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, image }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t("error"));
            await update();
            setMessage(t("success"));
        } catch (err) {
            setError(err instanceof Error ? err.message : t("error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <ProfileCard
                name={session?.user?.name || "Traveler"}
                email={session?.user?.email || ""}
                image={(session?.user as SessionUser | undefined)?.image || null}
                provider={(session?.user as SessionUser | undefined)?.provider || "credentials"}
                createdAt={(session?.user as SessionUser | undefined)?.createdAt || new Date().toISOString()}
            />

            <form onSubmit={handleUpdateProfile} className="space-y-6">
                <SettingsCard title={t("title")} description={t("description")}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                                {t("fullName")}
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputClassName}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                                {t("email")}
                            </label>
                            <input
                                value={session?.user?.email || ""}
                                readOnly
                                className={`${inputClassName} bg-brand-light text-brand-muted`}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-brand-muted">
                                {t("photoUrl")}
                            </label>
                            <input
                                value={image}
                                onChange={(e) => setImage(e.target.value)}
                                className={inputClassName}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:bg-brand-light/40"
                        >
                            {loading ? t("saving") : t("saveChanges")}
                        </button>
                    </div>
                    {message ? <p className="mt-4 text-sm font-medium text-brand-secondary">{message}</p> : null}
                    {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
                </SettingsCard>
            </form>
        </div>
    );
}
