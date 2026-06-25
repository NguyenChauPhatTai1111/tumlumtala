import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174,
        allowedHosts: ["otakusic.io"],
        proxy: {
            "/api": {
                target: "http://localhost:8888",
                changeOrigin: true,
            },
            "/ws": {
                target: "ws://localhost:8888",
                changeOrigin: true,
                ws: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@api": path.resolve(__dirname, "./src/api"),
            "@components": path.resolve(__dirname, "./src/components"),
            "@hooks": path.resolve(__dirname, "./src/hooks"),
            "@pages": path.resolve(__dirname, "./src/pages"),
            "@store": path.resolve(__dirname, "./src/store"),
            "@types": path.resolve(__dirname, "./src/types"),
            "@utils": path.resolve(__dirname, "./src/utils"),
            "@context": path.resolve(__dirname, "./src/context"),
            "@services": path.resolve(__dirname, "./src/services"),
            "@configs": path.resolve(__dirname, "./src/configs"),
            "@constants": path.resolve(__dirname, "./src/constants"),
            "@schema": path.resolve(__dirname, "./src/schema"),
        },
    },
});
