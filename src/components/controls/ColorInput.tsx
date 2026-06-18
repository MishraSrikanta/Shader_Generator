interface Props {
  label: string
  value: [number, number, number] // 0..1
  onChange: (v: [number, number, number]) => void
  onCommit?: () => void
}

function toHex([r, g, b]: [number, number, number]): string {
  const c = (x: number) =>
    Math.round(Math.max(0, Math.min(1, x)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function fromHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export default function ColorInput({ label, value, onChange, onCommit }: Props) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-white/60">{toHex(value)}</span>
        <label
          className="h-6 w-10 cursor-pointer rounded border border-edge"
          style={{ background: toHex(value) }}
        >
          <input
            type="color"
            className="h-0 w-0 opacity-0"
            value={toHex(value)}
            onChange={(e) => onChange(fromHex(e.target.value))}
            onBlur={onCommit}
          />
        </label>
      </div>
    </div>
  )
}
