# Enemy Overhaul Plan

This document outlines the plan to refactor the enemy system for better modularity, maintainability, and visual appeal. The current implementation in `enemyManager.js` will be broken down into a class-based system, similar to the existing `TurretManager` and `turrets/` structure.

## 1. Directory Structure

A new directory will be created to house the individual enemy classes:
- `src/enemies/`

## 2. Base Enemy Class

A new base class, `BaseEnemy`, will be created to encapsulate common enemy logic and properties.

- **File:** `src/enemies/BaseEnemy.js`
- **Responsibilities:**
    - Store common properties: `scene`, `manager`, `x`, `y`, `health`, `maxHealth`, `speed`, `size`, `damage`, `active`, `sprite`.
    - Provide base methods:
        - `constructor()`: To initialize common properties.
        - `takeDamage(amount)`: To handle incoming damage.
        - `update()`: A placeholder to be implemented by subclasses.
        - `destroy()`: To clean up the enemy instance.

## 3. Specific Enemy Classes

Individual classes for each enemy type will be created, extending `BaseEnemy`.

### Melee Enemy
- **File:** `src/enemies/MeleeEnemy.js`
- **Replaces:** `SMALL`, `MEDIUM`, and `LARGE` enemy types from `enemyManager.js`.
- **Responsibilities:**
    - Define `STATS` for different tiers (Small, Medium, Large) as a static property.
    - Create a new "attack craft" visual using `Phaser.Graphics`. The shape will be more complex than the current triangle, suggesting an aggressive ship. The size will be slightly increased.
    - Implement the `update()` method for its movement and attack logic (moving towards a target and dealing damage on contact).

### Shooter Enemy
- **File:** `src/enemies/ShooterEnemy.js`
- **Replaces:** `SHOOTER` enemy type from `enemyManager.js`.
- **Responsibilities:**
    - Define its unique `STATS` as a static property.
    - Create a distinct visual for the shooter "attack craft" using `Phaser.Graphics`.
    - Implement the `update()` method for its behavior: strafing, targeting, and firing projectiles.
    - The projectile spawning logic will be part of this class.

## 4. Refactor `enemyManager.js`

The `EnemyManager` class will be refactored to be a lightweight orchestrator.

- **Responsibilities:**
    - **Wave Management:** Continue to manage the wave system (starting waves, tracking enemy counts).
    - **Spawning:** The `spawnEnemy()` methods will be updated to instantiate the new `MeleeEnemy` and `ShooterEnemy` classes. The large `ENEMY_TIERS` object will be removed.
    - **Updates:** The main `update()` loop will iterate over the array of enemy instances and call `enemy.update()` on each.
    - **Projectile Management:** It will continue to manage the array of projectiles fired by shooter enemies, handling their updates and collisions. This keeps the pattern consistent with `TurretManager`.
    - **Helper Functions:** Provide helper functions that can be accessed by enemies or other managers (e.g., finding the closest target).

## 5. Visual Overhaul

The visual appearance of all enemies will be updated.

- **From:** Simple geometric shapes (triangles, diamonds).
- **To:** More complex polygons that resemble "attack craft".
- **Size:** The overall size of enemies will be increased slightly to improve visual proportions on screen.
- This will be handled within the constructor of each specific enemy class.

## 6. Backward-Compatibility & Public API Commitments

`EnemyManager` exposes several helpers that other systems (turrets, UI, carrier, etc.) already call.  To avoid breaking existing code **all of these will remain available with the same method names and argument order**.  Where the underlying implementation moves into the new enemy subclasses, these methods will delegate to the new logic so external callers see no change.

