import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import AntdConfigProvider from "@/components/AntdConfigProvider";

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
      <body className="flex m-0 p-0 min-h-[95vh]">
        <AntdConfigProvider>{children}</AntdConfigProvider>
      </body>
    </html>
  );
}
