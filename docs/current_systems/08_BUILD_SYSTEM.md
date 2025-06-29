# Build System

**File**: [src/buildManager.js](../src/buildManager.js)

## Current State Summary

The Build System in EdgeWorldMiners handles the user interface and logic for placing structures in the game world. It coordinates building placement, resource costs, and visual previews to enable the player to construct drills and turrets.

### Key Components

#### 1. Build Mode Management
- Toggles the game into "build mode" when a building is selected
- Handles input events for placement, cancellation, and preview updates
- Maintains state tracking for the currently selected building type
- Implements safety features to prevent accidental placement

#### 2. Building Types
- Currently supports two building types:
  - **Drills**: Mining structures that extract resources
  - **Turrets**: Defensive structures that attack enemies
- Each building type has its own stats, costs, and placement behavior

#### 3. Preview System
- Creates visual previews of buildings before placement
- Updates preview position as the mouse moves
- Color-codes previews based on placement validity
- Shows range indicators for buildings with area effects (turrets)

#### 4. Placement Validation
- Checks terrain for valid placement locations
- Ensures sufficient resources for construction
- Provides visual feedback on placement validity

#### 5. Resource Management
- Verifies resource availability before placement
- Deducts resources when buildings are placed
- Retrieves cost information from building stats

### Key Interactions

- **UI System**: Receives building selection from UI controls
- **Terrain System**: Validates placement locations
- **Resource System**: Checks and spends resources for construction
- **Drill Manager**: Delegates drill creation
- **Turret Manager**: Delegates turret creation and preview rendering

### Technical Details

- Uses Phaser's input system for mouse interaction
- Creates and updates visual previews using Phaser graphics
- Implements pointer event handling for placement and cancellation
- Uses a modular approach to support different building types
- Maintains separate preview handling for different building visuals

### Build Lifecycle

1. **Selection**:
   - Player selects a building type from UI
   - Build mode is activated with the selected type
   - Preview sprite is created

2. **Preview**:
   - Preview follows mouse cursor with pointer move events
   - Color indicates valid/invalid placement
   - Range indicators show area of effect

3. **Placement**:
   - Click on valid location attempts to place building
   - Resources are checked and deducted
   - Appropriate manager creates the actual building

4. **Cancellation**:
   - Right-click or ESC key cancels build mode
   - Preview sprites are cleaned up
   - Build state is reset 