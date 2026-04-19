'use client'

interface Props {
  value: number // 0-11 (mês)
  onChange: (m: number) => void
  year: number
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function MonthFilter({ value, onChange, year }: Props) {
  const currentMonth = new Date().getMonth()
  const months = MESES_ABREV.map((label, idx) => ({ idx, label, disabled: idx < currentMonth }))

  return (
    <select
      className="form-select"
      style={{ minWidth: 130, fontSize: 13, fontWeight: 600 }}
      value={value}
      onChange={e => onChange(parseInt(e.target.value))}
      title={`Disponível até dezembro/${year}`}
    >
      {months.filter(m => !m.disabled).map(m => (
        <option key={m.idx} value={m.idx}>{m.label} {year}</option>
      ))}
    </select>
  )
}
