/*
 * Rendering and DOM interaction.
 */
import { F, F_Game, F_Price, F_Stats, F_Dashboard, F_Percent, el } from './utils.js?v=20250820_1'
import { S, save, resetAll, partyUnits, ENEMY_TYPES } from './state.js'
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
} from './logic.js?v=20250820_1'

// Character type color accents and anime-style SVG icons
const ROLE_COLORS = {
  TANK: '#3b82f6',    // Blue
  MAGE: '#8b5cf6',    // Purple  
  FIGHTER: '#ef4444', // Red
}

// Anime-style SVG icons inspired by the character images
const SVG_ICONS = {
  TANK: `<svg viewBox="0 0 48 48" class="svg">
    <defs>
      <linearGradient id="tankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
    <!-- Horns -->
    <path d="M18 12 Q16 8 18 4" stroke="#1e40af" stroke-width="2" fill="none"/>
    <path d="M30 12 Q32 8 30 4" stroke="#1e40af" stroke-width="2" fill="none"/>
    <!-- Eyes -->
    <circle cx="22" cy="14" r="1.5" fill="#ffffff"/>
    <circle cx="26" cy="14" r="1.5" fill="#ffffff"/>
    <circle cx="22" cy="14" r="0.5" fill="#3b82f6"/>
    <circle cx="26" cy="14" r="0.5" fill="#3b82f6"/>
    <!-- Energy aura -->
    <circle cx="24" cy="8" r="3" fill="#60a5fa" opacity="0.8" filter="url(#glow)"/>
    <circle cx="24" cy="8" r="1.5" fill="#ffffff" opacity="0.9"/>
    <!-- Arms -->
    <rect x="8" y="24" width="6" height="12" rx="3" fill="url(#tankGrad)" stroke="#1e40af" stroke-width="1"/>
    <rect x="34" y="24" width="6" height="12" rx="3" fill="url(#tankGrad)" stroke="#1e40af" stroke-width="1"/>
  </svg>`,
  
  MAGE: `<svg viewBox="0 0 48 48" class="svg">
    <defs>
      <linearGradient id="mageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
      </linearGradient>
      <filter id="magicGlow">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Cat head -->
    <ellipse cx="24" cy="18" rx="6" ry="5" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1"/>
    <!-- Cat ears -->
    <path d="M18 14 L16 8 L20 12 Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1"/>
    <path d="M30 14 L32 8 L28 12 Z" fill="#8b5cf6" stroke="#6d28d9" stroke-width="1"/>
    <!-- Eyes -->
    <circle cx="22" cy="16" r="1" fill="#ffffff"/>
    <circle cx="26" cy="16" r="1" fill="#ffffff"/>
    <circle cx="22" cy="16" r="0.3" fill="#8b5cf6"/>
    <circle cx="26" cy="16" r="0.3" fill="#8b5cf6"/>
    <!-- Nose -->
    <circle cx="24" cy="18" r="0.5" fill="#fbbf24"/>
    <!-- Robe -->
    <path d="M16 22 Q24 20 32 22 L30 40 L18 40 Z" fill="url(#mageGrad)" stroke="#6d28d9" stroke-width="1"/>
    <!-- Hood -->
    <path d="M16 22 Q24 16 32 22 Q24 18 16 22" fill="url(#mageGrad)" stroke="#6d28d9" stroke-width="1"/>
    <!-- Staff -->
    <line x1="36" y1="28" x2="42" y2="22" stroke="#6d28d9" stroke-width="2"/>
    <circle cx="42" cy="22" r="2" fill="#8b5cf6" filter="url(#magicGlow)"/>
    <!-- Magic orb -->
    <circle cx="20" cy="26" r="2" fill="#a78bfa" filter="url(#magicGlow)"/>
    <circle cx="20" cy="26" r="1" fill="#ffffff" opacity="0.8"/>
  </svg>`,
  
  FIGHTER: `<svg viewBox="0 0 48 48" class="svg">
    <defs>
      <linearGradient id="fighterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
      </linearGradient>
      <filter id="fireGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
    <!-- Horns -->
    <path d="M18 12 Q16 6 18 2" stroke="#dc2626" stroke-width="2" fill="none"/>
    <path d="M30 12 Q32 6 30 2" stroke="#dc2626" stroke-width="2" fill="none"/>
    <!-- Eyes -->
    <circle cx="22" cy="14" r="1.2" fill="#ffffff"/>
    <circle cx="26" cy="14" r="1.2" fill="#ffffff"/>
    <circle cx="22" cy="14" r="0.4" fill="#ef4444"/>
    <circle cx="26" cy="14" r="0.4" fill="#ef4444"/>
    <!-- Fire from forehead -->
    <path d="M22 8 Q24 2 26 8 Q24 4 22 8" fill="#f97316" filter="url(#fireGlow)"/>
    <path d="M22 8 Q24 4 26 8 Q24 6 22 8" fill="#fbbf24" opacity="0.8"/>
    <!-- Legs -->
    <rect x="18" y="36" width="4" height="8" rx="2" fill="url(#fighterGrad)" stroke="#dc2626" stroke-width="1"/>
    <rect x="26" y="36" width="4" height="8" rx="2" fill="url(#fighterGrad)" stroke="#dc2626" stroke-width="1"/>
    <!-- Tail -->
    <path d="M32 30 Q38 26 36 32" stroke="#dc2626" stroke-width="2" fill="none"/>
  </svg>`
}

