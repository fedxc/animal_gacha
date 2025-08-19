/*
 * Rendering and DOM interaction.
 */
import { F, F_Game, F_Price, F_Stats, F_Dashboard, F_Percent, el } from './utils.js?v=20250820_3'
import { S, save, resetAll, partyUnits, ENEMY_TYPES } from './state.js?v=20250820_3'
import {
  computeUnitStats,
  levelUpCost,
  calcMetrics,
  HIST,
  prestigeEarned,
  transcendEarned,
  prestigeRequirements,
  canPrestige,
  canTranscend,
  prestigeReset,
  transcendReset,
  summonOnce,
  logMsg,
  autoManageJewelry,
  awardJewelry,
  prestigePotentialBreakdown,
  buyCurrency,
  sellCurrency,
  tradeCurrency,
  classPower,
  trackGoldSpending,
} from './logic.js?v=20250820_3'

// ===== CONSTANTS =====

// Character type color accents and anime-style SVG icons
const ROLE_COLORS = {
  TANK: '#3b82f6',    // Blue
  MAGE: '#8b5cf6',    // Purple  
  FIGHTER: '#ef4444', // Red
}

// Default fallback color for unknown roles
const DEFAULT_ROLE_COLOR = '#6b7280'

// Chart dimensions
const CHART_WIDTH = 200
const CHART_HEIGHT = 60
const CHART_PADDING = 2

// Upgrade costs and scaling
const UPGRADE_BASE_COSTS = {
  dps: 100,
  gold: 120,
  crit: 150
}
const UPGRADE_SCALING_FACTOR = 1.35

// Dev command defaults
const DEFAULT_DEV_COMMAND = "tickets 50 | gold 1e6 | win | dia 10 | ete 1 | ste 5 | neb 5 | vor 5 | jewelry"

// Power thresholds for visual effects
const HIGH_POWER_THRESHOLD = 80
const POWER_BAR_MAX = 100

// Currency trading defaults
const MIN_TRADE_AMOUNT = 0.01

