/*
 * Core game mechanics: stats, combat, loot and progression.
 */
import { clamp, chance, pick, rnd } from './utils.js'
import { S, ENEMY_TYPES, UNIT_POOL, partyUnits, seedUnit } from './state.js'

// ===== Units & Stats =====
// Global gold multiplier to increase gold rate everywhere
const GOLD_MULT = 2.0
export const levelUpCost = (lvl) => Math.floor(20 * Math.pow(lvl, 1.7))
export const starMult = (stars) => Math.pow(1.8, stars - 1)
export const prestigeMult = (prestige) => Math.pow(10, prestige)
export const transcendMult = (transcend) => Math.pow(50, transcend)
export const levelMult = (lvl) => 1 + 0.12 * (lvl - 1)
export const critExpected = (dps, critChance, critMult = 1.5) =>
  dps * (1 + critChance * (critMult - 1))

export const applyJewelry = (unit, stats, jIds = null) => {
  let add = { dpsPct: 0, goldPct: 0, armorPct: 0, critPct: 0, armorToDpsPct: 0 }
  const list = jIds || unit.jewelry
  list.forEach((jid) => {
    if (!jid) return
    const j = S.inventory.jewelry[jid]
    if (!j) return
    // Slightly stronger scaling so higher-level jewels are clearly upgrades
    const scale = 1 + 0.12 * Math.pow(j.itemLevel, 0.85)
    add.dpsPct += (j.effects.dpsPct || 0) * scale
    add.goldPct += (j.effects.goldPct || 0) * scale
    add.armorPct += (j.effects.armorPct || 0) * scale
    add.critPct += (j.effects.critPct || 0) * scale
    add.armorToDpsPct += (j.effects.armorToDpsPct || 0) * scale
  })
  stats.armor *= 1 + add.armorPct
  stats.crit = clamp(stats.crit + add.critPct, 0, 0.9)
  stats.dps *= 1 + add.dpsPct
  stats.goldPct = (stats.goldPct || 0) + add.goldPct
  stats.dps += stats.armor * add.armorToDpsPct
  return stats
}

export const computeUnitStats = (unit) => {
  let dps =
    unit.base.dps *
      levelMult(unit.level) *
      starMult(unit.stars) *
      prestigeMult(unit.prestige) *
      transcendMult(unit.transcend) +
    unit.bestWeapon
  let hp =
    unit.base.hp *
    levelMult(unit.level) *
    starMult(unit.stars) *
    prestigeMult(unit.prestige) *
    transcendMult(unit.transcend)
  let armor = unit.base.armor * (1 + 0.03 * (unit.level - 1)) + unit.bestArmor
  let crit = clamp(unit.base.crit + 0.01 * (unit.level - 1), 0, 0.9)
  dps *= 1 + 0.05 * S.upgrades.dps
  crit = clamp(crit + 0.01 * S.upgrades.crit, 0, 0.9)
  // Role tuning: strengthen Fighter
  if (unit.role === 'FIGHTER') {
    dps *= 1.25
    crit = clamp(crit + 0.03, 0, 0.9)
  }
  let stats = { dps, hp, armor, crit, goldPct: 0 }
  stats = applyJewelry(unit, stats)
  const ehp = hp * (1 + armor / 100)
  const effDps = critExpected(stats.dps, stats.crit)
  return { ...stats, ehp, effDps }
}

export const computeUnitStatsWithJewels = (unit, jIds) => {
  let dps =
    unit.base.dps *
      levelMult(unit.level) *
      starMult(unit.stars) *
      prestigeMult(unit.prestige) *
      transcendMult(unit.transcend) +
    unit.bestWeapon
  let hp =
    unit.base.hp *
    levelMult(unit.level) *
    starMult(unit.stars) *
    prestigeMult(unit.prestige) *
    transcendMult(unit.transcend)
  let armor = unit.base.armor * (1 + 0.03 * (unit.level - 1)) + unit.bestArmor
  let crit = clamp(unit.base.crit + 0.01 * (unit.level - 1), 0, 0.9)
  dps *= 1 + 0.05 * S.upgrades.dps
  crit = clamp(crit + 0.01 * S.upgrades.crit, 0, 0.9)
  let stats = { dps, hp, armor, crit, goldPct: 0 }
  stats = applyJewelry(unit, stats, jIds)
  const ehp = hp * (1 + armor / 100)
  const effDps = critExpected(stats.dps, stats.crit)
  return { ...stats, ehp, effDps }
}

