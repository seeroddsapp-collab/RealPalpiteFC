import { Sidebar } from '@/components/sidebar'
import { MobileHeader } from '@/components/mobile-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — visível apenas em desktop */}
      <Sidebar />

      {/* Header + drawer — visível apenas em mobile */}
      <MobileHeader />

      {/* Conteúdo principal */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-18 lg:pt-8 min-h-screen dark:bg-navy-950">
        {children}
      </main>
    </div>
  )
}
