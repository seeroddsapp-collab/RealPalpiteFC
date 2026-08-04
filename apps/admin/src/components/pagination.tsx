import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  buildUrl: (page: number) => string
}

export function Pagination({ page, total, pageSize, buildUrl }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 dark:border-navy-700">
      <span className="text-xs text-slate-400 dark:text-slate-500">
        {start}–{end} de {total} registros
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildUrl(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-navy-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-gold-400 hover:text-gold-600 transition-colors"
          >
            <ChevronLeft size={13} /> Anterior
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-100 dark:border-navy-800 text-xs font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed">
            <ChevronLeft size={13} /> Anterior
          </span>
        )}
        <span className="inline-flex items-center px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildUrl(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-navy-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-gold-400 hover:text-gold-600 transition-colors"
          >
            Próximo <ChevronRight size={13} />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-100 dark:border-navy-800 text-xs font-medium text-slate-300 dark:text-slate-600 cursor-not-allowed">
            Próximo <ChevronRight size={13} />
          </span>
        )}
      </div>
    </div>
  )
}