export const partyStats = () => {
  let p = { dps: 0, goldPct: 0, tankEhp: 0 }
  partyUnits().forEach((u) => {
    const st = computeUnitStats(u)
    p.dps += st.effDps
    p.goldPct += st.goldPct
    if (u.role === 'TANK') p.tankEhp = Math.max(p.tankEhp, st.ehp)
  })
  return p
}

// ===== Enemy Threat & Tank Gating =====
const enemyDps = (lvl) => 6 + Math.pow(lvl, 1.35) * 1.6
export const tankSurvivalFactor = () => {
  const p = partyStats()
  const threat = enemyDps(S.enemy.level)
  const windowSec = 8
  const ratio = p.tankEhp / (threat * windowSec)
  return clamp(0.2 + 0.8 * clamp(ratio, 0, 1), 0.2, 1)
}

// ===== Jewelry =====
let _jid_counter = 1
function nextJewelId() {
  // Ensure uniqueness across reloads by avoiding collisions with existing inventory ids
  let id = 'J' + _jid_counter++
  while (S && S.inventory && S.inventory.jewelry && S.inventory.jewelry[id]) {
    id = 'J' + _jid_counter++
  }
  return id
}
export const makeJewelry = (forRole, lvl) => {
  const minUnitLevel = Math.max(1, Math.round(lvl / 5) * 5)
  const itemLevel = minUnitLevel
  const id = nextJewelId()
  const names = {
    TANK: ['Gravity Core', 'Aegis Kernel', 'Stoneheart Node'],
    MAGE: ['Nebula Pendant', 'Quasar Lattice', 'Aether Prism'],
    FIGHTER: ['Razor Charm', 'Blitz Fang', 'Impact Sigil'],
    ANY: ['Time Shard', 'Echo Loop', 'Lucky Array'],
  }
  const role = forRole || pick(['TANK', 'MAGE', 'FIGHTER', 'ANY'])
  let effects = {}
  if (role === 'TANK') effects = { armorPct: 0.18, armorToDpsPct: 0.06 }
  else if (role === 'MAGE') effects = { dpsPct: 0.18, goldPct: 0.05 }
  else if (role === 'FIGHTER') effects = { dpsPct: 0.12, critPct: 0.05 }
  else effects = { goldPct: 0.09, dpsPct: 0.05 }
  return { id, name: pick(names[role]), role, itemLevel, minUnitLevel, effects }
}

const jewelSaleValue = (j) => Math.floor(3 * j.itemLevel * GOLD_MULT)

function jewelScore(unit, j) {
  if (!j) return -Infinity
  if (!(j.role === 'ANY' || j.role === unit.role)) return -Infinity
  if (unit.level < j.minUnitLevel) return -Infinity
  const base = computeUnitStatsWithJewels(unit, []).effDps
  const withJ = computeUnitStatsWithJewels(unit, [j.id]).effDps
  const dEff = withJ - base
  const goldWeight = 5
  const scale = 1 + 0.08 * Math.pow(j.itemLevel, 0.85)
  const g = (j.effects.goldPct || 0) * scale * goldWeight
  return dEff + g
}

export function autoManageJewelry() {
  if (!S || !S.inventory || !S.inventory.jewelry) return
  const prevEquips = {}
  partyUnits().forEach((u) => {
    // Normalize jewelry array to length 3 with nulls so open slots are preserved
    if (!Array.isArray(u.jewelry)) u.jewelry = [null, null, null]
    while (u.jewelry.length < 3) u.jewelry.push(null)
    prevEquips[u.id] = (u.jewelry || []).slice()
  })
  const pool = Object.values(S.inventory.jewelry).slice()
  const assigned = new Set()
  partyUnits().forEach((u) => {
    ;(u.jewelry || []).forEach((id) => assigned.add(id))
  })
  const unitsSorted = partyUnits()
    .slice()
    .sort((a, b) => computeUnitStats(b).effDps - computeUnitStats(a).effDps)
  for (const u of unitsSorted) {
    ;(prevEquips[u.id] || []).forEach((id) => assigned.delete(id))
    const candidates = pool.filter(
      (j) =>
        !assigned.has(j.id) && (j.role === 'ANY' || j.role === u.role) && u.level >= j.minUnitLevel,
    )
    candidates.sort((a, b) => jewelScore(u, b) - jewelScore(u, a))
    // Start from current equips; upgrade only if strictly better, otherwise keep existing to avoid removals
    const current = (prevEquips[u.id] || []).slice(0, 3)
    while (current.length < 3) current.push(null)
    const result = current.slice()
    for (let slot = 0; slot < 3; slot++) {
      const curId = current[slot]
      const curJ = curId ? S.inventory.jewelry[curId] : null
      const best = candidates.find((j) => !assigned.has(j.id) && !result.includes(j.id))
      if (!best) continue
      const baseEff = computeUnitStatsWithJewels(u, curJ ? [curJ.id] : []).effDps
      const withBest = computeUnitStatsWithJewels(u, [best.id]).effDps
      if (!curJ || withBest > baseEff) {
        result[slot] = best.id
        assigned.add(best.id)
      }
    }
    u.jewelry = result
    // Ensure all finally equipped jewels are marked as assigned so other units cannot reuse them
    result.forEach((id) => {
      if (id) assigned.add(id)
    })
  }
  autoSellJewelry()
}

