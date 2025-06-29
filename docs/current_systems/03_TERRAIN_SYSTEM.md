# Terrain System

**File**: [src/terrainManager.js](../src/terrainManager.js)

## Current State Summary

The Terrain System in EdgeWorldMiners is a sophisticated procedural generation system that creates, renders, and manages the game world's terrain using a tile-based approach with various materials and biomes.

### Key Components

#### 1. World Structure
- Tile-based world with configurable width, height, and tile size
- Chunk-based generation for performance optimization
- Sky area above and underground area below the surface

#### 2. Material System
- Wide variety of material types with unique properties:
  - **Basic materials**: Air, Sand, Dirt, Rock, Hard Rock, Metal Ore, Bedrock
  - **Biome-specific materials**: Red Sand, Clay, Gravel, Crystal
- Each material has properties including:
  - `solid`: Whether entities can pass through
  - `shiftable`: Whether the material can fall (sand, dirt)
  - `mineable`: Whether the material can be destroyed by drills
  - `hardness`: How difficult the material is to mine
  - `damageResistance`: How resistant to explosions/damage
  - `resourceValue`: Resources gained when mined

#### 3. Biome System
- Different regions with unique characteristics
- Affects terrain height, cave frequency, ore density
- Determines surface materials

#### 4. Procedural Generation
- Uses simplex noise (from simplex-noise library)
- Multi-layered noise for natural-looking terrain features
- Separate generators for:
  - Surface height (terrain topology)
  - Cave formation
  - Ore distribution
  - Biome distribution

#### 5. Chunk-Based Rendering
- Each chunk has its own graphics object for better performance
- Only visible chunks are rendered
- Dirty chunk tracking for efficient updates

#### 6. Terrain Interaction
- Support for mining/destroying terrain
- Explosion effects that damage terrain
- Physics simulation for falling materials (sand, dirt)

### Key Interactions

- `DrillManager` interacts with terrain through `destroyAt()` when mining
- `TurretManager` and `EnemyManager` check collision with terrain
- `BuildManager` queries the terrain for valid placement locations
- `GameScene` initiates terrain generation and updates

### Technical Details

- Renders using Phaser's graphics objects
- Different rendering methods for each material type
- Uses a spatial partitioning approach for chunks
- Implements various helper methods for terrain queries

### Advanced Features

- **Damage System**: Terrain can be damaged by explosions or drilling
- **Surface Detection**: Finds the top surface at any x-coordinate
- **Resource Value Calculation**: Determines resource yield based on material
- **Visual Effects**: Particle effects when destroying terrain 