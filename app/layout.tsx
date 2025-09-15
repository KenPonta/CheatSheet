import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { MonitoringProvider } from '../components/monitoring-provider'

export const metadata: Metadata = {
  title: 'CheeseSheet - Smart Study Guide Generator',
  description: 'Transform your documents into optimized compact study materials with enhanced visual representations and AI-powered content verification',
  generator: 'CheeseSheet',
  icons: {
    icon: '/B1.png',
    shortcut: '/B1.png',
    apple: '/B1.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <MonitoringProvider>
          {children}
        </MonitoringProvider>
      </body>
    </html>
  )
}
