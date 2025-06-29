# Galaxy Map System

**File**: [src/galaxyMap.js](../src/galaxyMap.js)

## Current State Summary

The Galaxy Map System in EdgeWorldMiners provides a planet selection interface that allows players to choose different worlds with varying characteristics and difficulty levels. It implements the multi-planet gameplay concept by managing planet data, visualizing the galaxy, and facilitating transitions between worlds.

### Key Components

#### 1. Planet Type System
- Defines different planet types with unique characteristics:
  - **SMALL**: Limited resources, easier enemies
  - **LARGE**: Vast world, extensive resources
  - **RICH**: High resource multiplier
  - **DEEP**: Extremely deep terrain with valuable core resources
  - **EASY**: Minimal enemy activity
  - **HARD**: Dangerous with aggressive enemies
- Each type has properties for:
  - World dimensions (min/max width and height)
  - Resource multiplier
  - Enemy scaling factor
  - Visual styling

#### 2. Galaxy Definition
- Defines the current sector ("Alpha Sector")
- Contains multiple planets with:
  - Unique IDs and names
  - Planet type assignment
  - Positional coordinates on the map
  - Descriptions and visual properties

#### 3. Visual Interface
- Interactive star map showing available planets
- Voxel-style space background with stars and nebulae
- Planet selection with visual feedback
- Detailed planet information modal
- Launch expedition button

#### 4. Planet Selection & Transition
- Handles planet selection and visual indication
- Displays detailed information about selected planets
- Generates world parameters based on planet type
- Manages scene transitions when launching to a new planet
- Stores planet data in the scene registry

### Key Interactions

- **UI System**: Integrates with the main UI for toggling visibility
- **Game Scene**: Triggers restarts with new planet parameters
- **Registry**: Stores selected planet data for world generation
- **Loading Scene**: Receives new planet parameters for world creation

### Technical Details

- Uses DOM-based UI elements for the galaxy map interface
- Generates visual elements procedurally (stars, nebulae)
- Implements smooth transitions between planets
- Properly cleans up the previous world before generation
- Contains randomization within planet type constraints

### Galaxy Map Workflow

1. **Map Display**:
   - User opens the galaxy map interface
   - Interactive star map is displayed with planet indicators
   - Visual styling reflects planet types

2. **Planet Selection**:
   - User clicks on a planet
   - Planet is visually highlighted
   - Information panel displays planet details
   - Launch button becomes available

3. **World Generation**:
   - User clicks launch button
   - System generates specific world parameters
   - Parameters are saved to scene registry
   - Current world is shut down
   - Loading screen appears
   - New world is generated based on parameters 