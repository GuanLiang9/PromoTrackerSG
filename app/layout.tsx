import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { InstallPrompt } from "@/components/layout/install-prompt";
import { CheckInFab } from "@/components/checkins/check-in-fab";
import { ToastProvider } from "@/components/feedback/toast-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${APP_NAME} — Singapore Promotions Calendar`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>
          <TopBar />
          <main className="container max-w-5xl pb-[calc(6rem_+_env(safe-area-inset-bottom))] pt-4 md:pb-10">
            {children}
          </main>
          <BottomNav />
          <CheckInFab />
          <InstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
