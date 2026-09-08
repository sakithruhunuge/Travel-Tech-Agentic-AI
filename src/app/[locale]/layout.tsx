import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Providers from "../Providers";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import LayoutWrapper from "@/components/LayoutWrapper";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenantResolver";
import { TenantBrandingProvider } from "@/context/TenantBrandingContext";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const hostname = headers().get("host") || "";
  try {
    const tenant = await resolveTenant({ hostname });
    const tagline = tenant.branding?.tagline || "Explore Your Next Adventure";
    return {
      title: `${tenant.name} - ${tagline}`,
      description: tenant.branding?.tagline || "Discover curated travel packages, premium tours, and unforgettable destinations.",
    };
  } catch (error) {
    const fallbackName = hostname.includes(".localhost") ? hostname.split(".")[0].toUpperCase() + " TRAVEL" : "Ceylon Travel";
    return {
      title: `${fallbackName} - Explore Your Next Adventure`,
      description: "Discover curated travel packages, premium tours, and unforgettable destinations.",
    };
  }
}

export default async function RootLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const hostname = headers().get("host") || "";
  let tenant = null;

  try {
    tenant = await resolveTenant({ hostname });
  } catch (error) {
    console.error("RootLayout tenant resolution error:", error);
    const sub = hostname.includes(".localhost") ? hostname.split(".")[0] : "ceylon";
    const name = sub.charAt(0).toUpperCase() + sub.slice(1) + " Travel";
    tenant = {
      id: null,
      slug: sub,
      name: name,
      status: "active" as const,
      isolation: "shared" as const,
      plan: "free" as const,
      branding: {
        primaryColor: "#FF8B50",
        secondaryColor: "#25A5FE",
        tagline: "Explore Your Next Adventure",
      },
    };
  }

  const primaryColor = tenant.branding?.primaryColor || "#FF8B50";
  const secondaryColor = tenant.branding?.secondaryColor || "#25A5FE";
  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --brand-primary: ${primaryColor};
                --brand-secondary: ${secondaryColor};
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-brand-light text-brand-dark antialiased min-h-screen flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <AntdRegistry>
            <TenantBrandingProvider tenant={tenant}>
              <Providers>
                <LayoutWrapper>{children}</LayoutWrapper>
              </Providers>
            </TenantBrandingProvider>
          </AntdRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
