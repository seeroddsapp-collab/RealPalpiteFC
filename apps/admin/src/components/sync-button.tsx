'use client'

import { useState } from 'react'
import { triggerSync } from '@/actions/admin'

export function SyncButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSync() {
    setState('loading')
    setMsg('')
    try {
      const result = await triggerSync()
      if (result.error) {
        setState('error')
        setMsg(result.error)
      } else {
        setState('ok')
        setMsg(`${result.inserted} novas · ${result.updated} atualizadas`)
        setTimeout(() => setState('idle'), 4000)
      }
    } catch (err) {
      setState('error')
      setMsg(String(err))
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span className={`text-sm font-medium ${state === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
          {state === 'ok' ? '✓ ' : '✗ '}{msg}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={state === 'loading'}
        className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'loading' ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sincronizando…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 1019 15.364" />
            </svg>
            Sincronizar Agora
          </>
        )}
      </button>
    </div>
  )
}
