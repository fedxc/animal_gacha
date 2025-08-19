/*
 * App bootstrap and main loop.
 */
import { now } from './utils.js'
import { S, load, save, partyUnits } from './state.js'
import {
  tick,
  spawnEnemy,
  autoManageJewelry,
  pushHist,
  levelUpCost,
  starMult,
  computeUnitStats,
  calcMetrics,
  prestigeGoldReq,
  awardJewelry,
} from './logic.js'
import {
  render,
  bindTopBar,
  renderTop,
  renderEnemy,
  renderResets,
  drawAllSparks,
} from './ui.js'

let loopHandle = null
let sampleTimer = 0

const loop = () => {
  const t = now()
  const dt = Math.min(1, (t - S.lastTick) / 1000)
  S.lastTick = t
  sampleTimer += dt
  tick(dt)
  renderTop()
  renderEnemy()
  renderResets()
  if (sampleTimer >= 1) {
    sampleTimer = 0
    pushHist()
    drawAllSparks()
  }
}

function runTests() {
  const results = []
  const A = (cond, name) => {
    results.push({ name, pass: !!cond })
    if (!cond) console.error('TEST FAIL:', name)
  }
  try {
    A(typeof render === 'function', 'render() exists')
  } catch (e) {
    A(false, 'render() exists threw')
  }
  try {
    render()
    A(true, 'render() callable')
  } catch (e) {
    A(false, 'render() callable threw')
  }
  A(starMult(5) > starMult(1), 'starMult grows with stars')
  A(Math.abs(starMult(5) - Math.pow(1.8, 4)) < 1e-9, 'starMult uses 1.8^(★-1)')
  A(levelUpCost(2) > levelUpCost(1), 'levelUpCost increases with level')
  const u0 = S.roster[S.active[0]]
  const st0 = computeUnitStats(u0)
  A(st0.armor >= 0 && st0.ehp >= st0.hp, 'EHP >= HP with armor')
  A(prestigeGoldReq() >= 10000, 'Prestige threshold ≥ 10k')
  const before = partyUnits()
    .map((u) => u.jewelry.filter(Boolean).length)
    .reduce((a, b) => a + b, 0)
  awardJewelry()
  const after = partyUnits()
    .map((u) => u.jewelry.filter(Boolean).length)
    .reduce((a, b) => a + b, 0)
  A(after >= before, 'Auto-equip does not reduce equipped count')
  const legacy = ['gravortoise', 'nebuline', 'razorloom']
  A(!S.active.some((id) => legacy.includes(id)), 'Active party has only updated ids')
  const testU = S.roster[S.active[0]]
  const stBefore = computeUnitStats(testU).effDps
  const prevWeapon = testU.bestWeapon
  testU.bestWeapon += 100
  const stAfter = computeUnitStats(testU).effDps
  A(stAfter > stBefore, 'Armory Power (weapon) increases DPS')
  testU.bestWeapon = prevWeapon
  const eBefore = computeUnitStats(testU).ehp
  const prevArmor = testU.bestArmor
  testU.bestArmor += 50
  const eAfter = computeUnitStats(testU).ehp
  A(eAfter > eBefore, 'Armory Power (armor) increases EHP')
  testU.bestArmor = prevArmor
  const m = calcMetrics()
  A(m.gph >= 0 && m.tph >= 0 && isFinite(m.kpm), 'calcMetrics returns sane numbers')
  const passCount = results.filter((r) => r.pass).length
  console.log(`Tests: ${passCount}/${results.length} passed`, results)
}

export const start = () => {
  load()
  bindTopBar()
  if (!S.enemy || !S.enemy.hp) spawnEnemy()
  autoManageJewelry()
  render()
  // Only run tests when explicitly requested (prevents awarding items on load)
  if (location.search.includes('dev=1')) runTests()
  loopHandle = setInterval(loop, 250)
  setInterval(save, 10000)
}

window.addEventListener('load', start)