| Current Method | Purpose | Compatibility Action |
| -------------- | ------- | -------------------- |
| `getEnemies()` | Returns raw enemy array for read-only loops. | Keep unchanged. |
| `getEnemyTypeCounts()` | Counts enemies by tier for the UI. | Keep unchanged; will iterate over new classes. |
| `damageEnemy(index, amount)` | Direct damage hook used by AOE, drills, etc. | Keep unchanged; will internally forward to `enemy.takeDamage()`. |
| `damageEnemiesInRange(x, y, r, dmg)` | AOE helper used by turrets. | Keep unchanged. |
| `findClosestTarget(x, y, arr)` | Utility for enemies & turrets. | Keep unchanged. |
| `getDistance(a, b)` | Distance calc wrapper. | Keep unchanged. |
| `getCurrentWave()` / `getWaveStatus()` | UI hooks. | Keep unchanged. |

If future refactors require renames, we will add deprecation wrappers first.

## 7. Tier Mapping for `MeleeEnemy`

To guarantee balance parity, the **exact** numbers from the old `ENEMY_TIERS` block are carried over.  They will live in a static `TIER_STATS` table within `MeleeEnemy`.

| Old Tier | Health | Speed | Size → *new* | Damage | Comment |
| -------- | ------ | ----- | ------------ | ------ | ------- |
| SMALL  | 30  | 70  | 15 → **18** | 3  | +20 % size boost |
| MEDIUM | 60  | 50  | 25 → **30** | 5  | +20 % size boost |
| LARGE  | 120 | 35  | 40 → **48** | 10 | +20 % size boost |

`ShooterEnemy` retains its previous stats, with size bumped from 20 → **24** (also ~20 %).

## 8. Visual Guidelines

All enemies will adopt a cohesive "attack-craft" aesthetic while remaining simple shapes drawn with `Phaser.Graphics`.

* **MeleeEnemy (all tiers)** – elongated hexagon fuselage + forward‐swept wings.
* **ShooterEnemy** – diamond fuselage + twin prongs at the front to suggest guns.
* **Color Palette** – keep existing reds/oranges for melee tiers; keep purple for shooter, but apply a light gradient by layering two tinted polygons.
* **Size Increase** – ~20 % larger bounding box versus old values (see Tier Mapping).  Projectile collision radius will scale automatically with sprite size.

> Implementation sketch (pseudo-Phaser):
> ```js
> g.fillStyle(color, 1);
> // fuselage
> g.beginPath();
> g.moveTo(0, -h/2);
> g.lineTo(w/2, -h/4);
> g.lineTo(w/2, h/4);
> g.lineTo(0, h/2);
> g.lineTo(-w/2, h/4);
> g.lineTo(-w/2, -h/4);
> g.closePath();
> g.fillPath();
> // wings/prongs can be separate thinner polygons added after.
> ```

## 9. Migration & Test Checklist

1. **Scaffold** `src/enemies/` with `BaseEnemy.js`, `MeleeEnemy.js`, `ShooterEnemy.js`.
2. **Move logic** – copy existing stats & behaviours into the subclasses.
3. **Refactor spawns** – update `EnemyManager.spawnEnemy()` & `spawnShooterEnemy()` to `new MeleeEnemy(...)` / `new ShooterEnemy(...)`.
4. **Delegation layer** – modify `damageEnemy`, `damageEnemiesInRange`, etc., to call instance methods where appropriate.
5. **Smoke test** – run one wave and compare:
   * DPS values in console logs.
   * Pathing behaviour (targets drills/turrets as before).
   * Shooter projectile spread and terrain damage.
6. **Visual confirmation** – ensure new sprites appear ~20 % larger and display the new shapes.
7. **Regression checklist** – run turret upgrade path, carrier pickup, terrain destruction to verify no errors.
8. **Commit & push** – merge behind a feature flag if desired.

## 10. Unified Targetable System

The original enemy logic hard-codes every *player* object type (drills, turrets, carrier, etc.) that an enemy can attack.  This makes future expansion painful.  The overhaul introduces a lightweight **`ITargetable`** contract and a registration API so that *any* player structure/vehicle with a health pool can become a valid target automatically.

