import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.sigce.canteen",
  appName: "SIGCE Canteen",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;

