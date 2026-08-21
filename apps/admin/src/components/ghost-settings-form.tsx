'use client'

import { useState, useTransition } from 'react'
import { updateGhostSettings } from '@/actions/admin'

type Settings = {
  ghost_mode_enabled: boolean
  ghost_max_initial: number
  ghost_ratio_at_close: number
}

export function GhostSettingsForm({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateGhostSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const exampleReal = 1
  const exampleGhostInitial = Math.min(settings.ghost_max_initial, 5)
  const exampleGhostAtClose = exampleReal * (settings.ghost_ratio_at_close - 1)
  const exampleTotal = exampleReal + exampleGhostAtClose
  const examplePrize = (exampleTotal * 10 * 0.95).toFixed(2).replace('.', ',')
  const examplePerWinner = (10 * 0.95).toFixed(2).replace('.', ',')
  const exampleDropped = exampleGhostInitial - exampleGhostAtClose

  return (
    <div className="space-y-6">
      {/* Toggle principal */}
      <div className="bg-white dark:bg-navy-800 rounded-xl border border-stone-200 dark:border-navy-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Modo Fantasma
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg">
              Adiciona participantes virtuais para tornar os bolões mais atrativos.
              O vencedor real sempre recebe <strong className="text-slate-700 dark:text-slate-300">R$&nbsp;tier&nbsp;×&nbsp;0,95</strong> — a casa retém os demais.
            </p>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => setSettings(s => ({ ...s, ghost_mode_enabled: !s.ghost_mode_enabled }))}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.ghost_mode_enabled ? 'bg-gold-500' : 'bg-slate-300 dark:bg-navy-600'
            }`}
            role="switch"
            aria-checked={settings.ghost_mode_enabled}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.ghost_mode_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${
          settings.ghost_mode_enabled ? 'text-gold-500' : 'text-slate-400 dark:text-slate-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${settings.ghost_mode_enabled ? 'bg-gold-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} />
          {settings.ghost_mode_enabled ? 'ATIVO' : 'INATIVO'}
        </div>
      </div>

      {/* Parâmetros */}
      <div className={`bg-white dark:bg-navy-800 rounded-xl border border-stone-200 dark:border-navy-700 p-6 space-y-5 transition-opacity ${
        !settings.ghost_mode_enabled ? 'opacity-40 pointer-events-none' : ''
      }`}>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
          Parâmetros
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Max inicial */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Máx. fantasmas ao criar pool
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                value={settings.ghost_max_initial}
                onChange={e => setSettings(s => ({ ...s, ghost_max_initial: Number(e.target.value) }))}
                className="flex-1 accent-gold-500"
              />
              <span className="w-8 text-center font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                {settings.ghost_max_initial}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Quantidade aleatória de 1 até este valor ao criar o pool.
            </p>
          </div>

          {/* Ratio ao fechar */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Total ao fechar (× reais)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={10}
                value={settings.ghost_ratio_at_close}
                onChange={e => setSettings(s => ({ ...s, ghost_ratio_at_close: Number(e.target.value) }))}
                className="flex-1 accent-gold-500"
              />
              <span className="w-8 text-center font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                {settings.ghost_ratio_at_close}×
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Ao fechar, total de participantes = reais × este valor.
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {settings.ghost_mode_enabled && (
        <div className="bg-navy-900/50 dark:bg-navy-950/50 border border-gold-500/20 rounded-xl p-5">
          <p className="text-xs font-bold text-gold-500 uppercase tracking-widest mb-3">Simulação — 1 jogador real, tier R$10</p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Pool criado com</span>
              <span className="text-slate-200">{exampleReal} real + {exampleGhostInitial} fantasmas = {exampleReal + exampleGhostInitial} exibido</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Ao fechar (ratio {settings.ghost_ratio_at_close}×)</span>
              <span className="text-slate-200">{exampleTotal} total ({exampleGhostAtClose} fantasmas)</span>
            </div>
            {exampleDropped > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Mensagem exibida</span>
                <span className="text-amber-400">&quot;{exampleDropped} desistiram antes do fechamento&quot;</span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2 flex justify-between text-slate-400">
              <span>Prêmio exibido</span>
              <span className="text-slate-200">R${examplePrize} ({exampleTotal} × R$10 × 0,95)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Prêmio por vencedor</span>
              <span className="text-slate-200">R${examplePrize} ÷ {exampleTotal} = R${examplePerWinner}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
              <span className="text-emerald-400">Real acerta →</span>
              <span className="text-emerald-400">recebe R${examplePerWinner} (perde R$0,50)</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-rose-400">Real erra →</span>
              <span className="text-rose-400">perde R$10,00 (casa retém)</span>
            </div>
          </div>
        </div>
      )}

      {/* Botão salvar */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-emerald-500 font-medium">✓ Salvo com sucesso</span>
        )}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-gold-500 text-white text-sm font-semibold hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}
