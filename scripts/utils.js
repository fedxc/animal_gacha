/*
 * General helpers for number formatting, math and DOM.
 */
export const F = (x) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(x)
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
