import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import { QueryProvider } from '@/providers/query-provider'
import { Header } from '@/components/layout/header'
import { Toaster } from '@/components/ui/sonner'
import { SEO_CONFIG } from '@drug-platform/shared'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: SEO_CONFIG.DEFAULT_TITLE,
    template: SEO_CONFIG.TITLE_TEMPLATE
  },
  description: SEO_CONFIG.DEFAULT_DESCRIPTION,
  keywords: [
    'drug information', 
    'FDA approved drugs', 
    'medication database', 
    'healthcare professionals', 
    'pharmaceutical information',
    'drug labels',
    'medication safety',
    'prescription drugs'
  ],
  authors: [{ name: 'Drug Information Platform' }],
  creator: 'Drug Information Platform',
  publisher: 'Drug Information Platform',
  metadataBase: new URL(SEO_CONFIG.CANONICAL_URL),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SEO_CONFIG.CANONICAL_URL,
    title: SEO_CONFIG.DEFAULT_TITLE,
    description: SEO_CONFIG.DEFAULT_DESCRIPTION,
    siteName: 'Drug Information Platform',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Drug Information Platform'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_CONFIG.DEFAULT_TITLE,
    description: SEO_CONFIG.DEFAULT_DESCRIPTION,
    creator: SEO_CONFIG.TWITTER_HANDLE,
    images: ['/og-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <NuqsAdapter>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">
                {children}
              </main>
            </div>
            <Toaster />
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  )
}