function autoSellJewelry() {
  const limit = 100
  const inUse = new Set()
  partyUnits().forEach((u) =>
    u.jewelry.forEach((id) => {
      if (id) inUse.add(id)
    }),
  )
  const list = Object.values(S.inventory.jewelry)
  // Do not sell anything if we are under the inventory limit; preserve past jewels
  if (list.length <= limit) return

  // If over the limit, sell the lowest-value unequipped ones until we are back under
  const overflow = list.length - limit
  const candidates = list
    .filter((j) => !inUse.has(j.id))
    .sort((a, b) => a.itemLevel - b.itemLevel)
  let sold = 0
  let goldGained = 0
  for (let i = 0; i < overflow && i < candidates.length; i++) {
    const j = candidates[i]
    goldGained += jewelSaleValue(j)
    delete S.inventory.jewelry[j.id]
    sold += 1
  }
  if (sold > 0) logMsg(`🗑️ Auto-sold ${sold} low-value jewels (+${goldGained} gold)`) 
}

// ===== Logging =====
export const logMsg = (msg) => {
  S.log.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`)
  S.log = S.log.slice(0, 150)
  document.dispatchEvent(new CustomEvent('log'))
}

// ===== Battle & Drops =====
export const spawnEnemy = () => {
  const lvl = Math.max(1, Math.floor(1 + Math.log10(1 + S.gold) * 2 + (S.enemy?.level || 1) * 0.05))
  const type = pick(ENEMY_TYPES).id
  const hp = Math.floor(100 + Math.pow(lvl, 1.8) * 18)
  S.enemy = { level: lvl, type, hp, maxHp: hp }
  logMsg(`A ${ENEMY_TYPES.find((e) => e.id === type).name} appears (Lv ${lvl})`)
}
export const baseGoldPerKill = (lvl) => Math.floor((10 + lvl * 4) * GOLD_MULT)
export const dropRolls = (enemyType, lvl) => {
  let c = {
    gold: 1,
    // Increased ticket base and per-level scaling
    ticket: 0.06 + lvl * 0.0016,
    weapon: 0.14 + lvl * 0.0009,
    armor: 0.14 + lvl * 0.0009,
    // Dialed-back jewelry chance
    jewelry: 0.035 + lvl * 0.0009,
  }
  const bias = ENEMY_TYPES.find((e) => e.id === enemyType)?.bias
  if (bias === 'gold') c.gold *= 1.2
  if (bias === 'ticket') c.ticket *= 2.2
  if (bias === 'weapon') c.weapon *= 1.5
  if (bias === 'armor') c.armor *= 1.5
  if (bias === 'jewelry') c.jewelry *= 1.9
  return c
}

export const awardWeapon = () => {
  const u = pick(partyUnits())
  const power = Math.floor(rnd(1, 6) + Math.pow(S.enemy.level, 0.9))
  const improved = power > u.bestWeapon
  if (improved) {
    u.bestWeapon = power
    logMsg(`⚔️ ${u.name} found a weapon (+${power} DPS) [UPGRADE]`)
  } else {
    logMsg(`⚔️ ${u.name} found a weapon (+${power} DPS)`)
  }
}
export const awardArmor = () => {
  const u = pick(partyUnits())
  const power = Math.floor(rnd(1, 4) + Math.pow(S.enemy.level, 0.8))
  const improved = power > u.bestArmor
  if (improved) {
    u.bestArmor = power
    logMsg(`🛡️ ${u.name} found armor (+${power} Armor) [UPGRADE]`)
  } else {
    logMsg(`🛡️ ${u.name} found armor (+${power} Armor)`)
  }
}
export const awardJewelry = () => {
  const roles = [...new Set(partyUnits().map((u) => u.role))]
  const role = chance(0.7) ? pick(roles) : pick(['TANK', 'MAGE', 'FIGHTER', 'ANY'])
  // Ensure new jewels are strictly higher level than anything owned or equipped
  const owned = Object.values(S.inventory.jewelry)
  const ownedMax = owned.length ? Math.max(...owned.map((j) => j.itemLevel || 0)) : 0
  const equippedMax = Math.max(
    0,
    ...partyUnits()
      .flatMap((u) => u.jewelry)
      .map((id) => (id && S.inventory.jewelry[id] ? S.inventory.jewelry[id].itemLevel : 0)),
  )
  const targetLevel = Math.max(S.enemy.level, ownedMax, equippedMax) + 1
  const j = makeJewelry(role, targetLevel)
  // Force item level to the target (override any internal rounding)
  j.itemLevel = targetLevel
  j.minUnitLevel = Math.max(1, Math.round(targetLevel / 5) * 5)
  S.inventory.jewelry[j.id] = j
  logMsg(`💍 Found ${j.name} [${j.role}] (Lv ${j.itemLevel} • req Lv ${j.minUnitLevel})`)
  autoManageJewelry()
}

export const processKill = () => {
  const lvl = S.enemy.level
  const goldBase = baseGoldPerKill(lvl)
  const pstats = partyStats()
  const goldGain = Math.floor(goldBase * (1 + 0.07 * S.upgrades.gold) * (1 + pstats.goldPct))
  S.gold += goldGain
  logMsg(`+${goldGain} gold`)
  // After gold changes, proactively refresh UI affordability
  document && document.dispatchEvent && document.dispatchEvent(new CustomEvent('gold-change'))
  const ch = dropRolls(S.enemy.type, lvl)
  if (chance(ch.ticket)) {
    S.tickets += 1
    logMsg('🎟️ Gacha ticket')
    document && document.dispatchEvent && document.dispatchEvent(new CustomEvent('tickets-change'))
  }
  if (chance(ch.weapon)) awardWeapon()
  if (chance(ch.armor)) awardArmor()
  if (chance(ch.jewelry)) awardJewelry()
}

export const tick = (dt) => {
  const p = partyStats()
  const guard = tankSurvivalFactor()
  const d = p.dps * guard * dt
  S.enemy.hp -= d
  if (S.enemy.hp <= 0) {
    processKill()
    spawnEnemy()
  }
  updateMarket(dt)
}

// ===== Gacha =====
const P_CHAR = 0.015
const ticketScrapGold = (enemyLvl) => {
  const base = (5 + enemyLvl * 3) * GOLD_MULT
  const pstats = partyStats()
  const mult =
    (1 + 0.07 * S.upgrades.gold) *
    (1 + pstats.goldPct) *
    (1 + 0.02 * S.meta.diamantium + 0.05 * S.meta.eternium)
  return Math.floor(base * mult)
}
export const summonPool = () => UNIT_POOL.filter((u) => u.enabled)
export const summonOnce = () => {
  if (S.tickets <= 0) return { ok: false, msg: 'No tickets' }
  S.tickets -= 1
  if (Math.random() >= P_CHAR) {
    const g = ticketScrapGold(S.enemy.level)
    S.gold += g
    return { ok: true, msg: `Scrap ➜ +${g} gold` }
  }
  const pool = summonPool()
  const udef = pick(pool.length ? pool : UNIT_POOL.slice(0, 3))
  let result = ''
  if (!S.roster[udef.id]) {
    S.roster[udef.id] = seedUnit(udef)
    result = `NEW: ${udef.name} (${udef.role})`
  } else {
    const u = S.roster[udef.id]
    if (u.stars < 5) {
      u.stars += 1
      result = `DUPE ➜ ${udef.name} ★${u.stars}`
    } else {
      const bonus = 80 + Math.floor(20 * Math.random())
      S.gold += bonus
      result = `Overflow ➜ ${udef.name} → +${bonus} gold`
    }
  }
  return { ok: true, msg: result }
}

// ===== Metrics & Progression =====
// Reward scaling factors (tune to taste)
const DIA_K = 1.5
const ETE_K = 1.5

export const computePrestigeHr = (gph, gold) =>
  DIA_K * (Math.log10(gold + gph + 1) - Math.log10(gold + 1))
export const computeTranscendHr = (gph, gold) =>
  ETE_K * (Math.sqrt(gold + gph) - Math.sqrt(gold))
export const eta = (remaining, perHour) => (perHour > 0 ? remaining / perHour : Infinity)

export const calcMetrics = () => {
  const p = partyStats()
  const guard = tankSurvivalFactor()
  const kps = clamp((p.dps * guard) / S.enemy.maxHp, 0, 1000)
  const ch = dropRolls(S.enemy.type, S.enemy.level)
  const goldPerKill =
    baseGoldPerKill(S.enemy.level) * (1 + 0.07 * S.upgrades.gold) * (1 + p.goldPct)
  const gph = goldPerKill * kps * 3600
  const tph = ch.ticket * kps * 3600
  const diah = computePrestigeHr(gph, S.gold)
  const eteh = computeTranscendHr(gph, S.gold)
  const nDia = prestigeEarned()
  const nextDiaGold = Math.pow(10, (nDia + 1) / DIA_K) - 1
  const etaDiaH = eta(Math.max(0, nextDiaGold - S.gold), gph)
  const nEte = transcendEarned()
  const nextEteGold = Math.pow((nEte + 1) / ETE_K, 2)
  const etaEteH = eta(Math.max(0, nextEteGold - S.gold), gph)
  const threat = enemyDps(S.enemy.level)
  const windowSec = 8
  const reqEhp = threat * windowSec
  return {
    kpm: kps * 60,
    ttk: p.dps > 0 ? S.enemy.hp / (p.dps * guard) : Infinity,
    gph,
    tph,
    weph: ch.weapon * kps * 3600,
    arph: ch.armor * kps * 3600,
    jwph: ch.jewelry * kps * 3600,
    goldPerKill,
    dps: p.dps * guard,
    diah,
    eteh,
    etaDiaH,
    etaEteH,
    // Party balance diagnostics
    rawDps: p.dps,
    guard,
    tankEhp: p.tankEhp,
    threat,
    reqEhp,
    windowSec,
  }
}

export const HIST = { dps: [], gph: [], tph: [] }
// ===== Market =====
function noise(t) {
  // Smooth pseudo-noise using sum of sines
  return (
    Math.sin(t * 0.09) * 0.6 +
    Math.sin(t * 0.017) * 0.3 +
    Math.sin(t * 0.003) * 0.1
  )
}

export function updateMarket(dt) {
  if (!S.market) return
  S.market.t += dt
  const vol = 0.004 // base volatility per tick
  const progress = clamp(Math.log10(S.gold + 10) / 10, 0, 1)
  const guard = tankSurvivalFactor()
  const bias = (progress - 0.5) * 0.02 + (guard - 0.8) * 0.03
  ;['dia', 'ete'].forEach((k) => {
    const m = S.market[k]
    const base = m.price
    const drift = base * (bias + noise(S.market.t + (k === 'ete' ? 100 : 0)) * vol)
    const delta = Math.round(drift)
    m.price = Math.max(100, base + delta)
    m.hist.push(m.price)
    if (m.hist.length > 200) m.hist.shift()
  })
}

export function buyCurrency(kind, amount) {
  const m = S.market[kind]
  if (!m) return false
  const cost = m.price * amount
  if (S.gold < cost) return false
  S.gold -= cost
  if (kind === 'dia') S.meta.diamantium += amount
  if (kind === 'ete') S.meta.eternium += amount
  logMsg(`🛒 Bought ${amount} ${kind.toUpperCase()} for ${cost} gold @ ${m.price}`)
  document.dispatchEvent(new CustomEvent('gold-change'))
  return true
}

export function sellCurrency(kind, amount) {
  const m = S.market[kind]
  if (!m) return false
  if (kind === 'dia' && S.meta.diamantium < amount) return false
  if (kind === 'ete' && S.meta.eternium < amount) return false
  const revenue = m.price * amount
  S.gold += revenue
  if (kind === 'dia') S.meta.diamantium -= amount
  if (kind === 'ete') S.meta.eternium -= amount
  logMsg(`💱 Sold ${amount} ${kind.toUpperCase()} for ${revenue} gold @ ${m.price}`)
  document.dispatchEvent(new CustomEvent('gold-change'))
  return true
}
const MAX_POINTS = 120
export function pushHist() {
  const m = calcMetrics()
  HIST.dps.push(m.dps)
  if (HIST.dps.length > MAX_POINTS) HIST.dps.shift()
  HIST.gph.push(m.gph)
  if (HIST.gph.length > MAX_POINTS) HIST.gph.shift()
  HIST.tph.push(m.tph)
  if (HIST.tph.length > MAX_POINTS) HIST.tph.shift()
}

// ===== Prestige / Transcend =====
// Optional bonuses: 5★ units and equipped jewel levels amplify Diamantium
export const fiveStarBonusMultiplier = () => {
  const units = partyUnits()
  if (units.length === 0) return 1
  const fiveCount = units.filter((u) => u.stars >= 5).length
  const frac = fiveCount / units.length
  // Up to +60% at full 5★ party
  return 1 + 0.6 * frac
}

export const avgEquippedJewelLevel = () => {
  const levels = []
  partyUnits().forEach((u) => {
    (u.jewelry || []).forEach((id) => {
      if (!id) return
      const j = S.inventory.jewelry[id]
      if (j && typeof j.itemLevel === 'number') levels.push(j.itemLevel)
    })
  })
  if (levels.length === 0) return 0
  return levels.reduce((a, b) => a + b, 0) / levels.length
}

export const jewelsBonusMultiplier = () => {
  const avg = avgEquippedJewelLevel()
  // +2% per average jewel level; soft cap at +100%
  const bonus = Math.min(1, 0.02 * avg)
  return 1 + bonus
}

export const prestigeEarned = () => {
  const base = Math.max(0, Math.floor(DIA_K * Math.log10(S.gold + 1)))
  const mult = fiveStarBonusMultiplier() * jewelsBonusMultiplier()
  return Math.floor(base * mult)
}
export const transcendEarned = () => Math.max(0, Math.floor(ETE_K * Math.sqrt(S.gold)))
export const prestigeGoldReq = () => Math.floor(10000 * Math.pow(1.6, S.meta?.prestiges || 0))

export function prestigeRequirements() {
  const needGold = prestigeGoldReq()
  const goldOk = S.gold >= needGold
  const starsOk = partyUnits().every((u) => u.stars >= 5)
  // Optional goal: all 3 jewels each (for progress display only)
  const jewelsOk = partyUnits().every((u) => u.jewelry.filter(Boolean).length === 3)
  return { goldOk, starsOk, jewelsOk, needGold }
}

export const canPrestige = () => {
  const r = prestigeRequirements()
  // Only gold is mandatory now
  return r.goldOk
}

// Breakdown for UI
export const prestigePotentialBreakdown = () => {
  const base = Math.max(0, Math.floor(DIA_K * Math.log10(S.gold + 1)))
  const starMult = fiveStarBonusMultiplier()
  const jewelMult = jewelsBonusMultiplier()
  const total = Math.floor(base * starMult * jewelMult)
  return { base, starMult, jewelMult, total }
}
export const canTranscend = () => S.meta.diamantium >= 25

export const prestigeReset = () => {
  if (!canPrestige()) return
  const earned = prestigeEarned()
  S.meta.diamantium += earned
  Object.values(S.roster).forEach((u) => {
    u.prestige += 1
    u.level = 1
    u.stars = 1
    u.bestWeapon = 0
    u.bestArmor = 0
    u.jewelry = [null, null, null]
  })
  S.gold = 0
  S.tickets = 0
  S.upgrades = { dps: 0, gold: 0, crit: 0 }
  S.inventory = { jewelry: {} }
  S.meta.prestiges = (S.meta.prestiges || 0) + 1
  logMsg(`Diamantium +${earned}. Reality rebooted.`)
  spawnEnemy()
}

export const transcendReset = () => {
  if (!canTranscend()) return
  const earned = transcendEarned()
  S.meta.eternium += earned
  Object.values(S.roster).forEach((u) => {
    u.transcend += 1
    u.prestige = 0
    u.level = 1
    u.stars = 1
    u.bestWeapon = 0
    u.bestArmor = 0
    u.jewelry = [null, null, null]
  })
  S.gold = 0
  S.tickets = 0
  S.upgrades = { dps: 0, gold: 0, crit: 0 }
  S.inventory = { jewelry: {} }
  logMsg(`Eternium +${earned}. Reality shattered.`)
  spawnEnemy()
}