const getRoleColor = (role) => ROLE_COLORS[role] || '#6b7280'
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
  // Market top balances
  const pSte = el('#priceSte'), pNeb = el('#priceNeb'), pVor = el('#priceVor')
      if (pSte && S.market) pSte.textContent = F_Price(S.market.ste.price)
    if (pNeb && S.market) pNeb.textContent = F_Price(S.market.neb.price)
    if (pVor && S.market) pVor.textContent = F_Price(S.market.vor.price)
  
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
  grid.innerHTML = [
    `<div><b>DPS</b>${F_Dashboard(m.dps)}</div>`,
    `<div><b>Kills/min</b>${F_Dashboard(m.kpm)}</div>`,
    `<div><b>TTK</b>${F_Dashboard(m.ttk)}s</div>`,
    `<div><b>Gold/kill</b>${F_Dashboard(m.goldPerKill)}</div>`,
    `<div><b>Gold/hr</b>${F_Dashboard(m.gph)}</div>`,
    `<div><b>Tickets/hr</b>${F_Dashboard(m.tph)}</div>`,
    `<div><b>Weapons/hr</b>${F_Dashboard(m.weph)}</div>`,
    `<div><b>Armor/hr</b>${F_Dashboard(m.arph)}</div>`,
    `<div><b>Jewelry/hr</b>${F_Dashboard(m.jwph)}</div>`,
    `<div><b>Diamantium/hr</b>${F_Dashboard(m.diah)}</div>`,
    `<div><b>Eternium/hr</b>${F_Dashboard(m.eteh)}</div>`,
    `<div><b>ETA +1 Dia</b>${m.etaDiaH === Infinity ? '—' : F_Game(m.etaDiaH) + 'h'}</div>`,
    `<div><b>ETA +1 Ete</b>${m.etaEteH === Infinity ? '—' : F_Game(m.etaEteH) + 'h'}</div>`,
    // Party balance diagnostics
          `<div><b>Tank EHP</b>${F_Dashboard(m.tankEhp)}</div>`,
      `<div><b>Req EHP</b>${F_Dashboard(m.reqEhp)}</div>`,
      `<div><b>Guard</b>${F_Dashboard(m.guard)}</div>`,
  ].join('')
}

