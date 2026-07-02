import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    "vendor-react": ["react", "react-dom", "react-router-dom"],
                    "vendor-mui": ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
                    "vendor-mui-x": ["@mui/x-data-grid", "@mui/x-date-pickers"],
                    "vendor-query": ["@tanstack/react-query", "axios", "zustand"],
                    "vendor-forms": ["react-hook-form", "@hookform/resolvers", "yup"],
                    "vendor-media": ["hls.js"],
                    "vendor-markdown": ["react-markdown", "remark-gfm", "react-syntax-highlighter"],
                    "vendor-messenger": ["emoji-picker-react", "emoji-regex", "linkifyjs", "linkify-react", "react-virtuoso"],
                },
            },
        },
    },
    server: {
        host: "0.0.0.0",
        port: 5174,
        allowedHosts: [
            "otakusic.org",
            "otakusic.io",
        ],
        proxy: {
            "/api": {
                target: "http://localhost:8888",
                changeOrigin: true,
            },
            "/uploads": {
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
