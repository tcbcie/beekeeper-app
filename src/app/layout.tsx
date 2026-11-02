import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "./providers/theme-provider";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { BottomSurfaceProvider } from '@/contexts/BottomSurfaceContext'
import InstallPrompt from "@/components/InstallPrompt";
import KeyboardInset from "@/components/KeyboardInset";
import { IOS_SPLASH_IMAGES } from "@/lib/ios-splash";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
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
    // Not black-translucent: its status bar text is always white, unreadable on the cream theme.
    statusBarStyle: "default",
    title: "HiveCraic",
    startupImage: IOS_SPLASH_IMAGES,
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-touch-icon.png",
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
        className="antialiased"
      >
        <BottomSurfaceProvider>
          <ThemeProvider>
            <ToastProvider>
              <ConfirmProvider>
                {children}
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <KeyboardInset />
        </BottomSurfaceProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
