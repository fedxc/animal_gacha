/*
 * Game state, constants and persistence.
 */
import { flashSave } from './utils.js'

export const UNIT_POOL = [
  {
    id: 'terraclaw',
    name: 'Terraclaw',
    role: 'TANK',
    base: { dps: 6, hp: 160, crit: 0.05, armor: 18 },
    enabled: true,
  },
  {
    id: 'nebulynx',
    name: 'Nebulynx',
    role: 'MAGE',
    base: { dps: 14, hp: 90, crit: 0.18, armor: 6 },
    enabled: true,
  },
  {
    id: 'vortexhorn',
    name: 'Vortexhorn',
    role: 'FIGHTER',
    base: { dps: 10, hp: 120, crit: 0.12, armor: 10 },
    enabled: true,
  },
]

export const ENEMY_TYPES = [
  { id: 'carapoid', name: 'Carapoid', bias: 'armor' },
  { id: 'plasmoid', name: 'Plasmoid', bias: 'ticket' },
  { id: 'gearex', name: 'Gearex', bias: 'weapon' },
  { id: 'mantifex', name: 'Mantifex', bias: 'jewelry' },
  { id: 'glimmerbug', name: 'Glimmerbug', bias: 'gold' },
  { id: 'shockmote', name: 'Shockmote', bias: 'ticket' },
  { id: 'rustbeast', name: 'Rustbeast', bias: 'weapon' },
  { id: 'aurorling', name: 'Aurorling', bias: 'gold' },
  { id: 'chronowasp', name: 'Chronowasp', bias: 'jewelry' },
  { id: 'psiloclaw', name: 'Psiloclaw', bias: 'armor' },
  { id: 'aegiscrawler', name: 'Aegiscrawler', bias: 'armor' },
  { id: 'stubmote', name: 'Stubmote', bias: 'ticket' },
  { id: 'saberling', name: 'Saberling', bias: 'weapon' },
  { id: 'gemspider', name: 'Gemspider', bias: 'jewelry' },
  { id: 'gildermite', name: 'Gildermite', bias: 'gold' },
]

export const DEFAULT_STATE = {
  gold: 100,
  tickets: 5,
  upgrades: { dps: 0, gold: 0, crit: 0 },
  roster: {},
  inventory: { jewelry: {} },
  active: ['terraclaw', 'nebulynx', 'vortexhorn'],
  enemy: { level: 1, type: 'carapoid', hp: 100, maxHp: 100 },
  lastTick: Date.now(),
  log: [],
  meta: { diamantium: 0, eternium: 0, prestiges: 0 },
  market: {
    t: 0,
    dia: { price: 5000, hist: [] },
    ete: { price: 20000, hist: [] },
  },
}

export let S = null
const saveKey = 'idle-alien-animals-v04'

export const save = () => {
  try {
    localStorage.setItem(saveKey, JSON.stringify(S))
  } catch (e) {}
  flashSave('Saved')
}

export const load = () => {
  let raw = localStorage.getItem(saveKey) || localStorage.getItem('idle-alien-animals-v03')
  if (raw) {
    S = JSON.parse(raw)
  } else {
    S = structuredClone(DEFAULT_STATE)
    UNIT_POOL.slice(0, 3).forEach((u) => (S.roster[u.id] = seedUnit(u)))
  }
  if (!S.inventory) S.inventory = { jewelry: {} }
  Object.values(S.inventory.jewelry).forEach((j) => {
    if (j) {
      if (typeof j.itemLevel !== 'number') j.itemLevel = Math.max(1, j.tier || 1)
      if (typeof j.minUnitLevel !== 'number') j.minUnitLevel = Math.max(1, j.tier || 1)
      delete j.tier
    }
  })
  if (!S.upgrades) S.upgrades = { dps: 0, gold: 0, crit: 0 }
  if (!S.active) S.active = Object.keys(S.roster).slice(0, 3)
  if (!S.meta) S.meta = { diamantium: 0, eternium: 0, prestiges: 0 }
  if (S.meta && typeof S.meta.prestiges !== 'number') S.meta.prestiges = 0
  if (!S.market) S.market = { t: 0, dia: { price: 5000, hist: [] }, ete: { price: 20000, hist: [] } }
  const idMap = { gravortoise: 'terraclaw', nebuline: 'nebulynx', razorloom: 'vortexhorn' }
  S.active = S.active.map((id) => idMap[id] || id)
  Object.keys(idMap).forEach((oldId) => {
    if (S.roster[oldId] && !S.roster[idMap[oldId]]) {
      const newId = idMap[oldId]
      const nameMap = { terraclaw: 'Terraclaw', nebulynx: 'Nebulynx', vortexhorn: 'Vortexhorn' }
      const u = S.roster[oldId]
      u.id = newId
      u.name = nameMap[newId] || u.name
      S.roster[newId] = u
      delete S.roster[oldId]
    }
  })
}

export const resetAll = () => {
  localStorage.removeItem(saveKey)
  location.reload()
}

export const seedUnit = (u) => ({
  id: u.id,
  name: u.name,
  role: u.role,
  level: 1,
  stars: 1,
  base: u.base,
  bestWeapon: 0,
  bestArmor: 0,
  jewelry: [null, null, null],
  prestige: 0,
  transcend: 0,
})

export const partyUnits = () => S.active.map((id) => S.roster[id]).filter(Boolean)
