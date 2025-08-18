/*
 * Core game mechanics: stats, combat, loot and progression.
 */
import { clamp, chance, pick, rnd } from './utils.js'
import { S, ENEMY_TYPES, UNIT_POOL, partyUnits, seedUnit } from './state.js'

// ===== Units & Stats =====
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
    const scale = 1 + 0.08 * Math.pow(j.itemLevel, 0.85)
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
  let p = { dps: 0, goldPct: 0 }
  partyUnits().forEach((u) => {
    const st = computeUnitStats(u)
    p.dps += st.effDps
    p.goldPct += st.goldPct
  })
  return p
}

// ===== Jewelry =====
let _jid_counter = 1
export const makeJewelry = (forRole, lvl) => {
  const minUnitLevel = Math.max(1, Math.round(lvl / 5) * 5)
  const itemLevel = minUnitLevel
  const id = 'J' + _jid_counter++
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

const jewelSaleValue = (j) => Math.floor(3 * j.itemLevel)

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
    const picks = candidates.slice(0, 3)
    picks.forEach((j) => assigned.add(j.id))
    u.jewelry = [picks[0]?.id || null, picks[1]?.id || null, picks[2]?.id || null]
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
  const all = Object.values(S.inventory.jewelry)
  const toSell = []
  all.forEach((j) => {
    if (inUse.has(j.id)) return
    const equipUnits = partyUnits().filter(
      (u) => u.level >= j.minUnitLevel && (j.role === 'ANY' || j.role === u.role),
    )
    if (equipUnits.length === 0) return
    let best = false
    for (const u of equipUnits) {
      const candidates = all.filter(
        (k) => (k.role === 'ANY' || k.role === u.role) && u.level >= k.minUnitLevel,
      )
      candidates.sort((a, b) => jewelScore(u, b) - jewelScore(u, a))
      const top3 = candidates.slice(0, 3).map((k) => k.id)
      if (top3.includes(j.id)) {
        best = true
        break
      }
    }
    if (!best) toSell.push(j)
  })
  let goldGained = 0
  toSell.forEach((j) => {
    goldGained += jewelSaleValue(j)
    delete S.inventory.jewelry[j.id]
  })
  if (toSell.length > 0)
    logMsg(`🗑️ Auto-sold ${toSell.length} dominated jewels (+${goldGained} gold)`)
  let list = Object.values(S.inventory.jewelry)
  if (list.length > limit) {
    const overflow = list.length - limit
    const candidates = list
      .filter((j) => !inUse.has(j.id))
      .sort((a, b) => a.itemLevel - b.itemLevel)
    let gold2 = 0
    for (let i = 0; i < overflow && i < candidates.length; i++) {
      const j = candidates[i]
      gold2 += jewelSaleValue(j)
      delete S.inventory.jewelry[j.id]
    }
    if (overflow > 0) logMsg(`🗑️ Auto-sold ${overflow} low-value jewels (+${gold2} gold)`)
  }
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
export const baseGoldPerKill = (lvl) => Math.floor(10 + lvl * 4)
export const dropRolls = (enemyType, lvl) => {
  let c = {
    gold: 1,
    ticket: 0.03 + lvl * 0.0008,
    weapon: 0.14 + lvl * 0.0009,
    armor: 0.14 + lvl * 0.0009,
    jewelry: 0.012 + lvl * 0.0003,
  }
  const bias = ENEMY_TYPES.find((e) => e.id === enemyType)?.bias
  if (bias === 'gold') c.gold *= 1.2
  if (bias === 'ticket') c.ticket *= 1.7
  if (bias === 'weapon') c.weapon *= 1.5
  if (bias === 'armor') c.armor *= 1.5
  if (bias === 'jewelry') c.jewelry *= 2
  return c
}

export const awardWeapon = () => {
  const u = pick(partyUnits())
  const power = Math.floor(rnd(1, 6) + Math.pow(S.enemy.level, 0.9))
  const improved = power > u.bestWeapon
  if (improved) {
    u.bestWeapon = power
    logMsg(`⚔️ ${u.name} found a weapon (+${power} DPS) [best]`)
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
    logMsg(`🛡️ ${u.name} found armor (+${power} Armor) [best]`)
  } else {
    logMsg(`🛡️ ${u.name} found armor (+${power} Armor)`)
  }
}
export const awardJewelry = () => {
  const roles = [...new Set(partyUnits().map((u) => u.role))]
  const role = chance(0.7) ? pick(roles) : pick(['TANK', 'MAGE', 'FIGHTER', 'ANY'])
  const j = makeJewelry(role, S.enemy.level)
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
  const ch = dropRolls(S.enemy.type, lvl)
  if (chance(ch.ticket)) {
    S.tickets += 1
    logMsg('🎟️ Gacha ticket')
  }
  if (chance(ch.weapon)) awardWeapon()
  if (chance(ch.armor)) awardArmor()
  if (chance(ch.jewelry)) awardJewelry()
}

export const tick = (dt) => {
  const p = partyStats()
  const d = p.dps * dt
  S.enemy.hp -= d
  if (S.enemy.hp <= 0) {
    processKill()
    spawnEnemy()
  }
}

// ===== Gacha =====
const P_CHAR = 0.015
const ticketScrapGold = (enemyLvl) => {
  const base = 5 + enemyLvl * 3
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
export const computePrestigeHr = (gph, gold) => Math.log10(gold + gph + 1) - Math.log10(gold + 1)
export const computeTranscendHr = (gph, gold) => Math.sqrt(gold + gph) - Math.sqrt(gold)
export const eta = (remaining, perHour) => (perHour > 0 ? remaining / perHour : Infinity)

export const calcMetrics = () => {
  const p = partyStats()
  const kps = clamp(p.dps / S.enemy.maxHp, 0, 1000)
  const ch = dropRolls(S.enemy.type, S.enemy.level)
  const goldPerKill =
    baseGoldPerKill(S.enemy.level) * (1 + 0.07 * S.upgrades.gold) * (1 + p.goldPct)
  const gph = goldPerKill * kps * 3600
  const tph = ch.ticket * kps * 3600
  const diah = computePrestigeHr(gph, S.gold)
  const eteh = computeTranscendHr(gph, S.gold)
  const nDia = Math.floor(Math.log10(S.gold + 1))
  const nextDiaGold = Math.pow(10, nDia + 1) - 1
  const etaDiaH = eta(Math.max(0, nextDiaGold - S.gold), gph)
  const nEte = Math.floor(Math.sqrt(S.gold))
  const nextEteGold = Math.pow(nEte + 1, 2)
  const etaEteH = eta(Math.max(0, nextEteGold - S.gold), gph)
  return {
    kpm: kps * 60,
    ttk: p.dps > 0 ? S.enemy.hp / p.dps : Infinity,
    gph,
    tph,
    weph: ch.weapon * kps * 3600,
    arph: ch.armor * kps * 3600,
    jwph: ch.jewelry * kps * 3600,
    goldPerKill,
    dps: p.dps,
    diah,
    eteh,
    etaDiaH,
    etaEteH,
  }
}

export const HIST = { dps: [], gph: [], tph: [] }
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
export const prestigeEarned = () => Math.floor(Math.log10(S.gold + 1))
export const transcendEarned = () => Math.floor(Math.sqrt(S.gold))
export const prestigeGoldReq = () => Math.floor(10000 * Math.pow(1.6, S.meta?.prestiges || 0))

export function prestigeRequirements() {
  const needGold = prestigeGoldReq()
  const goldOk = S.gold >= needGold
  const starsOk = partyUnits().every((u) => u.stars >= 5)
  const jewelsOk = partyUnits().every((u) => u.jewelry.filter(Boolean).length === 3)
  return { goldOk, starsOk, jewelsOk, needGold }
}

export const canPrestige = () => {
  const r = prestigeRequirements()
  return r.goldOk && r.starsOk && r.jewelsOk
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
