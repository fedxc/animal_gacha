/*
 * Rendering and DOM interaction.
 */
import { F, el } from './utils.js'
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
} from './logic.js'

// SVG Icons
const SVG = {
  TANK: `<svg viewBox="0 0 48 48" class="svg"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M10 28l14-14 14 14-14 10-14-10z" fill="#0e1420"/><path d="M8 28h32"/><path d="M24 14l6 6"/></g></svg>`,
  MAGE: `<svg viewBox="0 0 48 48" class="svg"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="24" cy="18" r="6"/><path d="M12 36c4-6 8-9 12-9s8 3 12 9"/><path d="M18 12l-4-3M30 12l4-3"/></g></svg>`,
  FIGHTER: `<svg viewBox="0 0 48 48" class="svg"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M10 34l10-10 4 4-10 10z"/><path d="M24 20l6-6 8 8-6 6z"/><path d="M32 14c3 0 6 1 8 3"/></g></svg>`,
}
const iconFor = (role) => ({ TANK: SVG.TANK, MAGE: SVG.MAGE, FIGHTER: SVG.FIGHTER })[role]

export const renderTop = () => {
  const nGold = el('#gold'),
    nTick = el('#tickets'),
    nDia = el('#dia'),
    nEte = el('#ete'),
    nGph = el('#gph'),
    nTph = el('#tph')
  if (nGold) nGold.textContent = F(S.gold)
  if (nTick) nTick.textContent = S.tickets
  if (nDia) nDia.textContent = F(S.meta.diamantium)
  if (nEte) nEte.textContent = F(S.meta.eternium)
  const m = calcMetrics()
  if (nGph) nGph.textContent = F(m.gph)
  if (nTph) nTph.textContent = F(m.tph)
  // Market top balances
  const pDia = el('#priceDia'), pEte = el('#priceEte'), gBal = el('#goldBal')
  if (pDia && S.market) pDia.textContent = F(S.market.dia.price)
  if (pEte && S.market) pEte.textContent = F(S.market.ete.price)
  if (gBal) gBal.textContent = F(S.gold)
}