### 10.1  ITargetable Contract
- **Mandatory properties / methods**  
  `x`, `y` – world coordinates  
  `takeDamage(amount)` – called by enemies/projectiles  
  `isDestroyed()` or boolean `active` flag (mirrors enemies' pattern)
- Optionally expose `priorityTag` (string) so enemies with special behaviour can filter/weight targets (e.g. `"DRILL"`, `"TURRET"`).

> In plain JS this is a documented shape, not a TS interface, so there is zero runtime cost.

### 10.2  EnemyManager API
```js
// new helpers
registerTarget(obj)   // add to internal array
unregisterTarget(obj) // remove (called when the object is destroyed)
getTargetables()      // returns current array (read-only)
```
EnemyManager keeps the master list; enemies no longer query DrillManager/TurretManager directly except for **special-case priorities** (see below).

### 10.3  Updating Player Objects
- **Drills, Turrets, Carrier, future buildings** – call `enemyManager.registerTarget(this)` in their constructor/spawn logic and `unregisterTarget` inside `destroy()`.
- They all already implement `takeDamage`; ensure they expose `x`, `y`, and an `active` flag.

### 10.4  Default Enemy Targeting Flow
1. Ask `enemyManager.getTargetables()` for the list.  
2. Use `findClosestTarget()` (unchanged) to pick the nearest *active* object.  
3. Attack it using existing damage calls.

### 10.5  Special-Case Target Priorities
Some enemy types keep bespoke behaviour:
- **ShooterEnemy (purple)** – *first* filters list to `priorityTag === "DRILL"`; if none found it falls back to the full list.
- Additional future enemies can apply their own weighting before selecting the closest target.

This keeps the common code path tiny while still allowing tailored AI.

### 10.6  Migration Checklist
1. Add `targetables = []` plus the three API methods to `EnemyManager`.
2. Refactor DrillManager, TurretManager, Carrier (and tests) to register/unregister.
3. Replace existing `findNewTarget()` implementations with the default flow; keep overrides where priority is needed.
4. Run regression wave smoke test to ensure enemies now attack new building prototypes automatically.
5. Update unit tests / CI scripts.

## 11. Implementation Status and Next Steps

### 11.1 Completed Work

- **✓ Base Enemy Architecture**
  - Created `BaseEnemy`, `MeleeEnemy`, and `ShooterEnemy` classes
  - Implemented visual overhaul with new attack-craft designs
  - Moved enemy-specific logic from manager to appropriate classes

- **✓ Unified Targetable System**
  - Added `targetables` array and registration methods to `EnemyManager`
  - Updated all player objects to register/unregister:
    - Drills with `priorityTag: 'DRILL'`
    - Turrets with `priorityTag: 'TURRET'`
    - Carrier with `priorityTag: 'CARRIER'`
  - Refactored enemy targeting to use the unified system
  - Implemented special priority for `ShooterEnemy` to prefer drills

### 11.2 Verification Steps

Before merging to main, the following tests should be performed:

1. **Gameplay Test**
   - Confirm enemies correctly target drills, turrets, and carrier
   - Verify ShooterEnemy prefers drills when available
   - Check that destroyed objects are properly unregistered from targeting

2. **Edge Cases**
   - Test behavior when all drills are destroyed
   - Test behavior when no player objects remain
   - Verify projectile collisions still work correctly

3. **Performance**
   - Check for any noticeable slowdown with large numbers of enemies
   - Verify memory usage is stable (no leaking references)

### 11.3 Future Enhancements

- **Attack Effect Generalization**
  - Currently, `showAttackEffect()` has some target-type specific code
  - Could be made more generic for future target types

- **Weighted Targeting**
  - Implement a more sophisticated priority system with weights
  - Allow enemies to consider multiple factors (distance, priority, health)

- **Target Group Behaviors**
  - Enable coordinated attacks against high-value targets
  - Add swarm behavior for groups of enemies

---

*(The section numbers below this point have been incremented accordingly.)* 