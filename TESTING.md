# EdgeWorldMiners UI Testing Guide

## Overview
This document provides instructions for testing the newly implemented UI components in the EdgeWorldMiners game.

## Quick Start

1. **Run the debug version:**
   ```
   npx parcel debug.html
   ```
   This will open a special debug page with a control panel for testing UI components.

2. **Run the standard version:**
   ```
   npx parcel index.html
   ```
   This will run the standard game with the UI components integrated.

## Testing the UI Components

### Using the Debug Panel
The debug page includes a panel with buttons to test different aspects of the UI:

- **Test All Components**: Runs a sequence of tests for all UI components
- **Test Notifications**: Shows different types of toast notifications
- **Test Dialogs**: Displays a sample dialog box
- **Test Left Nav**: Cycles through different navigation states
- **Test Galaxy Map**: Opens the Galaxy Map overlay
- **Toggle FPS**: Shows/hides the FPS counter
- **Print State**: Logs the current game state to console
- **Restart Game**: Restarts the game instance

### Console Debugging
You can also use the browser console to access debugging functions:

```javascript
// Test all UI components
window.debugControls.testUI();

// Show game state
window.debugControls.printState();

// Restart the game
window.debugControls.restart();

// Toggle slow motion for debugging animations
window.debugControls.slowMotion(true); // or false to disable
```

## Component Testing Checklist

### Left Navigation Bar
- [ ] Verify it appears on the left side of the screen
- [ ] Check that menu items highlight correctly on hover
- [ ] Confirm that active page is highlighted
- [ ] Test navigation between different sections

### Galaxy Map Overlay
- [ ] Verify it opens and closes properly
- [ ] Check that planets are displayed correctly
- [ ] Test planet selection functionality
- [ ] Confirm that it's properly centered and sized

### Modal Dialog
- [ ] Verify it appears centered on screen with proper backdrop
- [ ] Test confirm and cancel buttons
- [ ] Check that custom options work (title, content, buttons)
- [ ] Confirm that it closes properly

### Toast Notifications
- [ ] Test all notification types (info, success, warning, error)
- [ ] Verify they appear and disappear with proper timing
- [ ] Check that multiple notifications stack correctly
- [ ] Confirm that they're visible but not intrusive

## Troubleshooting

If you encounter any issues:

1. Check the browser console for errors
2. Verify that all asset files are present in the correct locations
3. Make sure Parcel is running without build errors
4. Try restarting the development server

## Notes for Developers

- The UI components use the EventBus system for communication
- State is managed through the GameState service
- All UI components extend from the base UIComponent class
- Styling is in src/styles/ui-components.css 

# EdgeWorldMiners Architecture Cleanup Implementation Plan

This document outlines the specific implementation steps needed to clean up the EdgeWorldMiners codebase to align with the architecture defined in `SOFTWARE_ARCHITECTURE_DOCUMENT.md`.

## Progress So Far

- ✅ Removed duplicate manager files from src/ root directory
  - ✅ src/resourceManager.js → src/managers/resourceManager.js (already implemented)
  - ✅ src/drillManager.js → src/managers/drillManager.js (already implemented)
  - ✅ src/terrainManager.js → src/managers/terrainManager.js (already implemented)
  - ✅ src/turretManager.js → src/managers/turretManager.js (already implemented)
  - ✅ src/enemyManager.old.js → src/managers/enemyManager.js (already implemented)
- ✅ Created entity subdirectories
  - ✅ src/entities/enemies/
  - ✅ src/entities/turrets/
  - ✅ src/entities/vehicles/
  - ✅ src/entities/buildings/
- ✅ Copied entity files to appropriate subdirectories
  - ✅ Copied enemy files to src/entities/enemies/
  - ✅ Copied turret files to src/entities/turrets/
  - ✅ Copied carrier to src/entities/vehicles/
- ✅ Updated imports that referenced old paths
  - ✅ CarrierHardpoint.js now imports BaseTurret from entities/turrets

## Remaining Tasks

### 1. Component System Consolidation

We currently have two similar but different component systems:
- `src/components/component.js` - Older implementation
- `src/core/component.js` - Newer implementation

The core implementation has more features, better organization, and follows our architecture document.

#### Implementation Steps:

1. **Move any unique functionality from `src/components/component.js` to `src/core/component.js`**:
   - Review for unique methods that should be preserved
   - Update `src/core/component.js` if needed

2. **Update entity files to use core components**:
   - `src/entities/enemies/BaseEnemy.js` → Update to use core components
   - `src/entities/enemies/MeleeEnemy.js` → Update to use core components
   - `src/entities/enemies/ShooterEnemy.js` → Update to use core components
   - `src/entities/turrets/BaseTurret.js` → Update to use core components
   - `src/entities/turrets/MacroTurret.js` → Update to use core components

3. **Delete the old component files after migration**:
   - `src/components/component.js`
   - `src/components/healthComponent.js`
   - `src/components/transformComponent.js`

### 2. Entity System Cleanup

Now that we have duplicated the entity files into the proper subdirectories, we need to:

1. **Delete the old entity files after testing**:
   - Once we've verified the new paths work correctly, delete the old files in src/entities root
   - `src/entities/BaseEnemy.js`
   - `src/entities/BaseTurret.js`
   - `src/entities/Carrier.js`
   - `src/entities/MacroTurret.js`
   - `src/entities/MeleeEnemy.js`
   - `src/entities/ShooterEnemy.js`

2. **Delete legacy entity directories after migration**:
   - `src/enemies/`
   - `src/turrets/`

### 3. Update Game.js Initialization

The game.js file should be updated to:
1. Properly import and register any missing managers (like TurretManager, DrillManager)
2. Use the Entity Registry from the core system
3. Clean up any remaining direct references to old systems

## Testing Checklist

After each step:
1. ✓ Test game.js to ensure the game loads properly
2. ✓ Test entity creation and behavior
3. ✓ Test component attachment and functionality
4. ✓ Test manager initialization and operation

## Follow-Up Items

- ✅ Review any usage of `enemyManager.old.js` and ensure it's fully migrated to the new system
- ✅ Audit files for references to old paths after migration
- Update documentation to reflect the new structure

## Future Work

After completing the above tasks, we should:

1. Implement unit tests for core systems
2. Document the component lifecycle and usage patterns
3. Create examples for adding new entity types
4. Review and optimize the update cycle for better performance

This plan will help systematically clean up the codebase and align it with the defined architecture, eliminating duplicated code and ensuring a more maintainable structure going forward. 