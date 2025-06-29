# Enemy Wave System Documentation

## Overview

The enemy wave system in Edge World Miners controls the spawning, progression, and difficulty of enemy waves. The system is designed to increase challenge over time by incrementing the number of enemies per wave and increasing the probability of tougher enemy types as waves progress.

## Primary Location

All wave system logic is implemented in `src/enemyManager.js`.

## Core Configuration Parameters

```javascript
this.WAVE_SETTINGS = {
  INITIAL_ENEMIES: 5,      // Number of enemies in the first wave
  ENEMIES_INCREMENT: 5,    // Additional enemies per subsequent wave
  BREAK_DURATION: 1000,    // Frames between waves (about 16.7 seconds at 60 FPS)
  SPAWN_INTERVAL: 600,     // Frames between enemy spawns during a wave (about 10 seconds)
};
```

## Wave State Variables

```javascript
// Wave state
this.currentWave = 0;           // Current wave number
this.enemiesLeftToSpawn = 0;    // Enemies remaining to be spawned in the current wave
this.spawnTimer = 0;            // Timer for spawning the next enemy
this.waveBreakTimer = 0;        // Timer for the break between waves
this.isWaveActive = false;      // Whether a wave is currently active
this.waveSystemEnabled = false; // Whether the wave system has been activated (after world generation)
```

## Wave Progression Cycle

1. **Initialization**: The wave system starts disabled (`waveSystemEnabled = false`) and is enabled via `enableWaveSystem()` after world generation completes.

2. **Starting a Wave**:
   ```javascript
   startWave() {
     this.currentWave++;
     this.enemiesLeftToSpawn = this.WAVE_SETTINGS.INITIAL_ENEMIES + 
                              (this.currentWave - 1) * this.WAVE_SETTINGS.ENEMIES_INCREMENT;
     this.isWaveActive = true;
   }
   ```

3. **Enemy Spawning During Wave**:
   - During an active wave, enemies spawn at intervals defined by `SPAWN_INTERVAL`.
   - When the timer reaches the interval, `spawnEnemy()` is called and an enemy is created.
   - The `enemiesLeftToSpawn` counter decrements with each spawn.

4. **Wave Completion**:
   - A wave is considered complete when `enemiesLeftToSpawn` reaches 0 AND all enemies on screen have been defeated.
   - When completed, `isWaveActive` is set to false and `waveBreakTimer` is set to `BREAK_DURATION`.

5. **Break Between Waves**:
   - During the break, `waveBreakTimer` decrements each frame.
   - When it reaches 0, `startWave()` is called to begin the next wave.

## Enemy Type Selection

The system supports multiple enemy types with different spawn logic:

### 1. Shooter vs. Melee Selection

```javascript
spawnEnemy() {
  // Chance to spawn shooter increases with wave number
  const shooterChance = Math.min(0.15 + (this.currentWave * 0.02), 0.4);
  if (Math.random() < shooterChance) {
    this.spawnShooterEnemy();
  } else {
    this.spawnMeleeEnemy();
  }
}
```

### 2. Melee Enemy Tier Selection

```javascript
// As waves progress, chance for larger enemies increases
const largeChance = Math.min(0.2 + (this.currentWave * 0.03), 0.5);
const mediumChance = Math.min(0.3 + (this.currentWave * 0.04), 0.7);

if (tierChance < largeChance) {
  tierType = 'LARGE';
} else if (tierChance < mediumChance) {
  tierType = 'MEDIUM';
} else {
  tierType = 'SMALL';
}
```

## Enemy Types and Properties

1. **Melee Enemies**: 
   - `SMALL`: Fast but low health (30 HP, 70 px/s, 3 dmg)
   - `MEDIUM`: Balanced (60 HP, 50 px/s, 5 dmg)
   - `LARGE`: Slow but high health (120 HP, 35 px/s, 10 dmg)
   - Implemented in `src/enemies/MeleeEnemy.js`

2. **Shooter Enemies**:
   - Spawn from the left or right side
   - Fire projectiles at the player's structures
   - Implemented in `src/enemies/ShooterEnemy.js`

## Difficulty Scaling

1. **Wave-based Scaling**:
   - Number of enemies increases by `ENEMIES_INCREMENT` per wave
   - Probability of tougher enemies increases with wave number

2. **Planet-based Scaling**:
   ```javascript
   this.enemyScaling = scene.registry.get('enemyScaling') || 1.0;
   ```
   - This value comes from the planet selection and affects enemy stats
   - Increases/decreases enemy health, damage, and other attributes

## Control Methods