function drawSpark(id, arr) {
  const svg = el('#' + id)
  if (!svg) return
  const w = 200,
    h = 60
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
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
      const x = (i * (w - 4)) / (n - 1) + 2
      const y = h - 2 - ((v - min) / (max - min || 1)) * (h - 4)
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
      ${(() => { const b = prestigePotentialBreakdown(); return `<div class=\"tiny\" style=\"margin:.25rem 0\">Potential breakdown: base ${b.base} × stars ${F_Game(b.starMult)} × jewels ${F_Game(b.jewelMult)} = <b>${b.total}</b></div>` })()}
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
  return `${j.name} <span style="color: ${roleColor}">[${j.role}]</span> <span class="tiny">(Lv ${j.itemLevel} • req ${j.minUnitLevel}) • ${eff}</span>`
}

export const renderParty = () => {
  const wrap = el('#partyList')
  if (!wrap) return
  wrap.innerHTML = ''
  const tmpl = el('#party-card')
  const m = calcMetrics()
  partyUnits().forEach((u) => {
    const st = computeUnitStats(u)
    const lvlCost = levelUpCost(u.level)
    const can = S.gold >= lvlCost
    const miss = Math.max(0, lvlCost - S.gold)
    const share = m.dps > 0 ? computeUnitStats(u).effDps / m.dps : 0
    const etaLevelH = m.gph > 0 ? miss / m.gph : Infinity
    const node = tmpl.content.firstElementChild.cloneNode(true)
    const iconEl = node.querySelector('.icon')
    const roleColor = getRoleColor(u.role)
    const roleIcon = getRoleIcon(u.role)
    iconEl.innerHTML = roleIcon
    
    // Add subtle role-colored background to character card
    node.style.background = `linear-gradient(180deg, var(--panel), var(--panel-2)), linear-gradient(135deg, ${roleColor}10 0%, transparent 50%)`
    node.querySelector('.name').innerHTML =
      `<b>${u.name}</b> <span class="role ${u.role}">${u.role}</span> <span class="stars">${'★'.repeat(u.stars)}</span><span class="tiny"> Prestige ${u.prestige} • Transcend ${u.transcend}</span>`
    node.querySelector('.info').textContent =
      `Lv ${u.level} • Armory Power: ${F_Game(Math.floor(u.bestWeapon + u.bestArmor))} • DPS Share: ${F_Percent(share * 100)} • ETA Lvl: ${etaLevelH === Infinity ? '—' : F_Game(etaLevelH) + 'h'}`
    const btn = node.querySelector('button.level')
    btn.dataset.id = u.id
    btn.disabled = !can
    btn.innerHTML = `Level Up <small>(${F_Game(lvlCost)})</small>`
    const missEl = node.querySelector('.actions .miss')
    missEl.textContent = can ? '' : `Need ${F_Game(miss)}`
    const statsEl = node.querySelector('.stats')
    statsEl.innerHTML = `
                  <div><b>DPS</b>${F_Stats(st.effDps)}</div>
        <div><b>HP</b>${F_Stats(st.hp)}</div>
        <div><b>EHP</b>${F_Stats(st.ehp)}</div>
        <div><b>Crit</b>${F_Stats(Math.round(st.crit * 100))}%</div>
        <div><b>Armor</b>${F_Stats(st.armor)}</div>
      <div><b>Jewelry</b>${u.jewelry.filter(Boolean).length}/3</div>`
    
    // Add power bar for class currency
    const power = classPower[u.role.toLowerCase()]()
    const powerBar = document.createElement('div')
    powerBar.className = 'power-bar'
    powerBar.innerHTML = `
      <div class="power-fill" style="width: ${power}%; background: ${roleColor}"></div>
      <span class="power-text">${u.role} Power: ${power}/100</span>
    `
    node.appendChild(powerBar)
    
    // Add role-colored border glow for high power characters
    if (power >= 80) {
      node.style.boxShadow = `0 0 10px ${roleColor}40`
    }
    const j0 = u.jewelry[0] && S.inventory.jewelry[u.jewelry[0]]
    const j1 = u.jewelry[1] && S.inventory.jewelry[u.jewelry[1]]
    const j2 = u.jewelry[2] && S.inventory.jewelry[u.jewelry[2]]
    node.querySelector('.jewels').innerHTML = [j0, j1, j2]
      .map((j) => `<div>${formatJewel(j)}</div>`)
      .join('')
    wrap.appendChild(node)
  })
  wrap.querySelectorAll('button.level').forEach((b) => b.addEventListener('click', onLevelUp))
}

