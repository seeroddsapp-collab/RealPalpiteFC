import { Sidebar } from '@/components/sidebar'
import { MobileHeader } from '@/components/mobile-nav'
import { BottomNav } from '@/components/bottom-nav'
import { MobileNavProvider } from '@/components/mobile-nav-context'
import { InstallPrompt } from '@/components/install-prompt'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="flex min-h-screen">
        {/* Sidebar — visível apenas em desktop */}
        <Sidebar />

        {/* Header + drawer — visível apenas em mobile */}
        <MobileHeader />

        {/* Conteúdo principal */}
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-18 lg:pt-8 pb-24 lg:pb-0 min-h-screen dark:bg-navy-950 overflow-x-hidden">
          {children}
        </main>

        {/* Bottom nav flutuante — visível apenas em mobile */}
        <BottomNav />

        {/* Prompt de instalação PWA */}
        <InstallPrompt />
      </div>
    </MobileNavProvider>
  )
}
