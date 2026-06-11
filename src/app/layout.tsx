import type { Metadata } from 'next'
import '../styles/globals.css'
import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Equicrore — Personal Trading & Investment Portfolio',
  description: 'Track, analyse and showcase your investment portfolio across Indian stocks, US markets, and crypto.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="0rjNKq5e79_erJ7egzTYCNpQlQEBTjVelX3aKvuKWjY" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('eq-theme')||'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=(t==='dark'?'dark':'light');})();`
        }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
