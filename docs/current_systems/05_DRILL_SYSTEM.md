# Drill System

**Files**:
- [src/drillManager.js](../src/drillManager.js) (Main manager)
- [src/cargoManager.js](../src/cargoManager.js) (Cargo handling)

## Current State Summary

The Drill System in EdgeWorldMiners is responsible for placing mining drills, managing resource extraction, and transporting resources back to the carrier. It's a core gameplay system that connects resource collection to the economy.

### Key Components

#### 1. Drill Manager
- Manages the lifecycle of drill units
- Places drills at valid locations on terrain
- Handles drill updates, damage, and destruction
- Coordinates with CargoManager for resource transport
- Manages mining operations and targeting

#### 2. Drill Entities
- Visual representation with animated components
- Health system with damage states
- Mining logic with progress tracking
- Can be targeted and damaged by enemies
- Chain reaction explosions when destroyed

#### 3. Mining System
- Progressive mining through terrain layers
- Hardness-based mining speed (different materials mine at different speeds)
- Visual feedback through progress bars and particles
- Special handling for bedrock (infinite but slow resource generation)
- Resource value calculation based on material type

#### 4. Cargo System
- Spawns cargo packages at drills when resources are mined
- Transports resources back to carrier
- Adds resources to player's economy
- Visual representation of resource flow

#### 5. Damage System
- Drills can be damaged by enemies or explosions
- Visual feedback through color changes (normal → damaged → critical)
- Explosion chain reactions when drills are destroyed
- Terrain destruction from explosions

### Key Interactions

- **Terrain System**: Interacts with terrain to mine resources and check placement validity
- **Resource System**: Adds resources to player's economy
- **Enemy System**: Drills can be targeted by enemies
- **Carrier**: Cargo is transported back to carrier

### Technical Details

- Uses Phaser's graphics and animation systems
- Implements progressive resource mining through layers
- Visual feedback for mining progress
- Uses object-oriented approach for drill management
- Coordinates with multiple other systems

### Drill Lifecycle

1. **Placement**: Checks terrain for valid placement and creates drill
2. **Mining**: 
   - Targets tile directly below
   - Progressively reduces hardness of tile
   - Creates visual indicators
   - When tile is fully mined, spawns cargo and moves to next tile
3. **Damage**: Can take damage from enemies or other drill explosions
4. **Destruction**: Creates explosion, damages nearby entities, creates terrain crater 