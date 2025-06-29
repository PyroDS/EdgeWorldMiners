# Landing Page Implementation Plan

## Overview
This document outlines the plan for implementing a landing page for Edge World Miners. The landing page will serve as the initial entry point when users navigate to the web application, rather than immediately starting gameplay. From this page, users can access the galaxy map and select a world to play.

## Current Flow
Currently, the application flow is:
1. User navigates to the application
2. `index.html` loads the game directly via `game.js`
3. `LoadingScene` immediately starts generating a world
4. Game begins with waves of enemies after world generation

## New Flow
The new flow will be:
1. User navigates to the application
2. Landing page is displayed with welcome message
3. User selects "Galaxy Map" from left navigation
4. Galaxy map is displayed
5. User selects a planet
6. Selected world is generated and gameplay begins

## Implementation Plan

### 1. Create Landing Scene
- Create a new `LandingScene` class in a new file `src/landingScene.js`
- This scene will display the welcome message and handle initial UI setup
- It will not generate a world until the user selects one

### 2. Modify Game Initialization
- Update `game.js` to start with the `LandingScene` instead of immediately launching into `LoadingScene`
- Move world generation logic to only trigger after planet selection

### 3. Landing Page UI Components
- Create a welcome panel in the center of the screen
- Style the panel to match the game's existing UI theme
- Add the message "Welcome, select Galaxy Map to get started"

### 4. Connection Points

#### Left Navigation Bar
- Ensure left navigation bar is visible in the landing scene
- `ui.js` already has `createLeftNavigation()` method that can be reused
- Galaxy Map option must be available from start

#### Galaxy Map Integration
- Ensure Galaxy Map can be opened directly from landing page
- Reuse existing `galaxyMap.js` functionality
- When a planet is selected, transition from LandingScene to LoadingScene with planet parameters

#### Game Initialization
- Modify `game.js` to include the new scene in the Phaser configuration
- Update initialization flow to start with LandingScene

### 5. Modularity Considerations
- Ensure the landing page can be easily extended for future features
- Design UI components for reuse
- Prepare for potential payment modal integration

## File Modifications

1. `src/landingScene.js` (new file)
   - Create LandingScene class
   - Implement welcome panel
   - Set up scene transitions

2. `src/game.js`
   - Update configuration to include LandingScene
   - Modify initialization to start with LandingScene
   - Ensure world parameters are passed correctly between scenes

3. `src/ui.js`
   - Ensure left navigation is properly initialized for LandingScene
   - Add specific handling for UI elements in the landing context

## Testing Plan
1. Verify landing page appears on initial load
2. Test navigation to Galaxy Map
3. Ensure planet selection works correctly
4. Confirm world generation with selected parameters
5. Test returning to landing page/galaxy map after game over 