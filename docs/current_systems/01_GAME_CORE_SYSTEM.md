# Game Core System

**File**: [src/game.js](../src/game.js)

## Current State Summary

The Game Core system is the central orchestrator of the EdgeWorldMiners game, built on Phaser 3. It initializes and coordinates all other game systems while managing the overall game lifecycle.

### Key Components

#### 1. Scene Management
- **LoadingScene**: Handles world generation progress display with both Phaser and DOM-based loading UI
- **GameScene**: Main gameplay scene where all game systems operate
- **LandingScene**: Planet selection screen (imported from landingScene.js)

#### 2. World Generation
- Manages procedural world generation through terrain chunks
- Implements progress tracking with visual feedback
- Supports resuming generation if stuck
- Centers initial generation around the player's carrier

#### 3. Manager Initialization
The game initializes these manager systems in order:
1. `ResourceManager`: Player resources
2. `TerrainManager`: World terrain generation and modification
3. `Carrier`: Player's base ship 
4. `DrillManager`: Mining equipment
5. `TurretManager`: Defense equipment
6. `EnemyManager`: Enemy spawning and behavior
7. `BuildManager`: Building placement and management

#### 4. Camera System
- Supports camera movement with keyboard and mouse
- Implements screen edge boundaries
- Handles window resizing

#### 5. Game Loop
- Updates all manager systems each frame
- Implements pause functionality
- Continuously generates terrain chunks as player moves

#### 6. Wave System Lifecycle
- Initializes enemy wave system after world generation completes
- Includes safety checks to ensure waves start properly

### Key Interactions

- Scenes communicate through Phaser's event system
- Managers are initialized with references to each other to enable interaction
- Components register as targetable entities with the EnemyManager
- The UI system is initialized with references to game state

### Technical Details

- Uses Phaser.AUTO renderer
- Implements responsive scaling
- Supports arcade physics
- Uses event-based communication between scenes 