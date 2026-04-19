'use client'

interface Props {
  value: number // 0-11 (mês)
  onChange: (m: number) => void
  year: number
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function MonthFilter({ value, onChange, year }: Props) {
  const currentMonth = new Date().getMonth()
  const months = MESES.map((label, idx) => ({ idx, label, disabled: idx < currentMonth }))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <i className="fas fa-calendar" />
        <span>Período:</span>
      </div>
      <select
        className="form-select"
        style={{ minWidth: 160, fontSize: 13 }}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      >
        {months.filter(m => !m.disabled).map(m => (
          <option key={m.idx} value={m.idx}>{m.label} / {year}</option>
        ))}
      </select>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Disponível até dezembro/{year}
      </div>
    </div>
  )
}
