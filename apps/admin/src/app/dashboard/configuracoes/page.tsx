export const dynamic = 'force-dynamic'

import { getGhostSettings } from '@/actions/admin'
import { GhostSettingsForm } from '@/components/ghost-settings-form'

export default async function ConfiguracoesPage() {
  const settings = await getGhostSettings()

  return (
    <div className="max-w-2xl space-y-2">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configurações</h1>
      <p className="text-slate-400 dark:text-slate-500 text-sm mb-7">Controles operacionais da plataforma</p>

      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gold-500 rounded-full" />
          <h2 className="font-semibold text-slate-700 dark:text-slate-300">Participantes Virtuais</h2>
        </div>
        <GhostSettingsForm initial={settings} />
      </div>
    </div>
  )
}
