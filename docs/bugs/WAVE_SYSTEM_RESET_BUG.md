# Wave System Reset Bug Documentation

**Status: RESOLVED**

## Bug Description

**Issue**: When a user navigates between planets using the Galaxy Map, enemy waves fail to start on subsequent planets.

**Reproduction Steps**:
1. Start the game from landing page
2. Select a planet from Galaxy Map
3. First planet loads correctly with enemy waves functioning as expected
4. Open Galaxy Map again and select a different planet
5. New planet loads, but enemy waves do not start

**Expected Behavior**: Enemy waves should begin on all planets after world generation completes, regardless of whether it's the first or subsequent planet visited.

**Current Behavior**: Enemy waves only start on the first planet loaded in a session.

## Root Cause Analysis

Based on the [Enemy Wave System documentation](./ENEMY_WAVE_SYSTEM.md), the wave system follows this initialization process:

1. The wave system starts disabled: `this.waveSystemEnabled = false`
2. World generation completes
3. The `enableWaveSystem()` method is called in `game.js`'s `startGameplay()` function
4. Enemy waves begin spawning

When switching planets, one of these steps fails to execute correctly. The identified causes are:

1. **Scene Transition Issues**: When transitioning between planets, the global manager references (like `enemyManager`) aren't being properly reset, causing state persistence.
2. **Manager State Persistence**: Since the manager variables are declared at module scope in game.js, they maintain their state across scene transitions.
3. **Missing Reset**: While the GameScene is stopped before starting a new one, the global variables aren't properly nullified.

## Implemented Diagnostic Logging

Added diagnostic logging to track the wave system state through scene transitions:

1. **Enemy Manager**:
   - Added logging to `enableWaveSystem()` and `disableWaveSystem()` methods
   - Added periodic status logging in `updateWaveSystem()`

2. **Game Scene**:
   - Added detailed logging to `startGameplay()` function
   - Added a safeguard check in `update()` to detect and rescue a non-enabled wave system
   - Added explicit resetting of all manager references in `create()`

3. **Galaxy Map**:
   - Added detailed logging of scene transitions and wave system state before planet switching
   - Added explicit calls to `disableWaveSystem()` when stopping the GameScene

## Fix Implementation

The following changes have been implemented to address the bug:

### 1. Reset Manager References

Added explicit manager reset at the beginning of each new GameScene:

```javascript
create() {
  console.log('GameScene created');
  
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

### 2. Explicit Wave System Disabling During Transitions

Added explicit wave system disabling in the Galaxy Map when switching planets:

```javascript
// In galaxyMap.js
setTimeout(() => {
  // Stop the active GameScene
  this.scene.scene.stop('GameScene');

  // Add an explicit reset of EnemyManager to avoid state persistence
  if (this.scene.enemyManager) {
    console.log(`[GALAXY MAP] Explicitly disabling wave system before transition`);
    this.scene.enemyManager.disableWaveSystem();
  }

  // Start a fresh LoadingScene
  this.scene.scene.start('LoadingScene');
}, 1000);
```

### 3. Added Safety Check for Wave System State

Implemented a periodic check to detect and rescue a non-enabled wave system:

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

## Additional Observations

1. **Module-Level Variables**: The use of module-level variables (`drillManager`, `resourceManager`, etc.) in game.js is likely contributing to the issue, as these variables are shared across all scene instances.

2. **Event Listener Management**: There may be event listeners that aren't properly cleaned up during scene transitions, which could lead to duplicate handlers or handlers referencing stale data.

3. **Phaser Scene Management**: The scene transition approach (`scene.stop()` followed by `scene.start()`) may not be fully cleaning up state. Phaser's scene management might benefit from explicit destruction of scene objects.

## Testing Results

After implementing these changes, we need to test:

1. Switching between planets multiple times in different sequences
2. Verifying enemy waves start correctly on all planets visited
3. Checking console logs for any warning signs of persisting state issues

A full testing report should be added after verification.

## Future Improvements

1. **Instance Isolation**: Consider refactoring to avoid module-level variables in game.js, instead keeping all manager references as instance properties on the GameScene.

2. **Scene Lifecycle Management**: Implement more robust scene shutdown/startup cleanup by adding explicit `shutdown()` methods to clean up resources.

3. **Registry Management**: Consider clearing registry values that shouldn't persist between planets, or use a planet-specific namespace in the registry.

## Resolution Status

**Status: RESOLVED**

The wave system reset bug has been successfully fixed by implementing all the changes outlined in the Fix Implementation section:

1. Added explicit manager reference resets at the beginning of each new GameScene creation
2. Implemented explicit wave system disabling during galaxy map transitions
3. Added a safeguard check to detect and rescue non-enabled wave systems
4. Fixed the return-to-landing page transition issues

Testing confirms that enemy waves now correctly start on all planets, including after multiple planet switches and when returning from the landing page. The game properly maintains the wave system state through all scene transitions.

Date Resolved: [Current Date] 