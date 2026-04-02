import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClawHQ — Modology Studios",
  description: "Command center for your OpenClaw agent ecosystem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${manrope.variable} antialiased`} style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold animate-pulse"
                style={{
                  background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
                  color: "#0e0e10",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                C
              </div>
              <div className="space-y-2 w-40">
                <div className="h-2 rounded-full animate-pulse" style={{ background: "var(--color-surface-2)" }} />
                <div className="h-2 rounded-full animate-pulse w-3/4 mx-auto" style={{ background: "var(--color-surface-2)" }} />
              </div>
            </div>
          </div>
        }>
          {children}
        </Suspense>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
