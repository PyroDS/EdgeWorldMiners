# EdgeWorldMiners Current Systems Overview

This directory contains documentation of all current systems in EdgeWorldMiners, explaining their functionality and implementation as they exist in the current codebase.

## Core Systems

1. [Game Core System](01_GAME_CORE_SYSTEM.md) - Central orchestrator that initializes and manages all other systems
2. [Resource System](02_RESOURCE_SYSTEM.md) - Manages player resources and economy
3. [Terrain System](03_TERRAIN_SYSTEM.md) - Handles procedural world generation and terrain interaction
4. [Enemy System](04_ENEMY_SYSTEM.md) - Controls enemy spawning, behavior, and wave progression

## Player Systems

5. [Drill System](05_DRILL_SYSTEM.md) - Manages mining equipment for resource extraction
6. [Turret System](06_TURRET_SYSTEM.md) - Defensive structures for combating enemies
7. [Carrier System](07_CARRIER_SYSTEM.md) - Player's main base with defensive hardpoints
8. [Build System](08_BUILD_SYSTEM.md) - Handles building placement and preview

## Interface Systems

9. [UI System](09_UI_SYSTEM.md) - Manages game interface elements and player interaction
10. [Galaxy Map System](10_GALAXY_MAP_SYSTEM.md) - Planet selection and multi-world management
11. [Landing Scene System](11_LANDING_SCENE_SYSTEM.md) - Entry point to the game and planet selection

## Cross-Cutting Systems

Each system often interacts with multiple other systems. Common patterns of interaction include:

- **Event-Based Communication**: Many systems communicate through events rather than direct references
- **Registry Storage**: Game state is often stored in Phaser's registry for cross-system access
- **Manager References**: Managers hold references to other managers they need to interact with
- **Component Registration**: Components register themselves with relevant managers (e.g., turrets registering as targets with the enemy manager)

## Technology Stack

- **Phaser 3**: Core game engine for rendering and game logic
- **JavaScript ES6+**: Modern JavaScript with classes and modules
- **DOM Integration**: HTML/CSS for UI components, integrated with Phaser
- **Web Standards**: Standard web APIs for audio, input, and rendering 