import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cjsInterop } from "vite-plugin-cjs-interop";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(() => {
  const isProduction = process.env.NODE_ENV === "production";
  const noExternal = [
    /^@orderly.*$/,
    "@uiw/react-split",
    "@privy-io/react-auth",
  ];
  if (isProduction) {
    noExternal.push("ethers");
  }

  // Set the base path for assets in production builds (used for GitHub Pages)
  const basePath = process.env.PUBLIC_PATH || "/";

  return {
    base: basePath,
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    ssr: {
      noExternal,
      external: ["@privy-io/cross-app-connect/rainbow-kit"],
    },
    plugins: [
      remix({
        basename: basePath,
        ssr: false,
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
      tsconfigPaths(),
      cjsInterop({
        dependencies: ["bs58", "@coral-xyz/anchor", "lodash"],
      }),
      nodePolyfills({
        include: ["buffer", "crypto"],
      }),
    ],
  };
});
