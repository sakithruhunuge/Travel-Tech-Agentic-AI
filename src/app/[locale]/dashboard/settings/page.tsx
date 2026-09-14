"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import SettingsCard from "@/components/dashboard/SettingsCard";
import { useTranslations } from "next-intl";

type SessionUser = {
    provider?: string;
};

const inputClassName =
    "w-full rounded-lg border border-brand-light/70 bg-brand-light/50 px-4 py-2.5 text-sm text-brand-dark transition-colors duration-200 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20";

export default function SettingsPage() {
    const { data: session } = useSession();
    const provider = (session?.user as SessionUser | undefined)?.provider || "credentials";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const t = useTranslations("Dashboard.Settings");

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        if (password !== confirmPassword) {
            setError(t("mismatch"));
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/user/password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t("error"));
            setMessage(t("success"));
            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : t("error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <SettingsCard title={t("security")} description={t("securityDesc")}>
                {provider === "google" ? (
                    <p className="text-sm text-brand-muted">{t("googleManaged")}</p>
                ) : (
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-brand-muted">
                                {t("newPassword")}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputClassName}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-brand-muted">
                                {t("confirmPassword")}
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={inputClassName}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:bg-brand-light/40"
                        >
                            {loading ? t("updating") : t("changePassword")}
                        </button>
                        {message ? <p className="text-sm font-medium text-brand-secondary">{message}</p> : null}
                        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                    </form>
                )}
            </SettingsCard>

            <SettingsCard title={t("session")} description={t("sessionDesc")}>
                <button
                    onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                    className="rounded-lg border border-brand-light/70 px-5 py-2.5 text-sm font-medium text-brand-dark transition-colors duration-200 hover:bg-brand-light"
                >
                    {t("logout")}
                </button>
            </SettingsCard>

            <SettingsCard title={t("deleteAccount")} description={t("deleteDesc")}>
                <div className="space-y-3">
                    <input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={t("placeholder")}
                        className={inputClassName}
                    />
                    <button className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-700 transition-colors duration-200 hover:bg-rose-100">
                        {t("deleteButton")}
                    </button>
                </div>
            </SettingsCard>
        </div>
    );
}
