import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default async function DashboardRootLayout({ children, params: { locale } }: { children: React.ReactNode, params: { locale: string } }) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect(`/${locale}/login`);
    }

    return <DashboardLayout>{children}</DashboardLayout>;
}
