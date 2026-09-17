type EmptyStateProps = {
    title: string;
    description: string;
    action?: React.ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="rounded-2xl bg-white/60 backdrop-blur-sm p-10 text-center ring-1 ring-white/10 border border-white/10">
            <h3 className="text-base font-semibold text-brand-dark">{title}</h3>
            <p className="mt-2 text-sm text-brand-muted">{description}</p>
            {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
        </div>
    );
}
