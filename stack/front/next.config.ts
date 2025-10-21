import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.bilibili.com",
      },
      {
        protocol: "https",
        hostname: "www.baidu.com",
      },
      {
        protocol: "https",
        hostname: "i2.hdslb.com",
      },
    ],
  },
  async rewrites() {
    // 动态获取代理目标地址
    const getProxyTarget = () => {
      // 优先使用环境变量，如果没有则使用默认值
      return process.env.NEXT_PUBLIC_BASE_API;
    };

    const baseUrl = getProxyTarget();

    console.log(`🔄 API代理配置: /api/* -> ${baseUrl}/api/*`);

    return [
      {
        source: "/api/:path*",
        destination: `${baseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
