'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import logo from '@/imagens/logorp.png'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-prompt-dismissed'
const DISMISS_TTL   = 7 * 24 * 60 * 60 * 1000 // 7 dias

export function InstallPrompt() {
  const [platform, setPlatform]         = useState<'ios' | 'android' | null>(null)
  const [deferredPrompt, setDeferred]   = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible]           = useState(false)
  const [animating, setAnimating]       = useState(false)

  useEffect(() => {
    // Não mostra se já está instalado como PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (standalone) return

    // Não mostra se foi dispensado recentemente
    const ts = localStorage.getItem(DISMISSED_KEY)
    if (ts && Date.now() - Number(ts) < DISMISS_TTL) return

    const ua = navigator.userAgent.toLowerCase()
    const isIOS     = /iphone|ipad|ipod/.test(ua)
    const isSafari  = /safari/.test(ua) && !/crios|fxios/.test(ua)

    if (isIOS && isSafari) {
      setPlatform('ios')
      setTimeout(() => { setVisible(true); setTimeout(() => setAnimating(true), 30) }, 2500)
      return
    }

    // Android / Chrome Desktop
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setPlatform('android')
      setTimeout(() => { setVisible(true); setTimeout(() => setAnimating(true), 30) }, 1500)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setAnimating(false)
    setTimeout(() => setVisible(false), 300)
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible || !platform) return null

  return (
    /* Aparece acima do bottom nav (bottom-20 ≈ 80px) */
    <div className="lg:hidden fixed bottom-20 inset-x-3 z-50 pointer-events-none">
      <div
        className={`pointer-events-auto transition-all duration-300 ${
          animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl shadow-black/25 border border-stone-200 dark:border-navy-700 p-4">

          {/* Cabeçalho */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Image src={logo} alt="RPFC" width={46} height={46} className="rounded-xl shadow-sm" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                  RealPalpiteFC Admin
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Instalar como aplicativo
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-navy-800 transition-colors -mt-0.5 -mr-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Android / Chrome */}
          {platform === 'android' && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Adicione à tela inicial para acesso rápido, sem abrir o navegador.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 border border-stone-200 dark:border-navy-700 hover:bg-stone-50 dark:hover:bg-navy-800 transition-colors"
                >
                  Agora não
                </button>
                <button
                  onClick={install}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download size={15} />
                  Instalar
                </button>
              </div>
            </>
          )}

          {/* iOS / Safari */}
          {platform === 'ios' && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Para instalar no iPhone/iPad, siga os passos:
              </p>
              <div className="space-y-2.5 mb-4">
                <Step n={1}>
                  Toque no ícone{' '}
                  <IosShareIcon />
                  {' '}de <strong>Compartilhar</strong> no Safari
                </Step>
                <Step n={2}>
                  Role para baixo e toque em{' '}
                  <strong>"Adicionar à Tela de Início"</strong>
                </Step>
                <Step n={3}>
                  Toque em <strong>Adicionar</strong> para confirmar
                </Step>
              </div>
              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gold-500 hover:bg-gold-600 text-white transition-colors"
              >
                Entendido
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-gold-500/15 text-gold-600 dark:text-gold-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

/* Ícone de compartilhar do iOS (caixa com seta) */
function IosShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline w-4 h-4 mx-0.5 -mt-0.5 text-blue-500"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
