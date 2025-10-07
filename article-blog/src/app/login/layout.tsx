import type { Metadata } from "next";

export const metadata: Metadata = {
   title: "登录",
   description: "Book Store 登录页面",
   icons: {
      icon: "/logo.svg",
   },
};

export default function LoginLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return children;
}
