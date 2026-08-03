const MAP: Record<string, string> = {
  open:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed:    'bg-amber-50 text-amber-700 border-amber-200',
  resolved:  'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const LABEL: Record<string, string> = {
  open: 'Aberto', closed: 'Fechado', resolved: 'Resolvido', cancelled: 'Cancelado',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${MAP[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {LABEL[status] ?? status}
    </span>
  )
}
