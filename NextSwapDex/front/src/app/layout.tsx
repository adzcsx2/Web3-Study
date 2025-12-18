import type { Metadata } from "next";
import "./globals.css";
import AntdConfigProvider from "@/components/AntdConfigProvider";
import FOUCPrevention from "@/components/FOUCPrevention";
import RainBowKitProviders from "@/components/RainBowKitProviders";
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
    <html lang="zh-CN">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body className="m-0 p-0 h-full">
        <AntdConfigProvider>
          <RainBowKitProviders>{children}</RainBowKitProviders>
          <FOUCPrevention />
        </AntdConfigProvider>
      </body>
    </html>
  );
}
