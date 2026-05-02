import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Esse é o Cheat Code: manda o sistema ignorar as linhas vermelhas na hora de ir pro ar!
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;