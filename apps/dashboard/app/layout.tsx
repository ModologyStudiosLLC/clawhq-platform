import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { tenant, tenantAccentCSS } from "@/lib/tenant";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${tenant.name} — ${tenant.company}`,
  description: "Command center for your AI agent ecosystem",
};

// Inline script injected before paint to prevent flash of wrong theme
const themeScript = `(function(){var t=localStorage.getItem('clawhq-theme')||'dark';document.documentElement.classList.toggle('dark',t!=='light');})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs synchronously before paint — prevents FOUC on theme switch */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Tenant accent color override — empty string when using default ClawHQ branding */}
        {tenantAccentCSS() && <style dangerouslySetInnerHTML={{ __html: tenantAccentCSS() }} />}
      </head>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
            <div className="flex flex-col items-center gap-4">
              {/* Claw mark — inline SVG so it works before JS hydration */}
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 32, height: 32 }}>
                <polygon points="2,24 6,24 13,4 9,4" style={{ fill: "var(--color-primary)" }} opacity="0.45"/>
                <polygon points="8,24 12,24 19,4 15,4" style={{ fill: "var(--color-primary)" }} opacity="0.72"/>
                <polygon points="14,24 18,24 25,4 21,4" style={{ fill: "var(--color-primary)" }}/>
              </svg>
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