// Anime-style SVG icons inspired by the character images
const SVG_ICONS = {
  TANK: `<svg viewBox="0 0 48 48" class="svg">
    <defs>
      <linearGradient id="tankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="earthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#047857;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#065f46;stop-opacity:1" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="earthGlow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Body -->
    <rect x="12" y="20" width="24" height="20" rx="4" fill="url(#tankGrad)" stroke="#1e40af" stroke-width="1"/>
    <!-- Head -->
    <circle cx="24" cy="16" r="8" fill="url(#tankGrad)" stroke="#1e40af" stroke-width="1"/>
    <!-- Terra claws/horns -->
    <path d="M18 12 Q16 8 18 4 Q20 2 18 0" stroke="url(#earthGrad)" stroke-width="3" fill="none" filter="url(#earthGlow)"/>
    <path d="M30 12 Q32 8 30 4 Q28 2 30 0" stroke="url(#earthGrad)" stroke-width="3" fill="none" filter="url(#earthGlow)"/>
    <!-- Claw details -->
    <path d="M17 10 Q15 6 17 2" stroke="#10b981" stroke-width="1.5" fill="none" opacity="0.9"/>
    <path d="M31 10 Q33 6 31 2" stroke="#10b981" stroke-width="1.5" fill="none" opacity="0.9"/>
    <!-- Eyes with earth energy -->
    <circle cx="22" cy="14" r="1.5" fill="#ffffff"/>
    <circle cx="26" cy="14" r="1.5" fill="#ffffff"/>
    <circle cx="22" cy="14" r="0.5" fill="#3b82f6"/>
    <circle cx="26" cy="14" r="0.5" fill="#3b82f6"/>
    <!-- Earth pupils -->
    <circle cx="22" cy="14" r="0.2" fill="#10b981" opacity="0.9"/>
    <circle cx="26" cy="14" r="0.2" fill="#10b981" opacity="0.9"/>
    <!-- Earth energy aura -->
    <circle cx="24" cy="8" r="3" fill="url(#earthGrad)" opacity="0.8" filter="url(#earthGlow)"/>
    <circle cx="24" cy="8" r="1.5" fill="#ffffff" opacity="0.9"/>
    <!-- Earth crystals in aura -->
    <polygon points="24,6 26,8 24,10 22,8" fill="#10b981" opacity="0.7" filter="url(#earthGlow)"/>
    <polygon points="20,8 22,10 20,12 18,10" fill="#059669" opacity="0.6" filter="url(#earthGlow)"/>
    <polygon points="28,8 30,10 28,12 26,10" fill="#047857" opacity="0.6" filter="url(#earthGlow)"/>
    <!-- Arms with earth armor -->
    <rect x="8" y="24" width="6" height="12" rx="3" fill="url(#tankGrad)" stroke="#1e40af" stroke-width="1"/>
    <rect x="34" y="24" width="6" height="12" rx="3" fill="url(#tankGrad)" stroke="#1e40af" stroke-width="1"/>
    <!-- Earth armor plates -->
    <rect x="9" y="26" width="4" height="3" rx="1" fill="url(#earthGrad)" opacity="0.8"/>
    <rect x="35" y="26" width="4" height="3" rx="1" fill="url(#earthGrad)" opacity="0.8"/>
    <rect x="9" y="32" width="4" height="3" rx="1" fill="url(#earthGrad)" opacity="0.8"/>
    <rect x="35" y="32" width="4" height="3" rx="1" fill="url(#earthGrad)" opacity="0.8"/>
    <!-- Earth particles around character -->
    <circle cx="10" cy="18" r="0.8" fill="#10b981" opacity="0.7" filter="url(#earthGlow)"/>
    <circle cx="38" cy="20" r="0.6" fill="#059669" opacity="0.8" filter="url(#earthGlow)"/>
    <circle cx="42" cy="14" r="0.5" fill="#047857" opacity="0.6" filter="url(#earthGlow)"/>
    <circle cx="6" cy="30" r="0.7" fill="#065f46" opacity="0.7" filter="url(#earthGlow)"/>
    <!-- Earth energy trails -->
    <path d="M8 16 Q12 18 16 16" stroke="#10b981" stroke-width="1" fill="none" opacity="0.5" filter="url(#earthGlow)"/>
    <path d="M32 18 Q36 20 40 18" stroke="#059669" stroke-width="1" fill="none" opacity="0.5" filter="url(#earthGlow)"/>
    <!-- Ground connection -->
    <path d="M20 40 Q24 42 28 40" stroke="url(#earthGrad)" stroke-width="2" fill="none" opacity="0.6" filter="url(#earthGlow)"/>
  </svg>`,
  
  MAGE: `<svg viewBox="0 0 48 48" class="svg">
    <defs>
      <linearGradient id="mageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="cosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#a855f7;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#5b21b6;stop-opacity:1" />
      </linearGradient>
      <filter id="magicGlow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="cosmicGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Lynx head -->
    <ellipse cx="24" cy="18" rx="7" ry="6" fill="url(#cosmicGrad)" stroke="#5b21b6" stroke-width="1"/>
    <!-- Lynx ears with tufts -->
    <path d="M17 12 L15 6 L19 10 Z" fill="url(#cosmicGrad)" stroke="#5b21b6" stroke-width="1"/>
    <path d="M31 12 L33 6 L29 10 Z" fill="url(#cosmicGrad)" stroke="#5b21b6" stroke-width="1"/>
    <!-- Ear tufts -->
    <path d="M16 8 L14 4 L18 6 Z" fill="#ffffff" opacity="0.9"/>
    <path d="M32 8 L34 4 L30 6 Z" fill="#ffffff" opacity="0.9"/>
    <!-- Mystical eyes -->
    <circle cx="22" cy="16" r="1.2" fill="#ffffff"/>
    <circle cx="26" cy="16" r="1.2" fill="#ffffff"/>
    <circle cx="22" cy="16" r="0.4" fill="#8b5cf6"/>
    <circle cx="26" cy="16" r="0.4" fill="#8b5cf6"/>
    <!-- Cosmic pupils -->
    <circle cx="22" cy="16" r="0.2" fill="#ffffff" opacity="0.8"/>
    <circle cx="26" cy="16" r="0.2" fill="#ffffff" opacity="0.8"/>
    <!-- Nose -->
    <circle cx="24" cy="18" r="0.5" fill="#fbbf24"/>
    <!-- Mystical robe with cosmic patterns -->
    <path d="M15 22 Q24 20 33 22 L31 40 L17 40 Z" fill="url(#mageGrad)" stroke="#6d28d9" stroke-width="1"/>
    <!-- Hood with star patterns -->
    <path d="M15 22 Q24 16 33 22 Q24 18 15 22" fill="url(#mageGrad)" stroke="#6d28d9" stroke-width="1"/>
    <!-- Cosmic staff -->
    <line x1="35" y1="28" x2="42" y2="22" stroke="#6d28d9" stroke-width="2"/>
    <circle cx="42" cy="22" r="2.5" fill="url(#cosmicGrad)" filter="url(#cosmicGlow)"/>
    <!-- Nebula orb -->
    <circle cx="18" cy="26" r="2.5" fill="url(#cosmicGrad)" filter="url(#cosmicGlow)"/>
    <circle cx="18" cy="26" r="1.5" fill="#ffffff" opacity="0.7"/>
    <!-- Cosmic aura particles -->
    <circle cx="12" cy="12" r="1" fill="#a855f7" opacity="0.6" filter="url(#magicGlow)"/>
    <circle cx="36" cy="14" r="0.8" fill="#7c3aed" opacity="0.7" filter="url(#magicGlow)"/>
    <circle cx="40" cy="30" r="0.6" fill="#8b5cf6" opacity="0.8" filter="url(#magicGlow)"/>
    <!-- Star patterns on robe -->
    <circle cx="20" cy="32" r="0.3" fill="#ffffff" opacity="0.6"/>
    <circle cx="28" cy="34" r="0.2" fill="#ffffff" opacity="0.5"/>
    <circle cx="24" cy="36" r="0.4" fill="#ffffff" opacity="0.4"/>
  </svg>`,
  
  FIGHTER: `<svg viewBox="0 0 48 48" class="svg">
    <defs>
      <linearGradient id="fighterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="vortexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#ea580c;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#c2410c;stop-opacity:1" />
      </linearGradient>
      <filter id="fireGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="vortexGlow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Body -->
    <ellipse cx="24" cy="28" rx="8" ry="10" fill="url(#fighterGrad)" stroke="#dc2626" stroke-width="1"/>
    <!-- Head -->
    <ellipse cx="24" cy="16" rx="6" ry="5" fill="url(#fighterGrad)" stroke="#dc2626" stroke-width="1"/>
    <!-- Vortex horns with spiral effect -->
    <path d="M18 12 Q16 8 18 4 Q20 2 18 0" stroke="url(#vortexGrad)" stroke-width="2.5" fill="none" filter="url(#vortexGlow)"/>
    <path d="M30 12 Q32 8 30 4 Q28 2 30 0" stroke="url(#vortexGrad)" stroke-width="2.5" fill="none" filter="url(#vortexGlow)"/>
    <!-- Horn spirals -->
    <path d="M17 10 Q15 6 17 2" stroke="#fbbf24" stroke-width="1" fill="none" opacity="0.8"/>
    <path d="M31 10 Q33 6 31 2" stroke="#fbbf24" stroke-width="1" fill="none" opacity="0.8"/>
    <!-- Eyes with vortex effect -->
    <circle cx="22" cy="14" r="1.2" fill="#ffffff"/>
    <circle cx="26" cy="14" r="1.2" fill="#ffffff"/>
    <circle cx="22" cy="14" r="0.4" fill="#ef4444"/>
    <circle cx="26" cy="14" r="0.4" fill="#ef4444"/>
    <!-- Vortex pupils -->
    <circle cx="22" cy="14" r="0.2" fill="#fbbf24" opacity="0.9"/>
    <circle cx="26" cy="14" r="0.2" fill="#fbbf24" opacity="0.9"/>
    <!-- Vortex energy from forehead -->
    <path d="M22 8 Q24 2 26 8 Q24 4 22 8" fill="url(#vortexGrad)" filter="url(#vortexGlow)"/>
    <path d="M22 8 Q24 4 26 8 Q24 6 22 8" fill="#fbbf24" opacity="0.8"/>
    <!-- Spinning vortex aura -->
    <circle cx="24" cy="8" r="2" fill="none" stroke="url(#vortexGrad)" stroke-width="1" opacity="0.6" filter="url(#vortexGlow)"/>
    <circle cx="24" cy="8" r="1.5" fill="none" stroke="#fbbf24" stroke-width="0.5" opacity="0.8"/>
    <!-- Legs -->
    <rect x="18" y="36" width="4" height="8" rx="2" fill="url(#fighterGrad)" stroke="#dc2626" stroke-width="1"/>
    <rect x="26" y="36" width="4" height="8" rx="2" fill="url(#fighterGrad)" stroke="#dc2626" stroke-width="1"/>
    <!-- Vortex tail -->
    <path d="M32 30 Q38 26 36 32" stroke="url(#vortexGrad)" stroke-width="2.5" fill="none" filter="url(#vortexGlow)"/>
    <path d="M32 30 Q38 26 36 32" stroke="#fbbf24" stroke-width="1" fill="none" opacity="0.7"/>
    <!-- Vortex particles around character -->
    <circle cx="12" cy="20" r="0.8" fill="#f97316" opacity="0.7" filter="url(#vortexGlow)"/>
    <circle cx="36" cy="24" r="0.6" fill="#ea580c" opacity="0.8" filter="url(#vortexGlow)"/>
    <circle cx="40" cy="16" r="0.5" fill="#fbbf24" opacity="0.6" filter="url(#vortexGlow)"/>
    <circle cx="8" cy="32" r="0.7" fill="#c2410c" opacity="0.7" filter="url(#vortexGlow)"/>
    <!-- Energy trails -->
    <path d="M10 18 Q14 20 18 18" stroke="#f97316" stroke-width="1" fill="none" opacity="0.5" filter="url(#vortexGlow)"/>
    <path d="M30 22 Q34 24 38 22" stroke="#ea580c" stroke-width="1" fill="none" opacity="0.5" filter="url(#vortexGlow)"/>
  </svg>`
}

