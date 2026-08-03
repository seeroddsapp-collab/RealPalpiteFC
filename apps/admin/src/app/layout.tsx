import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RealPalpiteFC — Admin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-stone-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