```javascript
// Enable wave system after world generation completes
enableWaveSystem() {
  console.log(`[WAVE SYSTEM] Enabling wave system for planet: ${this.scene.registry.get('selectedPlanet')?.planetName || 'unknown'}`);
  console.log(`[WAVE SYSTEM] Current state before enabling - wave: ${this.currentWave}, active: ${this.isWaveActive}, waveSystemEnabled: ${this.waveSystemEnabled}`);
  
  this.waveSystemEnabled = true;
  
  // Log confirmation of enabled state
  console.log(`[WAVE SYSTEM] Wave system enabled successfully`);
}

// Disable wave system (for pausing or scene transitions)
disableWaveSystem() {
  console.log(`[WAVE SYSTEM] Disabling wave system`);
  this.waveSystemEnabled = false;
  console.log(`[WAVE SYSTEM] Wave system disabled`);
}
```

## Diagnostic Logging

The wave system implements comprehensive logging to help debug issues:

1. **Periodic Status Logging**:
   ```javascript
   // Only log every 300 frames (~5 seconds) to avoid console spam
   if (this.timer % 300 === 0) {
     console.log(`[WAVE SYSTEM] Wave system still disabled. Current state - wave: ${this.currentWave}, active: ${this.isWaveActive}, timer: ${this.timer}`);
   }

   // Log wave status occasionally for debugging
   if (this.timer % 600 === 0) {
     console.log(`[WAVE SYSTEM] Status - wave: ${this.currentWave}, active: ${this.isWaveActive}, enemiesLeftToSpawn: ${this.enemiesLeftToSpawn}, enemies: ${this.enemies.length}, breakTimer: ${this.waveBreakTimer}`);
   }
   ```

2. **Wave Transition Logging**:
   ```javascript
   console.log(`Wave ${this.currentWave} started! Enemies: ${this.enemiesLeftToSpawn}`);
   console.log(`Wave ${this.currentWave} complete!`);
   ```

3. **Safety Checks**:
   In the game update cycle, a safety check is performed to detect and rescue a non-enabled wave system:
   ```javascript
   // Add wave system safety check (every ~5 seconds)
   if (this.time.now % 300 === 0) {
     if (this.enemyManager && !this.enemyManager.waveSystemEnabled && this.initialChunksGenerated) {
       console.log(`[GAME] SAFEGUARD: Wave system not enabled despite world generation being complete. Attempting to enable...`);
       
       // Try to start the wave system if it wasn't enabled properly
       this.enemyManager.enableWaveSystem();
       this.enemyManager.waveBreakTimer = this.enemyManager.WAVE_SETTINGS.BREAK_DURATION;
       this.enemyManager.isWaveActive = false;
       this.enemyManager.spawnTimer = 0;
       
       console.log(`[GAME] SAFEGUARD: Wave system recovery attempt completed`);
     }
   }
   ```

## Scene Transition Handling

To prevent wave system issues during planet transitions:

1. **Manager Resetting**:
   When creating a new GameScene, all manager references are explicitly reset:
   ```javascript
   create() {
     // Reset all manager references to ensure clean state when switching planets
     console.log(`[GAME] Resetting all manager references for new world`);
     drillManager = null;
     resourceManager = null;
     terrainManager = null;
     turretManager = null;
     enemyManager = null;
     buildManager = null;
     
     // Rest of initialization code...
   }
   ```

2. **Explicit Wave System Disabling**:
   When switching planets via the Galaxy Map:
   ```javascript
   if (this.scene.enemyManager) {
     console.log(`[GALAXY MAP] Explicitly disabling wave system before transition`);
     this.scene.enemyManager.disableWaveSystem();
   }
   ```

## UI Integration

The wave status is made available to the UI through:

```javascript
getWaveStatus() {
  return {
    wave: this.currentWave,
    active: this.isWaveActive,
    enemiesLeft: this.enemiesLeftToSpawn,
    breakTimer: this.waveBreakTimer
  };
}

getEnemyTypeCounts() {
  // Returns counts of each enemy type for display
  const counts = { SMALL: 0, MEDIUM: 0, LARGE: 0, SHOOTER: 0 };
  // ...
  return counts;
}
```

## Adding New Enemy Types

To add a new enemy type:

1. Create a new class in `src/enemies/` that extends `BaseEnemy.js`
2. Add a spawn method in `enemyManager.js` (similar to `spawnMeleeEnemy` or `spawnShooterEnemy`)
3. Update the `spawnEnemy()` method to include the new enemy type in the spawn logic
4. Update the UI to display the new enemy type (if needed)

## Common Modifications

1. **Adjust wave frequency**: Modify `BREAK_DURATION` to change the time between waves
2. **Change enemy spawn rate**: Adjust `SPAWN_INTERVAL` for faster/slower enemy spawning
3. **Increase difficulty**: Modify the tier chance calculations or increase `ENEMIES_INCREMENT`
4. **Add new enemy types**: Follow the "Adding New Enemy Types" instructions above 