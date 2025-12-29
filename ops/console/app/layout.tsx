/**
 * AgentOS Ops Console - Root Layout
 * Enterprise-grade dashboard layout with providers
 */

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

import { Providers } from './providers';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

// ============================================
// Font Configuration
// ============================================

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

// ============================================
// Metadata Configuration
// ============================================

export const metadata: Metadata = {
  title: {
    default: 'AgentOS Ops Console',
    template: '%s | AgentOS Ops Console',
  },
  description: 'Enterprise operations dashboard for managing AI agents',
  keywords: [
    'AgentOS',
    'AI Agents',
    'Operations Console',
    'Enterprise Dashboard',
    'Agent Management',
  ],
  authors: [{ name: 'AgentOS Team' }],
  creator: 'AgentOS',
  publisher: 'AgentOS',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AgentOS Ops Console',
    title: 'AgentOS Ops Console',
    description: 'Enterprise operations dashboard for managing AI agents',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentOS Ops Console',
    description: 'Enterprise operations dashboard for managing AI agents',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// ============================================
// Root Layout Component
// ============================================

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <Header />

              {/* Page Content */}
              <main className="main-content">
                <div className="content-wrapper">{children}</div>
              </main>
            </div>
          </div>

          {/* Global UI Elements */}
          <ToastContainer />
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}

// ============================================
// Toast Container Component
// ============================================

function ToastContainer() {
  return (
    <div
      id="toast-container"
      className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    />
  );
}

// ============================================
// Command Palette Placeholder
// ============================================

function CommandPalette() {
  // This would be implemented with a proper modal/dialog component
  // For now, it's a placeholder that listens for Cmd+K
  return null;
}
