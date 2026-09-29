import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';
import { GamesProvider } from '@/lib/game/GamesProvider';
import { NavigationProvider } from '@/lib/game/navigation';
import { GlossaryProvider } from '@/lib/glossary/GlossaryProvider';
import { AuthProvider } from '@/lib/supabase/AuthProvider';
import { ServiceWorker } from '@/components/ui/ServiceWorker';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { THEME_INIT_SCRIPT } from '@/components/ui/ThemeToggle';
import './globals.css';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mahjong tracker',
  description: 'Hong Kong mahjong scorekeeping for the table',
  applicationName: 'Mahjong tracker',
  appleWebApp: {
    capable: true,
    title: 'Mahjong',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale or userScalable here: capping zoom fails WCAG 1.4.4, and
  // people do pinch to read scores across a table.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0F3D33' },
    { media: '(prefers-color-scheme: dark)', color: '#0B2C25' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AuthProvider>
          <GamesProvider>
            <NavigationProvider>
              <GlossaryProvider>{children}</GlossaryProvider>
            </NavigationProvider>
          </GamesProvider>
        </AuthProvider>
        <ServiceWorker />
        <DebugPanel />
      </body>
    </html>
  );
}
