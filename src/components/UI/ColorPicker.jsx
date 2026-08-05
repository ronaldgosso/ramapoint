import { useState } from 'react'

const PRESET_COLORS = [
  '#B8F7E4', '#7BE8C9', '#4DCFAC',
  '#FBBF24', '#F87171', '#60A5FA',
  '#A78BFA', '#F472B6', '#34D399',
  '#FB923C', '#E879F9', '#FFFFFF',
]

/**
 * ColorPicker — inline swatch grid + custom hex input
 */
export default function ColorPicker({ value, onChange, label = 'Color' }) {
  const [custom, setCustom] = useState(value || '#B8F7E4')

  const handleSwatchClick = (color) => {
    setCustom(color)
    onChange?.(color)
  }

  const handleCustomChange = (e) => {
    setCustom(e.target.value)
    onChange?.(e.target.value)
  }

  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <div className="color-picker-row">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            className={`color-swatch${value === color ? ' selected' : ''}`}
            style={{ background: color }}
            onClick={() => handleSwatchClick(color)}
            title={color}
            type="button"
          />
        ))}
      </div>
      <div className="color-custom">
        <input
          type="color"
          value={custom}
          onChange={handleCustomChange}
          title="Custom color"
        />
        <input
          type="text"
          className="field__input"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value)
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
              onChange?.(e.target.value)
            }
          }}
          placeholder="#B8F7E4"
          style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px' }}
        />
      </div>
    </div>
  )
}
