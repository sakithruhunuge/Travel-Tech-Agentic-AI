export default function LoadingSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/40 backdrop-blur-sm ring-1 ring-white/10 border border-white/10" />
            ))}
        </div>
    );
}
