import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, DM_Sans, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "./providers/theme-provider";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

const themeBootstrapScript = `
(() => {
  try {
    const saved = localStorage.getItem('theme');
    const theme = saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto';
    const hour = new Date().getHours();
    const resolved = theme === 'auto' ? (hour >= 6 && hour < 20 ? 'light' : 'dark') : theme;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    const themeColour = resolved === 'dark' ? '#0a0f1a' : '#faf8f5';
    let metaThemeColour = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColour) {
      metaThemeColour = document.createElement('meta');
      metaThemeColour.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColour);
    }
    metaThemeColour.setAttribute('content', themeColour);
  } catch {}
})();
`;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" }, // Warm cream for light mode
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },  // Deep blue-black for dark mode
  ],
}

export const metadata: Metadata = {
  title: "HiveCraic",
  description: "Comprehensive beekeeping management system for tracking hives, inspections, queens, and apiary health",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HiveCraic",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
