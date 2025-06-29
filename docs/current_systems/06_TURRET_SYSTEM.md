# Turret System

**Files**:
- [src/turretManager.js](../src/turretManager.js) (Main manager)
- [src/turrets/BaseTurret.js](../src/turrets/BaseTurret.js) (Parent class)
- [src/turrets/MacroTurret.js](../src/turrets/MacroTurret.js) (Current turret type implementation)

## Current State Summary

The Turret System in EdgeWorldMiners is responsible for defensive structures that automatically target and attack enemies to protect the player's carrier and mining operations. It is in transition from a monolithic management approach to a more modular object-oriented architecture.

### Key Components

#### 1. Turret Manager
- Central coordinator for turret functionality
- Manages turret placement and validation
- Handles projectile physics and collision detection
- Provides utility methods for finding targets
- Coordinates with other systems for enemy detection

#### 2. Turret Types
Currently implementing a modular system with:
- **BaseTurret**: Parent class with common functionality
- **MacroTurret**: Area-of-effect artillery turret

#### 3. Projectile System
- Fires projectiles at enemies with configurable accuracy
- Applies physics-based movement
- Implements collision detection
- Handles area-of-effect explosions
- Creates visual effects for impacts

#### 4. Damage System
- Direct-hit damage to primary targets
- Area-of-effect damage with distance-based falloff
- Visual damage indicators
- Health tracking for turrets
- Destruction handlers

#### 5. Targeting System
- Range-based enemy detection
- Finds nearest enemies within range
- Implements target prioritization
- Supports different turret firing behaviors

### Key Interactions

- **Enemy System**: Targets enemies and receives damage from them
- **Resource System**: Consumes resources when placing turrets
- **Terrain System**: Validates placement locations on terrain
- **UI System**: Provides status information for display

### Technical Details

- Currently transitioning to a modular architecture
- Uses Phaser's physics system for projectiles
- Implements visual effects for firing and explosions
- Uses data-driven approach for turret stats
- Object-oriented design for different turret types

### Migration Status

The system is currently being refactored to:
1. Move from a monolithic approach to class-based design
2. Implement turret types as individual classes inheriting from BaseTurret
3. Make the TurretManager a lightweight coordinator
4. Create a data-driven stats system to support upgrades
5. Support future expansion with multiple turret types

### Turret Lifecycle

1. **Placement**: 
   - Validates placement on terrain
   - Creates turret instance of appropriate type
   - Registers with enemy manager as a target

2. **Operation**:
   - Scans for enemies within range
   - Tracks firing cooldown
   - Fires projectiles at enemies
   - Creates visual effects for firing

3. **Damage Handling**:
   - Takes damage from enemies
   - Shows visual damage state
   - Handles destruction when health reaches zero 