export const renderEnemy = () => {
  const et = ENEMY_TYPES.find((e) => e.id === S.enemy.type)
  const nName = el('#enemyName'),
    nType = el('#enemyType'),
    nLvl = el('#enemyLvl'),
    nBar = el('#hpbar')
  if (nName) nName.textContent = et?.name || '—'
  if (nType) nType.textContent = et?.id || '—'
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
    `<div><b>DPS</b>${F(m.dps)}</div>`,
    `<div><b>Kills/min</b>${m.kpm.toFixed(2)}</div>`,
    `<div><b>TTK</b>${m.ttk.toFixed(2)}s</div>`,
    `<div><b>Gold/kill</b>${F(m.goldPerKill)}</div>`,
    `<div><b>Gold/hr</b>${F(m.gph)}</div>`,
    `<div><b>Tickets/hr</b>${F(m.tph)}</div>`,
    `<div><b>Weapons/hr</b>${m.weph.toFixed(2)}</div>`,
    `<div><b>Armor/hr</b>${m.arph.toFixed(2)}</div>`,
    `<div><b>Jewelry/hr</b>${m.jwph.toFixed(2)}</div>`,
    `<div><b>Diamantium/hr</b>${m.diah.toFixed(3)}</div>`,
    `<div><b>Eternium/hr</b>${m.eteh.toFixed(3)}</div>`,
    `<div><b>ETA +1 Dia</b>${m.etaDiaH === Infinity ? '—' : m.etaDiaH.toFixed(2) + 'h'}</div>`,
    `<div><b>ETA +1 Ete</b>${m.etaEteH === Infinity ? '—' : m.etaEteH.toFixed(2) + 'h'}</div>`,
    // Party balance diagnostics
    `<div><b>Tank EHP</b>${F(m.tankEhp)}</div>`,
    `<div><b>Req EHP</b>${F(m.reqEhp)}</div>`,
    `<div><b>Guard</b>${m.guard.toFixed(2)}</div>`,
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
      return `${x.toFixed(2)},${y.toFixed(2)}`
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
        <span class="nowrap"><b>Gold ≥ ${F(req.needGold)}</b> (mandatory)</span>.
      </div>
      <div class="tiny" style="margin-top:.25rem">
        <span class="${req.goldOk ? '' : 'miss'}">${req.goldOk ? '✓' : '✗'} Gold ≥ ${F(req.needGold)} (you: ${F(S.gold)})</span>
        <span class="tag" title="Optional" style="margin-left:.5rem; ${req.starsOk ? 'color:var(--good)' : 'color:var(--ink-dim)'}">${req.starsOk ? '✓' : '○'} 5★ each (optional)</span>
        <span class="tag" title="Optional" style="margin-left:.25rem; ${req.jewelsOk ? 'color:var(--good)' : 'color:var(--ink-dim)'}">${req.jewelsOk ? '✓' : '○'} 3 jewels each (optional)</span>
      </div>
      ${(() => { const b = prestigePotentialBreakdown(); return `<div class=\"tiny\" style=\"margin:.25rem 0\">Potential breakdown: base ${b.base} × stars ${b.starMult.toFixed(2)} × jewels ${b.jewelMult.toFixed(2)} = <b>${b.total}</b></div>` })()}
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
        ? `Armor→DPS ${Math.round(v * 100)}%`
        : `${k.replace('Pct', '')} +${Math.round(v * 100)}%`,
    )
    .join(' • ')
  return `${j.name} [${j.role}] <span class="tiny">(Lv ${j.itemLevel} • req ${j.minUnitLevel}) • ${eff}</span>`
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
    node.querySelector('.icon').innerHTML = iconFor(u.role)
    node.querySelector('.name').innerHTML =
      `<b>${u.name}</b> <span class="role ${u.role}">${u.role}</span> <span class="stars">${'★'.repeat(u.stars)}</span><span class="tiny"> Prestige ${u.prestige} • Transcend ${u.transcend}</span>`
    node.querySelector('.info').textContent =
      `Lv ${u.level} • Armory Power: ${Math.floor(u.bestWeapon + u.bestArmor)} • DPS Share: ${(share * 100).toFixed(1)}% • ETA Lvl: ${etaLevelH === Infinity ? '—' : etaLevelH.toFixed(2) + 'h'}`
    const btn = node.querySelector('button.level')
    btn.dataset.id = u.id
    btn.disabled = !can
    btn.innerHTML = `Level Up <small>(${F(lvlCost)})</small>`
    const missEl = node.querySelector('.actions .miss')
    missEl.textContent = can ? '' : `Need ${F(miss)}`
    const statsEl = node.querySelector('.stats')
    statsEl.innerHTML = `
      <div><b>DPS</b>${F(st.effDps)}</div>
      <div><b>HP</b>${F(st.hp)}</div>
      <div><b>EHP</b>${F(st.ehp)}</div>
      <div><b>Crit</b>${Math.round(st.crit * 100)}%</div>
      <div><b>Armor</b>${F(st.armor)}</div>
      <div><b>Jewelry</b>${u.jewelry.filter(Boolean).length}/3</div>`
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
    btn.innerHTML = `Buy <small>(${F(cost)})</small>`
    node.querySelector('.actions .miss').textContent = can ? '' : `Need ${F(miss)}`
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
            ? `Armor→DPS ${Math.round(v * 100)}%`
            : `${k.replace('Pct', '')} +${Math.round(v * 100)}%`,
        )
        .join(' • ')
      const req = partyUnits().some((u) => u.level >= j.minUnitLevel)
        ? `Requires Unit Lv ${j.minUnitLevel}`
        : `<span style="color:var(--bad)">Requires Unit Lv ${j.minUnitLevel}</span>`
      return `<div>• <b>${j.name}</b> [${j.role}] Lv ${j.itemLevel} ${badge}<br><span class="tiny">${req} • ${eff}</span></div>`
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
  line.textContent = '• ' + txt
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
}

export const runDev = (cmd) => {
  if (!cmd) return
  const [key, valRaw] = cmd.trim().split(/\s+/)
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
  }
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
    btn.innerHTML = `Level Up <small>(${F(cost)})</small>`
    const miss = Math.max(0, cost - S.gold)
    const missEl = btn.closest('.actions')?.querySelector('.miss')
    if (missEl) missEl.textContent = can ? '' : `Need ${F(miss)}`
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
    btn.innerHTML = `Buy <small>(${F(cost)})</small>`
    const miss = Math.max(0, cost - S.gold)
    const missEl = btn.closest('.actions')?.querySelector('.miss')
    if (missEl) missEl.textContent = can ? '' : `Need ${F(miss)}`
  })
}

// Update button affordances when gold or tickets change without full re-render
document.addEventListener('gold-change', refreshAffordability)
document.addEventListener('tickets-change', refreshAffordability)
