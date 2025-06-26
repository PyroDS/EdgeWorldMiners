# Application Summary

This document provides a high-level overview of the EdgeWorldMiners application, its major components, and guidance on how to extend or modify its functionality.

## Core Gameplay Loop

The game is a tower-defense-style resource management game built with the Phaser 3 game engine. The core gameplay loop consists of the following phases:

1.  **Resource Gathering**: The player places drills to mine resources from the terrain. These resources are then transported back to a central carrier unit.
2.  **Building**: The player uses the collected resources to build defensive structures (turrets).
3.  **Defense**: The player must defend their drills, turrets, and the carrier from waves of incoming enemies.
4.  **Progression**: As the game progresses, the enemy waves become more difficult, requiring the player to build more and stronger defenses.

## Major Functions and Their Locations

The application's functionality is divided into several managers, each responsible for a specific aspect of the game.

### 1. Game Orchestration

*   **Location**: `src/game.js`
*   **Description**: This is the main entry point of the application. It initializes the Phaser game instance, sets up the game world, and creates and coordinates all the other managers. The main game loop (`update` function) is also located here, which drives the updates for all other managers.
*   **Scalability/Editing**: To add a new manager or core system, you would initialize it in the `create()` function and add its `update()` method to the main game loop in `update()`.

### 2. Enemy Management

*   **Location**: `src/enemyManager.js`
*   **Description**: This manager is responsible for everything related to enemies. It handles the wave system, spawning different types of enemies, updating their state, and managing their lifecycle.
*   **Scalability/Editing**: The file is well-documented with instructions on how to add new enemy types. The process involves:
    1.  Create a new enemy class in `src/enemies/` that extends `BaseEnemy.js`.
    2.  Add a new spawn method (e.g., `spawnNewEnemyType()`) in `enemyManager.js`.
    3.  Update the `spawnEnemy()` method in `enemyManager.js` to include the new enemy type in the wave spawning logic.

### 3. Turret Management

*   **Location**: `src/turretManager.js`
*   **Description**: This manager handles all defensive turrets. It manages their placement, firing logic, projectile management, and damage calculations.
*   **Scalability/Editing**: The manager is designed for extensibility. The comments at the top of the file outline a road-map for a more modular architecture. To add a new turret type:
    1.  Create a new turret class in `src/turrets/` that extends `BaseTurret.js`.
    2.  This new class should define its own stats and behavior.
    3.  The `turretManager.js` and `buildManager.js` would then be updated to allow placement of this new turret.

### 4. Drill and Resource Management

*   **Location**: `src/drillManager.js`, `src/cargoManager.js`, `src/resourceManager.js`
*   **Description**:
    *   `drillManager.js`: Manages the placement, operation, and destruction of mining drills.
    *   `cargoManager.js`: Manages the transport of mined resources from drills back to the carrier.
    *   `resourceManager.js`: Tracks the player's total resources.
*   **Scalability/Editing**: To add new types of drills or resources, you would need to modify `drillManager.js` to handle the new drill type, and `resourceManager.js` to track the new resource type. The `cargoManager.js` might also need adjustments if the new resources have different transport requirements.

### 5. Building System

*   **Location**: `src/buildManager.js`
*   **Description**: This manager handles the player's ability to enter a "build mode" and place structures like drills and turrets on the terrain. It works in conjunction with the UI.
*   **Scalability/Editing**: To make a new building type available to the player, you would need to update `buildManager.js` to recognize the new type and call the appropriate manager's placement function (e.g., `turretManager.tryPlaceTurret()`). You would also need to update the UI in `src/ui.js` to include a button for the new building.

### 6. User Interface

*   **Location**: `src/ui.js`
*   **Description**: This file is responsible for creating and managing all the UI elements, such as resource displays, build menus, and wave information.
*   **Scalability/Editing**: To add new UI elements, you can add creation and update logic to `createUI()` and its related functions. The UI is built using Phaser's built-in game object creation methods, but also uses HTML elements for some parts of the interface.

## Project Dependencies

The project uses [Phaser 3](https://phaser.io/phaser3) as its game engine. Dependencies are managed through `package.json`. To install the dependencies, run `npm install`. 