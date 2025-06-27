# AI Development Guidelines for Edge World Miners

## Core Principles

1. **Modularity First**: Always write code in a modular fashion. Each function should have a single responsibility.

2. **Never Refactor Existing Code**: Do not move, reorganize, or change any existing code unless directly working on that specific feature or fixing a bug in that code.

3. **Comprehensive Documentation**: All code must be thoroughly commented.

## Code Documentation Standards

### File Headers
Every JavaScript file must begin with a comment block that:
- Summarizes the file's purpose
- Lists key responsibilities
- Notes any dependencies

Example:
```javascript
/**
 * turretManager.js
 * 
 * Manages all turret-related functionality including placement, targeting,
 * firing mechanics, damage calculations, and turret health/destruction.
 * 
 * Dependencies:
 * - resourceManager.js (for cost verification)
 * - terrainManager.js (for placement validation)
 */
```

### Function Documentation
Every function must have a JSDoc-style comment block that:
- Describes what the function does
- Lists parameters and return values
- Notes any side effects

Example:
```javascript
/**
 * Places a turret at the specified coordinates if placement is valid
 * and resources are available.
 * 
 * @param {number} x - The x coordinate for placement
 * @param {number} y - The y coordinate for placement
 * @returns {Phaser.GameObjects.Sprite|null} The created turret sprite or null if placement failed
 */
function placeTurret(x, y) {
    // Function implementation
}
```

## Development Workflow

1. **Targeted Changes**: Only modify the specific files and functions needed to implement the requested feature or fix.

2. **Preserve Existing Patterns**: When adding new code, follow the patterns established in existing files.

3. **Maintain Module Boundaries**: Respect the separation of concerns across files. Don't add functionality to a module that belongs elsewhere.

4. **Test Before Implementation**: Before implementing new features, ensure you understand how they integrate with the existing codebase.

## Feature-Specific Guidelines

### Adding New Enemy Types
- Create a new file in the `enemies/` directory that extends BaseEnemy.js
- Document all properties and methods thoroughly
- Only modify enemyManager.js to add spawning logic

### Adding New Turret Types
- Create a new file in the `turrets/` directory that extends BaseTurret.js
- Document all properties and methods thoroughly
- Only modify turretManager.js to add placement/selection logic

### UI Modifications
- Follow existing UI patterns in ui.js
- Document all selectors and event handlers
- Ensure responsive design is maintained

## Project Architecture

The game is built with Phaser 3 and uses a modular architecture with separate manager classes for different game systems. When implementing new features:

1. Identify the appropriate module for your changes
2. Add new files for new entity types rather than expanding existing ones
3. Update the appropriate manager to handle new entity types

## Common Anti-Patterns to Avoid

1. **Refactoring Temptation**: Do not yield to the temptation to "clean up" or "reorganize" code that's not directly related to your task.

2. **Copy-Paste Coding**: Don't duplicate large blocks of code. Create shared utility functions instead.

3. **Cross-Module Dependencies**: Avoid creating circular dependencies between modules.

## Performance Considerations

1. Optimize render-intensive operations
2. Be mindful of memory usage with sprite creation/destruction
3. Use object pooling for frequently created/destroyed objects (projectiles, particles)
4. Document any operations that might impact performance

Remember: The AI must always prioritize maintaining the existing architecture over making "improvements" that weren't specifically requested. 