type SettingsCardProps = {
    title: string;
    description: string;
    children: React.ReactNode;
};

export default function SettingsCard({ title, description, children }: SettingsCardProps) {
    return (
        <div className="rounded-2xl bg-white/60 backdrop-blur-sm p-6 border border-slate-200">
            <div className="mb-5 border-b border-white/10 pb-4">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{title}</p>
                <p className="mt-1 text-sm text-brand-muted">{description}</p>
            </div>
            {children}
        </div>
    );
}
