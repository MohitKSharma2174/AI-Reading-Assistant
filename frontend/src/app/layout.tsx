import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from "../lib/ThemeContext";
import { AuthProvider } from "../context/AuthContext";

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "AI Reading Assistant",
  description: "Distraction-free offline reader with AI summaries and highlights.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        
        {/* Service Worker Setup: Register in production, unregister/cleanup in development */}
        {process.env.NODE_ENV === 'development' ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (let reg of regs) {
                      reg.unregister().then(function() {
                        console.log('Dev Mode: Unregistered active ServiceWorker to prevent HMR loops');
                      });
                    }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (let name of names) {
                      caches.delete(name).then(function() {
                        console.log('Dev Mode: Cleared Cache Storage:', name);
                      });
                    }
                  });
                }
              `
            }}
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(
                      function(reg) {
                        console.log('ServiceWorker registered successfully with scope:', reg.scope);
                      },
                      function(err) {
                        console.log('ServiceWorker registration failed:', err);
                      }
                    );
                  });
                }
              `
            }}
          />
        )}
      </body>
    </html>
  );
}
