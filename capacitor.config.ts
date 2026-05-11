import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.iptvtrex.app",
  appName: "IPTV TREX",
  webDir: "out",
  server: {
    url: "https://trex-2-0.vercel.app",
    androidScheme: "https",
    hostname: "app",
    iosScheme: "ionic",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0d0d14",
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0d0d14",
    },
    Keyboard: { resize: "body" },
    CapacitorHttp: { enabled: true },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#0d0d14",
    webContentsDebuggingEnabled: true,
  },
};

export default config;