export const renderUpgrades = () => {
  const wrap = el('#upgrades')
  if (!wrap) return
  wrap.innerHTML = ''
  const tmpl = el('#upgrade-row')
  const defs = [
    { key: 'dps', name: 'Global DPS %', desc: '+5% party DPS per level' },
    { key: 'gold', name: 'Global Gold %', desc: '+7% gold per level' },
    { key: 'crit', name: 'Global Crit', desc: '+1% crit chance per level (capped)' },
  ]
  const upgradeCost = (key, lvl) =>
    (({ dps: 100, gold: 120, crit: 150 })[key] * Math.pow(1.35, lvl)) | 0
  defs.forEach((d) => {
    const lvl = S.upgrades[d.key]
    const cost = upgradeCost(d.key, lvl)
    const can = S.gold >= cost
    const miss = Math.max(0, cost - S.gold)
    const node = tmpl.content.firstElementChild.cloneNode(true)
    node.querySelector('.info').innerHTML =
      `<b class="truncate">${d.name}</b> <span class="tiny">Lv ${lvl}</span><div class="tiny clamp2">${d.desc}</div>`
    const btn = node.querySelector('button.buy')
    btn.dataset.upg = d.key
    btn.disabled = !can
    btn.innerHTML = `Buy <small>(${F_Game(cost)})</small>`
    node.querySelector('.actions .miss').textContent = can ? '' : `Need ${F_Game(miss)}`
    wrap.appendChild(node)
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

export const onLevelUp = (e) => {
  const id = e.currentTarget.getAttribute('data-id')
  const u = S.roster[id]
  const cost = levelUpCost(u.level)
  if (S.gold >= cost) {
    S.gold -= cost
    u.level += 1
    autoManageJewelry()
    save()
    render()
  }
}

export const onBuyUpgrade = (e) => {
  const key = e.currentTarget.getAttribute('data-upg')
  const lvl = S.upgrades[key]
  const cost = ({ dps: 100, gold: 120, crit: 150 }[key] * Math.pow(1.35, lvl)) | 0
  if (S.gold >= cost) {
    S.gold -= cost
    S.upgrades[key] += 1
    save()
    render()
  }
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
  if (bBuyDia) bBuyDia.onclick = () => { buyCurrency('dia', Math.max(1, Number(amtDia.value||1)|0)); render(); save() }
  if (bSellDia) bSellDia.onclick = () => { sellCurrency('dia', Math.max(1, Number(amtDia.value||1)|0)); render(); save() }
  if (bBuyEte) bBuyEte.onclick = () => { buyCurrency('ete', Math.max(1, Number(amtEte.value||1)|0)); render(); save() }
  if (bSellEte) bSellEte.onclick = () => { sellCurrency('ete', Math.max(1, Number(amtEte.value||1)|0)); render(); save() }
  
  // New currency trading bindings
  const tradeBtn = el('#tradeBtn')
  const fromCurrency = el('#fromCurrency')
  const toCurrency = el('#toCurrency')
  const tradeAmount = el('#tradeAmount')
  
  if (tradeBtn) {
    tradeBtn.onclick = () => {
      const from = fromCurrency.value
      const to = toCurrency.value
      const amount = Math.max(1, Number(tradeAmount.value || 1) | 0)
      if (tradeCurrency(from, to, amount)) {
        render()
        save()
      }
    }
  }
}

export const runDev = (cmd) => {
  if (!cmd) {
    // If no command entered, use the placeholder text
    cmd = "tickets 50 | gold 1e6 | win | dia 10 | ete 1 | ste 5 | neb 5 | vor 5 | jewelry"
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
  const upgradeCost = (key, lvl) => (({ dps: 100, gold: 120, crit: 150 })[key] * Math.pow(1.35, lvl)) | 0
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
