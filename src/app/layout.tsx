// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "BuildGuide AI",
  description:
    "AI-powered construction bid and photo analysis for homeowners and contractors.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" }, // fallback
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// ✅ NEW — this removes the yellow warning
export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics /> {/* ✅ Vercel analytics */}
      </body>
    </html>
  );
}