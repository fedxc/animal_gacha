# Animal Gacha Game

A browser-based idle game featuring character collection, combat, and progression mechanics.

## Recent Code Cleanup (UI Module)

The `scripts/ui.js` file has been refactored following clean code principles:

### 1. Extracted Constants
- Moved magic numbers to named constants (e.g., `CHART_WIDTH`, `UPGRADE_BASE_COSTS`)
- Centralized configuration values for better maintainability
- Added semantic constant names for improved readability

### 2. Split Large Functions
- Broke down `renderParty()` into focused helper functions:
  - `createUnitCard()` - Main card creation logic
  - `setupUnitIcon()` - Icon rendering
  - `setupUnitStyling()` - Visual styling
  - `setupUnitInfo()` - Information display
  - `setupLevelUpButton()` - Button configuration
  - `setupUnitStats()` - Stats display
  - `setupPowerBar()` - Power bar rendering
  - `setupJewelryDisplay()` - Jewelry display
- Broke down `renderUpgrades()` into smaller functions:
  - `createUpgradeRow()` - Row creation
  - `setupUpgradeInfo()` - Information display
  - `setupUpgradeButton()` - Button configuration

### 3. Separated Concerns
- Extracted business logic from UI functions
- Created dedicated business logic helpers:
  - `calculateUpgradeCost()` - Cost calculation
  - `calculateMissingGold()` - Gold deficit calculation
  - `canAffordUpgrade()` - Affordability check
  - `calculateDpsShare()` - DPS contribution calculation
  - `calculateEtaLevel()` - Time estimation
  - `formatEtaText()` - Text formatting

### 4. Added Input Validation
- Comprehensive parameter validation for all functions
- Type checking and range validation
- Meaningful error messages for debugging
- Graceful handling of invalid inputs

### 5. Improved Error Handling
- Consistent try-catch patterns
- Detailed error logging
- Graceful degradation on failures
- User-friendly error messages

### 6. Extracted Utility Functions
- `validateNumber()` - Number validation utility
- `validateString()` - String validation utility
- `validateElement()` - DOM element validation
- `safeExecute()` - Safe function execution wrapper

### Benefits
- **Maintainability**: Easier to modify and extend functionality
- **Readability**: Clear function names and separation of concerns
- **Reliability**: Robust error handling and input validation
- **Reusability**: Utility functions can be used across the codebase
- **Debugging**: Better error messages and logging

## Game Features

A browser-based idle RPG with gacha mechanics, prestige systems, and complex progression math.

