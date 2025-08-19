/*
 * General helpers for number formatting, math and DOM.
 */

// Core number formatter with smart abbreviation
export const formatNumber = (x, options = {}) => {
  const defaults = {
    decimals: 1,           // Default decimal places
    maxDecimals: 3,        // Max decimals for small numbers
    useAbbreviation: true, // Whether to use K, M, B, etc.
    maxAbbreviation: 'Qa'  // Stop abbreviating at this level
  }
  const config = { ...defaults, ...options }
  
  // Handle special cases
  if (x === 0) return '0'
  if (x === Infinity) return '∞'
  if (x === -Infinity) return '-∞'
  if (isNaN(x)) return 'NaN'
  
  // For very small numbers, show more precision
  if (x < 0.01 && x > 0) {
    return x.toFixed(Math.min(config.maxDecimals, 3))
  }
  
  // For small numbers, show standard formatting
  if (x < 1000) {
    return x.toFixed(Math.min(config.decimals, config.maxDecimals))
  }
  
  // Abbreviation system
  if (config.useAbbreviation) {
    const abbreviations = [
      { threshold: 1e3, suffix: 'K' },
      { threshold: 1e6, suffix: 'M' },
      { threshold: 1e9, suffix: 'B' },
      { threshold: 1e12, suffix: 'T' },
      { threshold: 1e15, suffix: 'Qa' },
      { threshold: 1e18, suffix: 'Qi' },
      { threshold: 1e21, suffix: 'Sx' },
      { threshold: 1e24, suffix: 'Sp' },
      { threshold: 1e27, suffix: 'Oc' },
      { threshold: 1e30, suffix: 'No' },
      { threshold: 1e33, suffix: 'Dc' }
    ]
    
    for (const abbr of abbreviations) {
      if (x < abbr.threshold) {
        const val = x / (abbr.threshold / 1e3)
        const isWhole = val % 1 === 0
        const decimalPlaces = isWhole ? 0 : config.decimals
        return val.toFixed(decimalPlaces) + abbr.suffix
      }
    }
    
    // For truly massive numbers, use scientific notation
    return x.toExponential(2)
  }
  
  // Fallback to standard formatting
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: config.decimals
  }).format(x)
}

// Percentage formatter
export const formatPercent = (x) => {
  if (x < 0.1) return x.toFixed(2) + '%'
  if (x < 1) return x.toFixed(1) + '%'
  if (x < 10) return x.toFixed(1) + '%'
  return Math.round(x) + '%'
}

// Price formatter (shows more decimals for precision)
export const formatPrice = (x) => {
  if (x < 1) return x.toFixed(3)
  if (x < 10) return x.toFixed(2)
  if (x < 1000) return x.toFixed(1)
  return formatNumber(x)
}

// Legacy aliases for backward compatibility
export const F = formatNumber
export const F_Game = formatNumber
export const F_Price = formatPrice
export const F_Stats = formatNumber
export const F_Dashboard = formatNumber
export const F_Percent = formatPercent

// Remove unused functions
// export const F_Large = (x, options = {}) => { ... }
// export const F_Compact = (x) => F(x, { notation: 'compact', maximumFractionDigits: 1 })
// export const F_Precise = (x) => F(x, { notation: 'compact', maximumFractionDigits: 3 })
// export const F_Standard = (x) => F(x, { notation: 'standard', maximumFractionDigits: 0 })

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const now = () => Date.now()
export const rnd = (min, max) => min + Math.random() * (max - min)
export const chance = (p) => Math.random() < p
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
export const el = (sel) => document.querySelector(sel)

export const flashSave = (msg) => {
  const n = document.getElementById('savestatus')
  if (n) {
    n.textContent = msg
    n.style.opacity = '1'
    setTimeout(() => {
      n.style.opacity = '.6'
    }, 800)
  } else {
    let t = document.getElementById('toast')
    if (!t) {
      t = document.createElement('div')
      t.id = 'toast'
      document.body.appendChild(t)
    }
    t.textContent = msg
    t.style.opacity = '1'
    clearTimeout(t._timer)
    t._timer = setTimeout(() => {
      t.style.opacity = '0'
    }, 900)
  }
}
