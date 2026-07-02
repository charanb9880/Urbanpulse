import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AICopilot from "@/components/AICopilot";
import Script from "next/script";

export const metadata: Metadata = {
  title: "UrbanPulse AI",
  description: "The Living Pulse of Bengaluru",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          {children}
          <AICopilot />
        </AuthProvider>
      </body>
    </html>
  );
}