## Table of Contents
- [Core Mechanics](#core-mechanics)
- [Unit Stats & Scaling](#unit-stats--scaling)
- [Combat System](#combat-system)
- [Loot & Drops](#loot--drops)
- [Gacha System](#gacha-system)
- [Prestige & Transcend](#prestige--transcend)
- [Currency & Market](#currency--market)
- [Jewelry System](#jewelry-system)
- [Upgrades](#upgrades)
- [Enemy Scaling](#enemy-scaling)

## Core Mechanics

### Global Multipliers
- **Gold Multiplier**: `GOLD_MULT = 2.0` - Applied to all gold sources
- **Base Gold per Kill**: `(10 + enemy_level * 4) * GOLD_MULT`

### Time-Based Progression
- Game runs on real-time ticks
- Combat damage is applied continuously: `damage = party_dps * tank_survival_factor * delta_time`
- Enemy HP decreases until death, then new enemy spawns

## Unit Stats & Scaling

### Base Unit Stats
Each unit has base stats that scale with level, stars, prestige, and transcend:

**Terraclaw (TANK)**: `{ dps: 6, hp: 160, crit: 0.05, armor: 18 }`
**Nebulynx (MAGE)**: `{ dps: 14, hp: 90, crit: 0.18, armor: 6 }`
**Vortexhorn (FIGHTER)**: `{ dps: 10, hp: 120, crit: 0.12, armor: 10 }`

### Stat Scaling Formulas

#### Level Multiplier
```
level_multiplier = 1 + 0.12 * (level - 1)
```

#### Star Multiplier
```
star_multiplier = 1.8^(stars - 1)
```
- Each star is a massive power spike (1.8x multiplier)
- 5★ units are significantly stronger than 1★

#### Prestige Multiplier
```
prestige_multiplier = 10^prestige
```
- Each prestige adds a 10x multiplier
- Applied to DPS and HP

#### Transcend Multiplier
```
transcend_multiplier = 50^transcend
```
- Each transcend adds a 50x multiplier
- Applied to DPS and HP

#### Final Stat Calculations
```
DPS = (base_dps * level_mult * star_mult * prestige_mult * transcend_mult + weapon_power) * (1 + 0.05 * dps_upgrades)
HP = base_hp * level_mult * star_mult * prestige_mult * transcend_mult
Armor = base_armor * (1 + 0.03 * (level - 1)) + armor_power
Crit = clamp(base_crit + 0.01 * (level - 1) + 0.01 * crit_upgrades, 0, 0.9)
```

#### Role Bonuses
- **FIGHTER**: +25% DPS, +3% crit chance
- **TANK**: No special bonuses (tank role is for EHP calculation)
- **MAGE**: No special bonuses

#### Class Power Bonuses
Based on currency amounts (Stellarium for TANK, Nebulium for MAGE, Vortexium for FIGHTER):
```
class_power = min(100, currency_amount)
dps_bonus = 1 + (class_power * 0.01)  // +1% per power level
hp_bonus = 1 + (class_power * 0.02)   // +2% per power level
armor_bonus = 1 + (class_power * 0.01) // +1% per power level
```

### Effective HP (EHP)
```
EHP = HP * (1 + armor / 100)
```

### Critical Hit Expected DPS
```
expected_dps = dps * (1 + crit_chance * (crit_multiplier - 1))
crit_multiplier = 1.5
```

## Combat System

### Tank Survival Factor
The game uses a "tank gating" system where party DPS is reduced if tanks can't survive:

```
enemy_dps = 6 + enemy_level^1.35 * 1.6
required_ehp = enemy_dps * 8  // 8-second survival window
tank_survival_factor = clamp(0.2 + 0.8 * clamp(tank_ehp / required_ehp, 0, 1), 0.2, 1)
```

- If tanks can survive 8+ seconds: full DPS (100%)
- If tanks can't survive: DPS reduced to 20-100% based on survival time
- Minimum 20% DPS even with no tank survival

### Combat Damage
```
damage_per_tick = party_effective_dps * tank_survival_factor * delta_time
```

## Loot & Drops

### Enemy Spawning
```
enemy_level = max(1, floor(1 + log10(1 + gold) * 2 + previous_enemy_level * 0.05))
enemy_hp = floor(100 + enemy_level^1.8 * 18)
```

### Drop Chances (Base)
```
gold_chance = 1.0  // Always drops
ticket_chance = 0.06 + level * 0.0016
weapon_chance = 0.14 + level * 0.0009
armor_chance = 0.14 + level * 0.0009
jewelry_chance = 0.035 + level * 0.0009
```

### Enemy Type Biases
Different enemy types have drop biases:
- **Gold bias**: +20% gold
- **Ticket bias**: +120% tickets
- **Weapon bias**: +50% weapons
- **Armor bias**: +50% armor
- **Jewelry bias**: +90% jewelry

### Equipment Drops
**Weapons**: `power = floor(random(1, 6) + enemy_level^0.9)`
**Armor**: `power = floor(random(1, 4) + enemy_level^0.8)`

## Gacha System

### Summon Mechanics
- **Character Rate**: 1.5% (P_CHAR = 0.015)
- **Scrap Rate**: 98.5% (gives gold instead of character)

### Ticket Scrap Gold
```
base_gold = (5 + enemy_level * 3) * GOLD_MULT
multiplier = (1 + 0.07 * gold_upgrades) * (1 + party_gold_percent) * (1 + 0.02 * diamantium + 0.05 * eternium)
scrap_gold = floor(base_gold * multiplier)
```

### Character Progression
- **New Character**: Added to roster at 1★
- **Duplicate**: Increases stars (1★ → 2★ → 3★ → 4★ → 5★)
- **5★ Duplicate**: Converts to gold (80-100 gold)

## Prestige & Transcend

### Diamantium (Prestige Currency)
```
base_diamantium = DIA_K * log10(gold + 1)
DIA_K = 1.5

// Bonuses
five_star_bonus = 1 + 0.6 * (five_star_units / total_units)  // Up to +60%
jewel_bonus = 1 + min(1, 0.02 * average_equipped_jewel_level)  // Up to +100%

final_diamantium = floor(base_diamantium * five_star_bonus * jewel_bonus)
```

### Eternium (Transcend Currency)
```
eternium = floor(ETE_K * sqrt(gold))
ETE_K = 1.5
```

### Prestige Requirements
```
required_gold = 10000 * 1.6^prestige_count
```
- Only gold requirement is mandatory
- 5★ units and 3 jewels per unit are optional goals

### Reset Effects
**Prestige Reset**:
- Gains diamantium
- All units: prestige +1, level = 1, stars = 1
- Resets: gold, tickets, upgrades, inventory

**Transcend Reset**:
- Gains eternium
- All units: transcend +1, prestige = 0, level = 1, stars = 1
- Resets: gold, tickets, upgrades, inventory

## Currency & Market

### Currency Types
- **Diamantium (DIA)**: Prestige currency
- **Eternium (ETE)**: Transcend currency
- **Stellarium (STE)**: Tank class currency
- **Nebulium (NEB)**: Mage class currency
- **Vortexium (VOR)**: Fighter class currency

### Market Mechanics
The market uses complex cyclical pricing with multiple sine waves:

```
base_price = 1.0
time = market_time + phase_offset

// Multiple frequency cycles
cycle1 = sin(time * frequency) * 0.5 + 0.5
cycle2 = sin(time * frequency * 0.3) * 0.3 + 0.5  // Longer trend
cycle3 = sin(time * frequency * 2.1) * 0.2 + 0.5  // Shorter oscillation

combined_cycle = (cycle1 + cycle2 + cycle3) / 3
noise = (random() - 0.5) * 0.15  // ±7.5% random noise

variation = (combined_cycle + noise - 0.5) * amplitude
price = base_price * (1 + variation)
```

**Currency Cycles**:
- **STE**: freq=0.0008, phase=0, amplitude=0.4
- **NEB**: freq=0.0012, phase=100, amplitude=0.6
- **VOR**: freq=0.0010, phase=200, amplitude=0.5

### Trading Rules
1. **DIA → Class Currency**: Uses market prices
2. **Class Currency ↔ Class Currency**: 1:1 exchange (requires having some class currency)
3. **Class Currency Limit**: Maximum 100 of each type

## Jewelry System

### Jewelry Generation
```
item_level = max(enemy_level, max_owned_level, max_equipped_level) + 1
min_unit_level = max(1, round(item_level / 5) * 5)
```

### Jewelry Effects
**TANK Jewels**: +18% armor, +6% armor→DPS conversion
**MAGE Jewels**: +18% DPS, +5% gold
**FIGHTER Jewels**: +12% DPS, +5% crit
**ANY Jewels**: +9% gold, +5% DPS

### Jewelry Scaling
```
scale_factor = 1 + 0.12 * item_level^0.85
final_effect = base_effect * scale_factor
```

### Auto-Management
- Jewelry is automatically equipped to best units
- Scoring considers DPS improvement + gold value
- Auto-sells excess jewelry when inventory > 100 items
- Sale value: `3 * item_level * GOLD_MULT`

## Upgrades

### Upgrade Costs
```
cost = base_cost * 1.35^current_level
```

**Base Costs**:
- **DPS**: 100 gold (+5% party DPS per level)
- **Gold**: 120 gold (+7% gold per level)
- **Crit**: 150 gold (+1% crit chance per level, capped at 90%)

### Level Up Costs
```
level_cost = floor(20 * level^1.7)
```

## Enemy Scaling

### Enemy Types
15 different enemy types with different drop biases:
- Carapoid, Aegiscrawler, Psiloclaw (armor bias)
- Plasmoid, Shockmote, Stubmote (ticket bias)
- Gearex, Rustbeast, Saberling (weapon bias)
- Mantifex, Chronowasp, Gemspider (jewelry bias)
- Glimmerbug, Aurorling, Gildermite (gold bias)

### Enemy Stats
```
enemy_dps = 6 + level^1.35 * 1.6
enemy_hp = floor(100 + level^1.8 * 18)
```

## Performance Metrics

### Rate Calculations
```
kills_per_minute = (party_dps * tank_survival_factor) / enemy_hp * 60
gold_per_hour = gold_per_kill * kills_per_minute * 60
tickets_per_hour = ticket_chance * kills_per_minute * 60
diamantium_per_hour = DIA_K * (log10(gold + gph + 1) - log10(gold + 1))
eternium_per_hour = ETE_K * (sqrt(gold + gph) - sqrt(gold))
```

### ETA Calculations
```
eta_diamantium = (required_gold - current_gold) / gold_per_hour
eta_eternium = (required_gold - current_gold) / gold_per_hour
```

## Developer Commands

Available in the developer console:
- `tickets [amount]`: Add tickets
- `gold [amount]`: Add gold
- `win`: Kill current enemy
- `jewelry`: Award random jewelry
- `dia [amount]`: Add diamantium
- `ete [amount]`: Add eternium
- `ste [amount]`: Add stellarium
- `neb [amount]`: Add nebulium
- `vor [amount]`: Add vortexium

## Tips & Strategies

1. **Tank Survival**: Ensure your tank can survive 8+ seconds for full DPS
2. **Star Progression**: Focus on getting units to 5★ for massive power spikes
3. **Jewelry Optimization**: Higher-level jewelry scales exponentially
4. **Market Timing**: Trade currencies when prices are favorable
5. **Prestige Timing**: Wait for 5★ units and good jewelry before prestiging
6. **Class Currency**: Build up class currency for role-specific bonuses
7. **Upgrade Priority**: DPS > Gold > Crit for most efficient progression
