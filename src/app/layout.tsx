import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Equicrore — Personal Trading & Investment Portfolio',
  description: 'Track, analyse and showcase your investment portfolio across Indian stocks, US markets, and crypto.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('eq-theme')||'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=(t==='dark'?'dark':'light');})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
