# Enemy System

**Files**: 
- [src/enemyManager.js](../src/enemyManager.js) (Main manager)
- [src/enemies/BaseEnemy.js](../src/enemies/BaseEnemy.js) (Parent class)
- [src/enemies/MeleeEnemy.js](../src/enemies/MeleeEnemy.js) (Melee enemy implementation)
- [src/enemies/ShooterEnemy.js](../src/enemies/ShooterEnemy.js) (Ranged enemy implementation)

## Current State Summary

The Enemy System in EdgeWorldMiners manages enemy spawning, behavior, wave progression, and combat interactions. It uses an object-oriented approach where specific enemy types inherit from a base class.

### Key Components

#### 1. Enemy Manager
- Central coordinator for all enemy-related functionality
- Manages enemy instances, projectiles, and wave system
- Handles enemy spawning, updating, and destruction
- Implements targeting and collision detection

#### 2. Wave System
- Progressive difficulty with increasing waves
- Configurable wave parameters (enemies per wave, spawn intervals)
- Break periods between waves
- Wave state tracking (active/inactive, enemies left to spawn)
- Enemy scaling based on planet difficulty

#### 3. Enemy Types
- **Melee Enemy**: Close-range attackers that move directly toward targets
  - Three tiers: SMALL, MEDIUM, LARGE with increasing health/damage
- **Shooter Enemy**: Ranged attackers that fire projectiles
  - Maintains distance from targets and fires from afar

#### 4. Targeting System
- Registry of targetable objects (drills, turrets, carrier, hardpoints)
- Priority-based targeting (carrier > drills > turrets)
- Distance-based target selection

#### 5. Projectile System
- Handles shooter enemy projectiles
- Collision detection with terrain and player structures
- Damage calculation and application
- Visual effects for projectile impacts

### Key Interactions

- **Terrain System**: Checks for terrain collisions and damages terrain
- **Drill Manager**: Targets and damages drills
- **Turret Manager**: Is targeted by turrets, targets and damages turrets
- **Carrier**: Attacks the player's main carrier
- **UI System**: Provides wave status for UI display

### Technical Details

- Implements object pooling for projectiles
- Uses Phaser's physics for movement and collision
- Visual effects for explosions and damage
- Enemy behavior is handled by the enemy classes themselves
- Manager acts as a coordinator and provides shared functionality

### Enemy Behaviors

1. **Melee Enemy Behavior**:
   - Moves directly toward closest target
   - Attacks when in range
   - Has different size/strength tiers

2. **Shooter Enemy Behavior**:
   - Moves to maintain optimal firing distance
   - Fires projectiles at targets
   - Avoids getting too close to targets 