const getRoleColor = (role) => ROLE_COLORS[role] || DEFAULT_ROLE_COLOR
const getRoleIcon = (role) => SVG_ICONS[role] || SVG_ICONS.TANK

export const renderTop = () => {
  const nGold = el('#gold'),
    nTick = el('#tickets'),
    nDia = el('#dia'),
    nEte = el('#ete'),
    nGph = el('#gph'),
    nTph = el('#tph')
  if (nGold) nGold.textContent = F_Game(S.gold)
  if (nTick) nTick.textContent = S.tickets
  if (nDia) nDia.textContent = F_Game(S.meta.diamantium)
  if (nEte) nEte.textContent = F_Game(S.meta.eternium)
  const m = calcMetrics()
  if (nGph) nGph.textContent = F_Game(m.gph)
  if (nTph) nTph.textContent = F_Game(m.tph)
  // Market top balances with trend indicators
  const pSte = el('#priceSte'), pNeb = el('#priceNeb'), pVor = el('#priceVor')
  if (pSte && S.market) {
    const price = F_Price(S.market.ste.price)
    const state = S.marketState?.ste
    let indicator = ''
    if (state) {
      if (state.crashTimer > 0) {
        indicator = ' 💥' // Crash
      } else if (state.trend > 0.3) {
        indicator = ' 📈' // Strong uptrend
      } else if (state.trend > 0.1) {
        indicator = ' ↗️' // Weak uptrend
      } else if (state.trend < -0.3) {
        indicator = ' 📉' // Strong downtrend
      } else if (state.trend < -0.1) {
        indicator = ' ↘️' // Weak downtrend
      }
    }
    pSte.textContent = price + indicator
  }
  if (pNeb && S.market) {
    const price = F_Price(S.market.neb.price)
    const state = S.marketState?.neb
    let indicator = ''
    if (state) {
      if (state.crashTimer > 0) {
        indicator = ' 💥' // Crash
      } else if (state.trend > 0.3) {
        indicator = ' 📈' // Strong uptrend
      } else if (state.trend > 0.1) {
        indicator = ' ↗️' // Weak uptrend
      } else if (state.trend < -0.3) {
        indicator = ' 📉' // Strong downtrend
      } else if (state.trend < -0.1) {
        indicator = ' ↘️' // Weak downtrend
      }
    }
    pNeb.textContent = price + indicator
  }
  if (pVor && S.market) {
    const price = F_Price(S.market.vor.price)
    const state = S.marketState?.vor
    let indicator = ''
    if (state) {
      if (state.crashTimer > 0) {
        indicator = ' 💥' // Crash
      } else if (state.trend > 0.3) {
        indicator = ' 📈' // Strong uptrend
      } else if (state.trend > 0.1) {
        indicator = ' ↗️' // Weak uptrend
      } else if (state.trend < -0.3) {
        indicator = ' 📉' // Strong downtrend
      } else if (state.trend < -0.1) {
        indicator = ' ↘️' // Weak downtrend
      }
    }
    pVor.textContent = price + indicator
  }
  
  // Class currency display
  const nSte = el('#stellarium'), nNeb = el('#nebulium'), nVor = el('#vortexium')
  if (nSte) {
    nSte.textContent = F_Game(S.meta.stellarium)
    nSte.style.color = getRoleColor('TANK')
  }
  if (nNeb) {
    nNeb.textContent = F_Game(S.meta.nebulium)
    nNeb.style.color = getRoleColor('MAGE')
  }
  if (nVor) {
    nVor.textContent = F_Game(S.meta.vortexium)
    nVor.style.color = getRoleColor('FIGHTER')
  }
}

