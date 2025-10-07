import type { Metadata } from "next";
import "./globals.css";
import AntdConfigProvider from "@/components/AntdConfigProvider";
import FOUCPrevention from "@/components/FOUCPrevention";
import { env } from "@/config/env";

export const metadata: Metadata = {
  title: env.appTitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="m-0 p-0 min-h-screen">
        <AntdConfigProvider>
          {children}
          <FOUCPrevention />
        </AntdConfigProvider>
      </body>
    </html>
  );
}
