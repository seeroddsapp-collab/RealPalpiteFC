export const fmtBrl = (v: number) =>
  `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`

export const fmtDate = (s: string) =>
  new Date(s).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })

export const MODALITY_LABEL: Record<string, string> = {
  dupla_chance_resultado: 'Resultado 1X2',
  dupla_chance:           'Dupla Chance',
  total_de_gols:          'Total de Gols',
  placar_exato:           'Placar Exato',
}

export const STATUS_LABEL: Record<string, string> = {
  open:      'Aberto',
  closed:    'Fechado',
  resolved:  'Resolvido',
  cancelled: 'Cancelado',
}

export const STATUS_COLOR: Record<string, string> = {
  open:      'bg-green-100 text-green-800',
  closed:    'bg-yellow-100 text-yellow-800',
  resolved:  'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}
