"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { env } from "@/config/env";
import { http } from "wagmi";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "wagmi/chains";

export const config = getDefaultConfig({
  appName: env.appTitle,
  projectId: env.walletConnectProjectId,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    ...(env.isDev || env.isTest ? [sepolia] : []),
  ],
  transports: {
    [mainnet.id]: http(
      "https://mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f"
    ),
    [polygon.id]: http(
      "https://polygon-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f"
    ),
    [optimism.id]: http(
      "https://optimism-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f"
    ),
    [arbitrum.id]: http(
      "https://arbitrum-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f"
    ),
    [sepolia.id]: http(
      "https://sepolia.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f"
    ),
  },
  ssr: true,
});
