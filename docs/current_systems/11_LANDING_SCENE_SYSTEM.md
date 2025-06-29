# Landing Scene System

**File**: [src/landingScene.js](../src/landingScene.js)

## Current State Summary

The Landing Scene System in EdgeWorldMiners serves as the entry point to the game, providing a welcome screen and access to the galaxy map for planet selection before starting gameplay. It creates a visually appealing space-themed welcome interface and manages the transition to the main game.

### Key Components

#### 1. Welcome Interface
- Creates a visually styled welcome screen
- Displays the game title "EDGE WORLD MINERS"
- Shows a welcome message for players
- Provides a clean, focused entry point to the game

#### 2. Background Visuals
- Generates a dynamic starfield background
- Creates stars of different sizes and brightness
- Implements twinkling animation with random delays
- Establishes the space theme of the game

#### 3. Navigation System
- Creates a minimal UI for navigation
- Provides access to the Galaxy Map
- Handles scene transitions
- Ensures clean UI state for the welcome screen

#### 4. Planet Selection Flow
- Integrates with GalaxyMap for planet selection
- Overrides the planet launch method to handle transitions
- Generates planet parameters based on selected planet type
- Stores parameters in the scene registry

#### 5. Cleanup System
- Tracks created DOM elements for later removal
- Ensures proper cleanup when transitioning to gameplay
- Prevents UI duplication issues

### Key Interactions

- **Galaxy Map System**: Integrates for planet selection functionality
- **Loading Scene**: Transitions to this scene when a planet is selected
- **UI System**: Creates minimal UI components for navigation
- **Registry**: Stores planet parameters for world generation

### Technical Details

- Uses Phaser Scene lifecycle methods (preload, create, update)
- Creates DOM elements for UI components
- Implements method overriding for Galaxy Map integration
- Handles audio context resumption on user interaction
- Uses CSS classes for visual styling

### Scene Flow

1. **Initialization**:
   - Creates background visual elements
   - Sets up minimal UI
   - Displays welcome panel

2. **User Interaction**:
   - Player opens Galaxy Map
   - Player selects a planet
   - Player launches expedition to the planet

3. **Transition**:
   - Cleans up UI elements
   - Generates and stores planet parameters
   - Transitions to the Loading Scene 