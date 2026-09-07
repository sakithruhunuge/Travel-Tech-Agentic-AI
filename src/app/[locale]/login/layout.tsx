import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";

export const metadata: Metadata = {
  title: "Login - Horizon Travel",
  description: "Sign in to your Horizon Travel account",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AntdRegistry>
      {children}
    </AntdRegistry>
  );
}
