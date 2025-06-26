# UI Overhaul and Responsive Design Plan

## 1. Project Goal

The primary goal is to overhaul the existing UI to make it fully responsive and scalable. This involves separating the UI layer from the game's rendering layer to create a more flexible and maintainable architecture. This will allow the visible play area to expand or contract with the browser window size while the UI adapts independently.

A new main menu/left navigation panel will be introduced "outside" the play area for persistent information like user stats, global actions, and navigation.

## 2. Current Architecture Analysis

*   **`index.html`**: The current HTML file is minimal. It contains no DOM structure for the game or UI, and its only purpose is to load the main game script (`src/game.js`).
*   **`game.js`**: This file initializes the Phaser game engine with a **fixed canvas size** of `1280x800`. The game world is larger, and a camera is used for scrolling.
*   **`ui.js`**: All UI elements (the top HUD bar, build menus, modals, notifications) are currently rendered directly onto the Phaser canvas using Phaser's native Game Objects (`Rectangle`, `Text`, `Container`). Positioning is calculated based on the fixed camera dimensions.

**Core Limitation:** Because the UI is part of the game canvas, it cannot be made responsive independently of the game world. Simply scaling the canvas would distort all game objects (ships, enemies), which is not the desired behavior.

## 3. Proposed Architecture: A Hybrid Approach

We will adopt a hybrid architecture that leverages the strengths of both HTML/CSS and the Phaser/Canvas rendering engine.

*   **HTML/CSS for the UI Layer**: The UI will be rebuilt as a standard web interface using HTML elements styled with CSS. This is the best practice for creating complex, responsive, and accessible user interfaces.
*   **Phaser/Canvas for the Game Layer**: Phaser will be responsible only for rendering the game world (terrain, player assets, enemies, effects) within a dedicated canvas element.

## 4. Detailed Implementation Steps

### Step 1: Restructure `index.html`

The `index.html` file will be updated to define the primary layout of the application.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Edge World Miners</title>
    <!-- Link to a new CSS file for UI styling -->
    <link rel="stylesheet" href="src/styles/ui.css">
    <style>
      /* Basic body styles will remain */
      body { margin: 0; overflow: hidden; background: #000; font-family: 'Rajdhani', sans-serif; }
    </style>
</head>
<body>
    <!-- Main application container using Flexbox for layout -->
    <div id="app-container">
        <!-- New Left Navigation Panel -->
        <div id="left-nav">
            <h1 class="game-title">Edge World Miners</h1>
            <!-- Future content: user profile, global stats, etc. -->
        </div>

        <!-- Container for the game canvas and its UI overlay -->
        <div id="game-area-container">
            <!-- The Phaser canvas will be injected here by game.js -->
            <div id="game-container"></div>
            
            <!-- The UI overlay will sit on top of the game canvas -->
            <div id="ui-overlay">
                <!-- All in-game UI (HUD, build menu, modals) will be generated here -->
            </div>
        </div>
    </div>

    <!-- The game script remains the same -->
    <script type="module" src="src/game.js"></script>
</body>
</html>
```

### Step 2: Create `src/styles/ui.css`

A new CSS file will be created to style all the HTML UI elements.

*   It will define the layout for `#app-container`, `#left-nav`, and `#game-area-container` using Flexbox or CSS Grid.
*   It will style the `#ui-overlay` and its children (top bar, resource counters, etc.).
*   Styles will be based on the color palette and sci-fi theme already established in `ui.js`.
*   It will use responsive units (`rem`, `vw`, `vh`, `%`) to ensure the UI scales smoothly.

### Step 3: Update Phaser Configuration in `game.js`

The Phaser configuration will be modified to make the canvas responsive.

*   The fixed `width` and `height` properties will be removed.
*   The `parent` property will be set to `'game-container'`, telling Phaser where to inject its canvas.
*   A **Scale Manager** will be configured to make the canvas automatically resize to fill its parent container (`#game-container`).

```javascript
// Example of the new Phaser config in game.js
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE, // Resize to fit the parent
    parent: 'game-container',   // ID of the parent element
    width: '100%',
    height: '100%'
  },
  // ... other properties (physics, scene, etc.)
};
```
*   A `resize` event listener will be added to the main scene to handle camera adjustments when the window size changes, preventing visual artifacts.

### Step 4: Complete Refactor of `ui.js`

This is the most significant task. `ui.js` will be transformed from a Phaser-centric class into a DOM manipulation module.

*   **Responsibility**: The new `ui.js` will create, update, and manage HTML elements inside the `#ui-overlay` div. It will no longer create any Phaser Game Objects.
*   **Element Creation**: Functions like `createHUD` will now use `document.createElement()` to build the UI and append it to the DOM.
*   **Data Binding**: The `update` methods that read game state (e.g., `updateStructureStatus`) will now update the `innerText` or `innerHTML` of the corresponding HTML elements (e.g., `document.getElementById('resource-counter').innerText = resources;`).
*   **Event Handling**: Phaser input listeners (`.on('pointerdown', ...)`) will be replaced with standard DOM `addEventListener('click', ...)` for all UI buttons and interactive elements. Callbacks to game logic (e.g., `onSelectBuilding`) will be preserved.

## 5. Phased Execution Plan

This overhaul will be implemented in stages to ensure stability:

1.  **Setup**: Create the `docs` folder and this plan file.
2.  **Foundation**: Implement the new `index.html` structure and create the basic `ui.css` file.
3.  **Canvas Resizing**: Update `game.js` with the new responsive Phaser scale configuration.
4.  **UI Migration (Component by Component)**:
    *   Migrate the **Top HUD Bar** from Phaser objects to HTML/CSS.
    *   Migrate the **Build Menu** panel and its buttons.
    *   Migrate the **Settings Button & Modal**.
    *   Migrate the **Notification System**.
5.  **Testing**: Thoroughly test at each stage across different window sizes to ensure both the game and UI behave as expected.

This structured approach will systematically transition the game to a modern, responsive, and maintainable architecture. 