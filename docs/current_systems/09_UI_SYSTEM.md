# UI System

**Files**:
- [src/ui.js](../src/ui.js) (Main UI implementation)
- [src/focusMode.js](../src/focusMode.js) (Magnifier functionality)
- [src/galaxyMap.js](../src/galaxyMap.js) (Planet selection screen)

## Current State Summary

The UI System in EdgeWorldMiners manages all user interface elements, including HUD, build menus, notifications, and interactive components. It combines DOM-based UI elements with Phaser game elements to create a responsive and feature-rich interface.

### Key Components

#### 1. Heads-Up Display (HUD)
- **Top Bar**: Displays essential game information
  - Resources counter with visual indicators
  - Structure status (drill and turret counts)
  - Planet information
  - Wave status and progress
  - Enemy counters with type indicators

#### 2. Build System UI
- Build menu for placing structures
- Visual representation of available buildings
- Cost information and hotkey indicators
- Toggle functionality with keyboard shortcuts

#### 3. Notification System
- Displays temporary messages to the player
- Supports different message types (info, success, warning, danger)
- Fade-in/fade-out animations
- Queuing system for multiple notifications

#### 4. Settings Interface
- Modal dialog for game settings
- Volume controls for music and sound effects
- Graphical quality settings
- Controls for pausing and resuming the game

#### 5. Navigation Elements
- Left sidebar with navigation options
- Hotkeys section with keyboard controls reference
- Planet information display

#### 6. Special Features
- **Focus Mode**: Magnifier tool for detailed interaction
- **Galaxy Map**: Planet selection and navigation
- Keyboard shortcut system

### Key Interactions

- **Build Manager**: Receives building selection and communicates build status
- **Resource Manager**: Displays current resource count
- **Enemy Manager**: Shows wave status and enemy counts
- **Drill/Turret Managers**: Shows structure counts and health status
- **Phaser Registry**: Listens for data changes to update UI

### Technical Details

- Uses DOM-based UI elements for most interface components
- Creates and manages elements through JavaScript
- Implements CSS styling for visual appearance
- Uses event listeners for user interaction
- Handles cleanup to prevent memory leaks
- Responsive design that works across different screen sizes

### UI Component Lifecycle

1. **Initialization**:
   - Creates DOM elements for UI components
   - Establishes event listeners
   - Sets up data bindings

2. **Update**:
   - Refreshes UI elements based on game state
   - Updates resource counts, wave status, health indicators
   - Responds to player input

3. **Cleanup**:
   - Removes DOM elements when scene changes
   - Clears event listeners to prevent memory leaks
   - Manages transitions between different screens

### Key UI Sections

- **Resource Display**: Shows current resource count with visual feedback
- **Structure Status**: Displays drill/turret counts and health warnings
- **Wave Indicator**: Shows current wave, status, and progress
- **Enemy Counters**: Displays count of active enemies by type
- **Build Menu**: Interface for selecting and placing buildings
- **Settings Modal**: Configuration options for gameplay and audio
- **Planet Info**: Details about the current planet being played 