export const renderEnemy = () => {
  const et = ENEMY_TYPES.find((e) => e.id === S.enemy.type)
  const nName = el('#enemyName'),
    nType = el('#enemyType'),
    nLvl = el('#enemyLvl'),
    nBar = el('#hpbar')
  if (nName) nName.textContent = et?.name || '—'
  if (nType) {
    nType.textContent = et?.id || '—'
    // Apply role color to enemy type if it matches a character role
    if (et?.id && ['TANK', 'MAGE', 'FIGHTER'].includes(et.id)) {
      nType.style.color = getRoleColor(et.id)
    } else {
      nType.style.color = ''
    }
  }
  if (nLvl) nLvl.textContent = 'Lv ' + S.enemy.level
  const pct = Math.max(0, Math.min(1, S.enemy.hp / S.enemy.maxHp))
  if (nBar) nBar.style.width = pct * 100 + '%'
  renderDashboard()
}

export const renderDashboard = () => {
  const m = calcMetrics()
  const grid = el('#dashGrid')
  if (!grid) return
  
  // Market trend information
  const getMarketTrend = (currency) => {
    const state = S.marketState?.[currency]
    if (!state) return '—'
    if (state.crashTimer > 0) return '💥 CRASH'
    if (state.trend > 0.3) return '📈 STRONG UP'
    if (state.trend > 0.1) return '↗️ UP'
    if (state.trend < -0.3) return '📉 STRONG DOWN'
    if (state.trend < -0.1) return '↘️ DOWN'
    return '➡️ FLAT'
  }
  
  grid.innerHTML = `
    <div class="dashboard-panel">
      <div class="dashboard-group combat-stats">
        <div class="group-header">⚔️ Combat</div>
        <div class="group-content">
          <div><b>DPS</b>${F_Dashboard(m.dps)}</div>
          <div><b>Kills/min</b>${F_Dashboard(m.kpm)}</div>
          <div><b>TTK</b>${F_Dashboard(m.ttk)}s</div>
        </div>
      </div>
      
      <div class="dashboard-group economy-stats">
        <div class="group-header">💰 Economy</div>
        <div class="group-content">
          <div><b>Gold/kill</b>${F_Dashboard(m.goldPerKill)}</div>
          <div><b>Gold/hr</b>${F_Dashboard(m.gph)}</div>
          <div><b>Tickets/hr</b>${F_Dashboard(m.tph)}</div>
        </div>
      </div>
    </div>
    
    <div class="dashboard-panel">
      <div class="dashboard-group defense-stats">
        <div class="group-header">🛡️ Defense</div>
        <div class="group-content">
          <div><b>Tank EHP</b>${F_Dashboard(m.tankEhp)}</div>
          <div><b>Req EHP</b>${F_Dashboard(m.reqEhp)}</div>
          <div><b>Guard</b>${F_Dashboard(m.guard)}</div>
        </div>
      </div>
      
      <div class="dashboard-group progression-stats">
        <div class="group-header">⭐ Progression</div>
        <div class="group-content">
          <div><b>Diamantium/hr</b>${F_Dashboard(m.diah)}</div>
          <div><b>Eternium/hr</b>${F_Dashboard(m.eteh)}</div>
          <div><b>ETA +1 Dia</b>${m.etaDiaH === Infinity ? '—' : F_Game(m.etaDiaH) + 'h'}</div>
        </div>
      </div>
    </div>
    
    <div class="dashboard-panel">
      <div class="dashboard-group loot-stats">
        <div class="group-header">🎁 Loot</div>
        <div class="group-content">
          <div><b>Weapons/hr</b>${F_Dashboard(m.weph)}</div>
          <div><b>Armor/hr</b>${F_Dashboard(m.arph)}</div>
          <div><b>Jewelry/hr</b>${F_Dashboard(m.jwph)}</div>
        </div>
      </div>
      
      <div class="dashboard-group market-stats">
        <div class="group-header">📊 Market</div>
        <div class="group-content">
          <div><b>STE Trend</b>${getMarketTrend('ste')}</div>
          <div><b>NEB Trend</b>${getMarketTrend('neb')}</div>
          <div><b>VOR Trend</b>${getMarketTrend('vor')}</div>
        </div>
      </div>
    </div>
  `
}

