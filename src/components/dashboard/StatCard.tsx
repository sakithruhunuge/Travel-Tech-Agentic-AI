import Image from "next/image";

type StatCardProps = {
    title: string;
    value: number | string;
    description: string;
    imageUrl: string;
};

export default function StatCard({ title, value, description, imageUrl }: StatCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-white p-6 transition-all duration-300 hover:-translate-y-1 border border-slate-200 flex items-center justify-between gap-4">
            <div className="absolute top-0 left-0 h-1 w-full bg-brand-primary/10 transition-all duration-300 group-hover:bg-brand-primary" />
            <div className="min-w-0 z-10">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-muted group-hover:text-brand-dark transition-colors">{title}</p>
                <div className="mt-2.5 flex items-baseline gap-2">
                    <p className="text-3xl font-black tabular-nums text-brand-dark tracking-tight">{value}</p>
                    <p className="text-xs font-medium text-brand-muted truncate">{description}</p>
                </div>
            </div>
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-brand-light border border-brand-light/70 group-hover:border-brand-primary/20 shadow-inner transition-all duration-300">
                <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    sizes="56px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
            </div>
        </div>
    );
}
