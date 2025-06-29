# Carrier System

**Files**:
- [src/carrier.js](../src/carrier.js) (Main carrier implementation)
- [src/CarrierHardpoint.js](../src/CarrierHardpoint.js) (Hardpoint system)

## Current State Summary

The Carrier System in EdgeWorldMiners implements the player's mobile base, which hovers above the terrain and serves as the central gameplay element. It includes defensive hardpoints, health management, and environmental positioning logic.

### Key Components

#### 1. Carrier Entity
- A hovering spacecraft that serves as the player's primary structure
- Visually rendered with hull, bridge, and engine components
- Maintains a consistent hover altitude above terrain
- Implements physics properties for collision
- Supports damage and destruction mechanics

#### 2. Hardpoint System
- Modular weapon mounts attached to the carrier
- Currently supports "PointDefense" turret type
- Hardpoints can be individually targeted and damaged
- Acts as a damage shield for the carrier (carrier only takes direct damage when hardpoints are destroyed)
- Implements firing mechanics, target acquisition, and projectile management

#### 3. Positioning System
- Dynamic height adjustment to maintain clearance above terrain
- Samples multiple points beneath the carrier to maintain stability
- Smooth hover movement with subtle bobbing animation
- Initial placement algorithm to find suitable spawn location near sea level

#### 4. Combat System
- Hierarchical damage model (hardpoints must be destroyed before carrier takes damage)
- Visual damage feedback through tinting
- Health tracking for both carrier and hardpoints
- Projectile physics and collision detection
- Damage redirection to protect the carrier

### Key Interactions

- **Terrain System**: Interacts with terrain to adjust hover height
- **Enemy System**: Targeted by enemies and registers as high-priority target
- **Cargo System**: Acts as deposit destination for mined resources
- **Enemy System**: Hardpoints target and damage enemies

### Technical Details

- Procedurally generates carrier sprite using Phaser graphics
- Uses Phaser tweens for hover animation
- Implements physics body for collision detection
- Separates core carrier functionality from weapon systems
- Uses multiple terrain sampling points for stable hovering

### Carrier Lifecycle

1. **Initialization**:
   - Finds suitable spawn location near sea level
   - Creates visual representation
   - Sets up physics properties
   - Initializes health system

2. **Operation**:
   - Dynamically adjusts height above terrain
   - Updates hardpoint positions
   - Provides targeting information to hardpoints
   - Renders hover animation

3. **Combat**:
   - Takes damage when targeted (through hardpoints first)
   - Visual feedback when damaged
   - Handles destruction of individual hardpoints
   - Game over when carrier is destroyed 