function drawSpark(id, arr) {
  const svg = el('#' + id)
  if (!svg) return
  svg.setAttribute('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
  const n = arr.length
  if (n < 2) {
    svg.innerHTML = ''
    return
  }
  let min = Math.min(...arr),
    max = Math.max(...arr)
  if (min === max) min = 0
  const pts = arr
    .map((v, i) => {
      const x = (i * (CHART_WIDTH - CHART_PADDING * 2)) / (n - 1) + CHART_PADDING
      const y = CHART_HEIGHT - CHART_PADDING - ((v - min) / (max - min || 1)) * (CHART_HEIGHT - CHART_PADDING * 2)
      return `${F_Game(x)},${F_Game(y)}`
    })
    .join(' ')
  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" opacity="0.9"/>`
}

export const drawAllSparks = () => {
  drawSpark('chartDps', HIST.dps)
  drawSpark('chartGold', HIST.gph)
  drawSpark('chartTickets', HIST.tph)
  // Market price charts
  if (S.market) {
    drawSpark('chartDia', S.market.dia.hist || [])
    drawSpark('chartEte', S.market.ete.hist || [])
    drawSpark('chartSte', S.market.ste.hist || [])
    drawSpark('chartNeb', S.market.neb.hist || [])
    drawSpark('chartVor', S.market.vor.hist || [])
  }
}

export const renderResets = () => {
  const wrap = el('#resets')
  const diaEarn = prestigeEarned()
  const eteEarn = transcendEarned()
  const req = prestigeRequirements()
  wrap.innerHTML = `
    <div class="reset-block">
      <b>Prestige ➜ Diamantium</b>
      <div class="tiny clamp2">
        Reset party; grants DIA. Requirements:
        <span class="nowrap"><b>Gold ≥ ${F_Game(req.needGold)}</b> (mandatory)</span>.
      </div>
      <div class="tiny" style="margin-top:.25rem">
        <span class="${req.goldOk ? '' : 'miss'}">${req.goldOk ? '✓' : '✗'} Gold ≥ ${F_Game(req.needGold)} (you: ${F_Game(S.gold)})</span>
        <span class="tag" title="Optional" style="margin-left:.5rem; ${req.starsOk ? 'color:var(--good)' : 'color:var(--ink-dim)'}">${req.starsOk ? '✓' : '○'} 5★ each (optional)</span>
        <span class="tag" title="Optional" style="margin-left:.25rem; ${req.jewelsOk ? 'color:var(--good)' : 'color:var(--ink-dim)'}">${req.jewelsOk ? '✓' : '○'} 3 jewels each (optional)</span>
      </div>
      ${(() => { const b = prestigePotentialBreakdown(); return `<div class=\"tiny\" style=\"margin:.25rem 0\">Potential breakdown: base ${b.base} × stars ${F_Game(b.starMult)} × jewels ${F_Game(b.jewelMult)} = <b>${b.total}</b><br>Based on total gold spent: ${F_Game(b.totalSpent)}</div>` })()}
      <button class="btn" id="btnPrestige" ${canPrestige() ? '' : 'disabled'} title="${canPrestige() ? 'Gain ' + diaEarn + ' Dia' : 'Meet all requirements to prestige'}">Prestige</button>
      <div class="tiny">Potential: +${diaEarn} DIA</div>
    </div>
    <div class="reset-block">
      <b>Transcend ➜ Eternium</b>
      <div class="tiny">Resets deeper; requires 25 DIA. Grants Eternium; bigger multipliers.</div>
      <button class="btn" id="btnTranscend" ${canTranscend() ? '' : 'disabled'} title="${canTranscend() ? 'Gain ~' + eteEarn + ' Ete' : 'Need 25 DIA'}">Transcend</button>
    </div>
  `
  const b1 = el('#btnPrestige'),
    b2 = el('#btnTranscend')
  if (b1)
    b1.onclick = () => {
      prestigeReset()
      render()
      save()
    }
  if (b2)
    b2.onclick = () => {
      transcendReset()
      render()
      save()
    }
}

function formatJewel(j) {
  if (!j) return '—'
  const eff = Object.entries(j.effects)
    .map(([k, v]) =>
      k === 'armorToDpsPct'
        ? `Armor→DPS ${F_Percent(v * 100)}`
        : `${k.replace('Pct', '')} +${F_Percent(v * 100)}`,
    )
    .join(' • ')
  const roleColor = getRoleColor(j.role)
  return `<span class="jewel-name">${j.name}</span> <span style="color: ${roleColor}">[${j.role}]</span> <span class="tiny">(Lv ${j.itemLevel} • req ${j.minUnitLevel}) • ${eff}</span>`
}

// ===== PARTY RENDERING HELPERS =====

const createUnitCard = (unit, metrics) => {
  const tmpl = el('#party-card')
  if (!tmpl) return null
  
  const node = tmpl.content.firstElementChild.cloneNode(true)
  const stats = computeUnitStats(unit)
  const levelCost = levelUpCost(unit.level)
  const canAfford = canAffordUpgrade(levelCost)
  const missingGold = calculateMissingGold(levelCost)
  const dpsShare = calculateDpsShare(stats.effDps, metrics.dps)
  const etaLevelH = calculateEtaLevel(missingGold, metrics.gph)
  
  setupUnitIcon(node, unit)
  setupUnitStyling(node, unit)
  setupUnitInfo(node, unit, stats, dpsShare, etaLevelH)
  setupLevelUpButton(node, unit, levelCost, canAfford, missingGold)
  setupUnitStats(node, stats, unit)
  setupPowerBar(node, unit)
  setupJewelryDisplay(node, unit)
  
  return node
}

const setupUnitIcon = (node, unit) => {
  if (!validateElement(node, 'Node') || !unit) {
    console.warn('Invalid parameters for setupUnitIcon:', { node, unit })
    return
  }
  
  const iconEl = node.querySelector('.icon')
  if (!validateElement(iconEl, 'Icon')) return
  
  const roleIcon = getRoleIcon(unit.role)
  iconEl.innerHTML = roleIcon
}

const setupUnitStyling = (node, unit) => {
  if (!validateElement(node, 'Node') || !unit) {
    console.warn('Invalid parameters for setupUnitStyling:', { node, unit })
    return
  }
  
  const roleColor = getRoleColor(unit.role)
  node.style.background = `linear-gradient(180deg, var(--panel), var(--panel-2)), linear-gradient(135deg, ${roleColor}10 0%, transparent 50%)`
}

const setupUnitInfo = (node, unit, stats, dpsShare, etaLevelH) => {
  const nameEl = node.querySelector('.name')
  const infoEl = node.querySelector('.info')
  
  if (nameEl) {
    nameEl.innerHTML = `<b>${unit.name}</b> <span class="role ${unit.role}">${unit.role}</span> <span class="stars">${'★'.repeat(unit.stars)}</span><br><span class="tiny">Prestige ${unit.prestige} • Transcend ${unit.transcend}</span>`
  }
  
  if (infoEl) {
    const armoryPower = Math.floor(unit.bestWeapon + unit.bestArmor)
    infoEl.innerHTML = `Lv ${unit.level} • Armory Power: ${F_Game(armoryPower)}<br>DPS Share: ${F_Percent(dpsShare * 100)}`
  }
}

const setupLevelUpButton = (node, unit, levelCost, canAfford, missingGold) => {
  const btn = node.querySelector('button.level')
  const missEl = node.querySelector('.actions .miss')
  
  if (btn) {
    btn.dataset.id = unit.id
    btn.disabled = !canAfford
    btn.innerHTML = `Level Up <small>(${F_Game(levelCost)})</small>`
  }
  
  if (missEl) {
    missEl.textContent = canAfford ? '' : `Need ${F_Game(missingGold)}`
  }
}

const setupUnitStats = (node, stats, unit) => {
  const statsEl = node.querySelector('.stats')
  if (!statsEl) return
  
  statsEl.innerHTML = `
    <div><b>DPS</b>${F_Stats(stats.effDps)}</div>
    <div><b>HP</b>${F_Stats(stats.hp)}</div>
    <div><b>EHP</b>${F_Stats(stats.ehp)}</div>
    <div><b>Crit</b>${F_Stats(Math.round(stats.crit * 100))}%</div>
    <div><b>Armor</b>${F_Stats(stats.armor)}</div>
    <div><b>Jewelry</b>${unit.jewelry.filter(Boolean).length}/3</div>`
}

const setupPowerBar = (node, unit) => {
  const power = classPower[unit.role.toLowerCase()]()
  const roleColor = getRoleColor(unit.role)
  
  const powerBar = document.createElement('div')
  powerBar.className = 'power-bar'
  powerBar.innerHTML = `
    <div class="power-fill" style="width: ${power}%; background: ${roleColor}"></div>
    <span class="power-text">${unit.role} Power: ${power}/${POWER_BAR_MAX}</span>
  `
  node.appendChild(powerBar)
  
  // Add role-colored border glow for high power characters
  if (power >= HIGH_POWER_THRESHOLD) {
    node.style.boxShadow = `0 0 10px ${roleColor}40`
  }
}

const setupJewelryDisplay = (node, unit) => {
  const jewelsEl = node.querySelector('.jewels')
  if (!jewelsEl) return
  
  const jewelry = [
    unit.jewelry[0] && S.inventory.jewelry[unit.jewelry[0]],
    unit.jewelry[1] && S.inventory.jewelry[unit.jewelry[1]],
    unit.jewelry[2] && S.inventory.jewelry[unit.jewelry[2]]
  ]
  
  jewelsEl.innerHTML = jewelry
    .map((j) => `<div class="jewel-item">${formatJewel(j)}</div>`)
    .join('')
}

export const renderParty = () => {
  const wrap = el('#partyList')
  if (!wrap) return
  
  wrap.innerHTML = ''
  const metrics = calcMetrics()
  
  partyUnits().forEach((unit) => {
    const card = createUnitCard(unit, metrics)
    if (card) {
      wrap.appendChild(card)
    }
  })
  
  wrap.querySelectorAll('button.level').forEach((b) => b.addEventListener('click', onLevelUp))
}

// ===== UPGRADE RENDERING HELPERS =====

const UPGRADE_DEFINITIONS = [
  { key: 'dps', name: 'Global DPS %', desc: '+5% party DPS per level' },
  { key: 'gold', name: 'Global Gold %', desc: '+7% gold per level' },
  { key: 'crit', name: 'Global Crit', desc: '+1% crit chance per level (capped)' },
]

// ===== UTILITY FUNCTIONS =====

const validateNumber = (value, name, min = 0) => {
  if (typeof value !== 'number' || value < min) {
    console.warn(`Invalid ${name}:`, value)
    return false
  }
  return true
}

const validateString = (value, name) => {
  if (!value || typeof value !== 'string') {
    console.warn(`Invalid ${name}:`, value)
    return false
  }
  return true
}

const validateElement = (element, name) => {
  if (!element) {
    console.warn(`${name} element not found`)
    return false
  }
  return true
}

const safeExecute = (fn, context, ...args) => {
  try {
    return fn.apply(context, args)
  } catch (error) {
    console.error(`Error executing ${fn.name || 'function'}:`, error)
    return null
  }
}

// ===== BUSINESS LOGIC HELPERS =====

const calculateUpgradeCost = (key, level) => {
  if (!validateString(key, 'upgrade key')) return 0
  if (!validateNumber(level, 'upgrade level')) return 0
  if (!UPGRADE_BASE_COSTS[key]) {
    console.warn(`Unknown upgrade key: ${key}`)
    return 0
  }
  return (UPGRADE_BASE_COSTS[key] * Math.pow(UPGRADE_SCALING_FACTOR, level)) | 0
}

const calculateMissingGold = (cost) => {
  if (!validateNumber(cost, 'cost')) return 0
  return Math.max(0, cost - S.gold)
}

const canAffordUpgrade = (cost) => {
  if (!validateNumber(cost, 'cost')) return false
  return S.gold >= cost
}

const calculateDpsShare = (unitDps, totalDps) => {
  if (!validateNumber(unitDps, 'unit DPS')) return 0
  if (!validateNumber(totalDps, 'total DPS')) return 0
  return totalDps > 0 ? unitDps / totalDps : 0
}

const calculateEtaLevel = (missingGold, goldPerHour) => {
  if (!validateNumber(missingGold, 'missing gold')) return Infinity
  if (!validateNumber(goldPerHour, 'gold per hour')) return Infinity
  return goldPerHour > 0 ? missingGold / goldPerHour : Infinity
}

const formatEtaText = (etaHours) => {
  if (typeof etaHours !== 'number') {
    console.warn('Invalid ETA hours:', etaHours)
    return '—'
  }
  return etaHours === Infinity ? '—' : F_Game(etaHours) + 'h'
}

const createUpgradeRow = (upgradeDef) => {
  const tmpl = el('#upgrade-row')
  if (!tmpl) return null
  
  const node = tmpl.content.firstElementChild.cloneNode(true)
  const level = S.upgrades[upgradeDef.key]
  const cost = calculateUpgradeCost(upgradeDef.key, level)
  const canAfford = canAffordUpgrade(cost)
  const missingGold = calculateMissingGold(cost)
  
  setupUpgradeInfo(node, upgradeDef, level)
  setupUpgradeButton(node, upgradeDef.key, cost, canAfford, missingGold)
  
  return node
}

const setupUpgradeInfo = (node, upgradeDef, level) => {
  const infoEl = node.querySelector('.info')
  if (!infoEl) return
  
  infoEl.innerHTML = `<b class="truncate">${upgradeDef.name}</b> <span class="tiny">Lv ${level}</span><div class="tiny clamp2">${upgradeDef.desc}</div>`
}

const setupUpgradeButton = (node, upgradeKey, cost, canAfford, missingGold) => {
  const btn = node.querySelector('button.buy')
  const missEl = node.querySelector('.actions .miss')
  
  if (btn) {
    btn.dataset.upg = upgradeKey
    btn.disabled = !canAfford
    btn.innerHTML = `Buy <small>(${F_Game(cost)})</small>`
  }
  
  if (missEl) {
    missEl.textContent = canAfford ? '' : `Need ${F_Game(missingGold)}`
  }
}

export const renderUpgrades = () => {
  const wrap = el('#upgrades')
  if (!wrap) return
  
  wrap.innerHTML = ''
  
  UPGRADE_DEFINITIONS.forEach((upgradeDef) => {
    const row = createUpgradeRow(upgradeDef)
    if (row) {
      wrap.appendChild(row)
    }
  })
  
  wrap.querySelectorAll('button.buy').forEach((b) => b.addEventListener('click', onBuyUpgrade))
}

export const renderJewelryBag = () => {
  const bag = el('#jewelryBag')
  if (!bag) return
  const list = Object.values(S.inventory.jewelry)
  if (list.length === 0) {
    bag.textContent = 'No jewelry yet'
    return
  }
  bag.innerHTML = list
    .map((j) => {
      const inUse = partyUnits().find((u) => u.jewelry.includes(j.id))
      const badge = inUse ? `<span class="tag">equipped</span>` : ''
      const eff = Object.entries(j.effects)
        .map(([k, v]) =>
          k === 'armorToDpsPct'
                    ? `Armor→DPS ${F_Percent(v * 100)}`
        : `${k.replace('Pct', '')} +${F_Percent(v * 100)}`,
        )
        .join(' • ')
      const req = partyUnits().some((u) => u.level >= j.minUnitLevel)
        ? `Requires Unit Lv ${j.minUnitLevel}`
        : `<span style="color:var(--bad)">Requires Unit Lv ${j.minUnitLevel}</span>`
      const roleColor = getRoleColor(j.role)
      return `<div>• <b>${j.name}</b> <span style="color: ${roleColor}">[${j.role}]</span> Lv ${j.itemLevel} ${badge}<br><span class="tiny">${req} • ${eff}</span></div>`
    })
    .join('')
}

export const renderLog = () => {
  const n = el('#log')
  if (n) n.innerHTML = S.log.map((x) => `<div>${x}</div>`).join('')
}

document.addEventListener('log', renderLog)

const handleLevelUp = (id) => {
  if (!validateString(id, 'unit ID')) return
  
  const unit = S.roster[id]
  if (!unit) {
    console.error(`Unit not found with ID: ${id}`)
    return
  }
  
  const cost = levelUpCost(unit.level)
  if (S.gold >= cost) {
    S.gold -= cost
    trackGoldSpending(cost)
    unit.level += 1
    autoManageJewelry()
    save()
    render()
  } else {
    console.warn(`Insufficient gold for level up. Need: ${cost}, Have: ${S.gold}`)
  }
}

export const onLevelUp = (e) => {
  const id = e.currentTarget.getAttribute('data-id')
  safeExecute(handleLevelUp, null, id)
}

const handleBuyUpgrade = (key) => {
  if (!validateString(key, 'upgrade key')) return
  
  if (!S.upgrades.hasOwnProperty(key)) {
    console.error(`Invalid upgrade key: ${key}`)
    return
  }
  
  const level = S.upgrades[key]
  const cost = calculateUpgradeCost(key, level)
  
  if (S.gold >= cost) {
    S.gold -= cost
    trackGoldSpending(cost)
    S.upgrades[key] += 1
    save()
    render()
  } else {
    console.warn(`Insufficient gold for upgrade. Need: ${cost}, Have: ${S.gold}`)
  }
}

export const onBuyUpgrade = (e) => {
  const key = e.currentTarget.getAttribute('data-upg')
  safeExecute(handleBuyUpgrade, null, key)
}

export const renderGachaResult = (txt) => {
  const box = el('#gachaResults')
  if (!box) return
  const line = document.createElement('div')
  
  // Add color accents to role mentions in gacha results
  let coloredTxt = txt
  if (txt.includes('TANK')) {
    coloredTxt = txt.replace(/TANK/g, `<span style="color: ${getRoleColor('TANK')}">TANK</span>`)
  }
  if (txt.includes('MAGE')) {
    coloredTxt = txt.replace(/MAGE/g, `<span style="color: ${getRoleColor('MAGE')}">MAGE</span>`)
  }
  if (txt.includes('FIGHTER')) {
    coloredTxt = txt.replace(/FIGHTER/g, `<span style="color: ${getRoleColor('FIGHTER')}">FIGHTER</span>`)
  }
  
  line.innerHTML = '• ' + coloredTxt
  box.prepend(line)
}

export const bindTopBar = () => {
  const sBtn = el('#saveBtn'),
    rBtn = el('#resetBtn'),
    dBtn = el('#devRun'),
    p1 = el('#pull1'),
    p10 = el('#pull10')
  if (sBtn) sBtn.addEventListener('click', save)
  if (rBtn) rBtn.addEventListener('click', resetAll)
  if (dBtn) dBtn.addEventListener('click', () => runDev(el('#devInput').value))
  if (p1)
    p1.addEventListener('click', () => {
      const r = summonOnce()
      if (r.ok) {
        renderGachaResult(r.msg)
        render()
        save()
      }
    })
  if (p10)
    p10.addEventListener('click', () => {
      let c = 0
      while (c++ < 10 && S.tickets > 0) {
        const r = summonOnce()
        if (r.ok) renderGachaResult(r.msg)
      }
      render()
      save()
    })
}

// Market bindings
function bindMarket() {
  const bBuyDia = el('#buyDia'), bSellDia = el('#sellDia'), amtDia = el('#buyDiaAmt')
  const bBuyEte = el('#buyEte'), bSellEte = el('#sellEte'), amtEte = el('#buyEteAmt')
  if (bBuyDia) bBuyDia.onclick = () => { buyCurrency('dia', Math.max(MIN_TRADE_AMOUNT, Number(amtDia.value||1)|0)); render(); save() }
  if (bSellDia) bSellDia.onclick = () => { sellCurrency('dia', Math.max(MIN_TRADE_AMOUNT, Number(amtDia.value||1)|0)); render(); save() }
  if (bBuyEte) bBuyEte.onclick = () => { buyCurrency('ete', Math.max(MIN_TRADE_AMOUNT, Number(amtEte.value||1)|0)); render(); save() }
  if (bSellEte) bSellEte.onclick = () => { sellCurrency('ete', Math.max(MIN_TRADE_AMOUNT, Number(amtEte.value||1)|0)); render(); save() }
  
  // New currency trading bindings
  const tradeBtn = el('#tradeBtn')
  const fromCurrency = el('#fromCurrency')
  const toCurrency = el('#toCurrency')
  const tradeAmount = el('#tradeAmount')
  
  if (tradeBtn) {
    tradeBtn.onclick = () => {
      const from = fromCurrency.value
      const to = toCurrency.value
      const amount = Math.max(MIN_TRADE_AMOUNT, Number(tradeAmount.value || 1))
      if (tradeCurrency(from, to, amount)) {
        render()
        save()
      }
    }
  }
  
  // Update exchange rate display
  const updateExchangeRate = () => {
    const from = fromCurrency.value
    const to = toCurrency.value
    const amount = Number(tradeAmount.value || 1)
    const exchangeRateEl = el('#exchangeRate')
    
    if (exchangeRateEl && S.market) {
      if (from === 'dia' && ['ste', 'neb', 'vor'].includes(to)) {
        const cost = amount * S.market[to].price
        const costFormatted = cost.toFixed(3)
        exchangeRateEl.textContent = `Cost: ${costFormatted} DIA`
      } else if (['ste', 'neb', 'vor'].includes(from) && ['ste', 'neb', 'vor'].includes(to)) {
        exchangeRateEl.textContent = `1:1 exchange`
      } else {
        exchangeRateEl.textContent = ''
      }
    }
  }
  
  // Bind exchange rate updates
  if (fromCurrency) fromCurrency.onchange = updateExchangeRate
  if (toCurrency) toCurrency.onchange = updateExchangeRate
  if (tradeAmount) tradeAmount.oninput = updateExchangeRate
  
  // Initial exchange rate display
  updateExchangeRate()
  
  // Export the function so it can be called from the main loop
  window.updateExchangeRate = updateExchangeRate
}

export const runDev = (cmd) => {
  if (!cmd) {
    // If no command entered, use the placeholder text
    cmd = DEFAULT_DEV_COMMAND
  }
  
  // Split by pipe to handle multiple commands
  const commands = cmd.split('|').map(c => c.trim()).filter(c => c)
  
  commands.forEach(command => {
    const [key, valRaw] = command.split(/\s+/)
    const val = Number(valRaw || 0)
    
    if (key === 'tickets') {
      S.tickets += val || 1
      logMsg(`DEV: +${val || 1} tickets`)
    } else if (key === 'gold') {
      S.gold += val || 0
      logMsg(`DEV: +${val || 0} gold`)
    } else if (key === 'win') {
      S.enemy.hp = 1
      logMsg('DEV: finishing current enemy')
    } else if (key === 'jewelry') {
      awardJewelry()
    } else if (key === 'diam' || key === 'dia') {
      S.meta.diamantium += val || 1
      logMsg(`DEV: +${val || 1} Diamantium`)
    } else if (key === 'ete' || key === 'eternium') {
      S.meta.eternium += val || 1
      logMsg(`DEV: +${val || 1} Eternium`)
    } else if (key === 'ste' || key === 'stellarium') {
      S.meta.stellarium += val || 1
      logMsg(`DEV: +${val || 1} Stellarium`)
    } else if (key === 'neb' || key === 'nebulium') {
      S.meta.nebulium += val || 1
      logMsg(`DEV: +${val || 1} Nebulium`)
    } else if (key === 'vor' || key === 'vortexium') {
      S.meta.vortexium += val || 1
      logMsg(`DEV: +${val || 1} Vortexium`)
    }
  })
  
  const di = el('#devInput')
  if (di) di.value = ''
  render()
  save()
}

export const render = () => {
  renderTop()
  renderEnemy()
  renderUpgrades()
  renderParty()
  renderJewelryBag()
  renderResets()
  // Ensure logs show on initial load as well, not only after events
  renderLog()
  bindMarket()
  drawAllSparks()
}

// Lightweight UI refresh for affordability states without rebuilding lists
export const refreshAffordability = () => {
  // Party level-up buttons
  document.querySelectorAll('button.level').forEach((btn) => {
    const id = btn.getAttribute('data-id')
    const u = id && S.roster[id]
    if (!u) return
    const cost = levelUpCost(u.level)
    const can = S.gold >= cost
    btn.disabled = !can
    btn.innerHTML = `Level Up <small>(${F_Game(cost)})</small>`
    const miss = Math.max(0, cost - S.gold)
    const missEl = btn.closest('.actions')?.querySelector('.miss')
    if (missEl) missEl.textContent = can ? '' : `Need ${F_Game(miss)}`
  })
  // Upgrade purchase buttons
  const upgradeCost = (key, lvl) => (UPGRADE_BASE_COSTS[key] * Math.pow(UPGRADE_SCALING_FACTOR, lvl)) | 0
  document.querySelectorAll('button.buy').forEach((btn) => {
    const key = btn.getAttribute('data-upg')
    if (!key) return
    const lvl = S.upgrades[key]
    const cost = upgradeCost(key, lvl)
    const can = S.gold >= cost
    btn.disabled = !can
    btn.innerHTML = `Buy <small>(${F_Game(cost)})</small>`
    const miss = Math.max(0, cost - S.gold)
    const missEl = btn.closest('.actions')?.querySelector('.miss')
    if (missEl) missEl.textContent = can ? '' : `Need ${F_Game(miss)}`
  })
}

// Update button affordances when gold or tickets change without full re-render
document.addEventListener('gold-change', refreshAffordability)
document.addEventListener('tickets-change', refreshAffordability)

