# UI Duplication & Lifecycle Fix Plan

## 1. Problem Statement
When a new world is loaded (e.g., after clicking **Launch** on the Galaxy Map), the game re-creates a fresh `UI` instance.  Because persistent DOM nodes are attached to `#ui-overlay`—which lives outside of Phaser scenes—they are **not** destroyed when the scene is stopped.  Every reload therefore appends:

* another `<div id="top-bar-hud">` (HUD header)
* an extra left-nav `<nav class="left-nav-menu">` and duplicate hot-key list

The result is duplicated UI bars/links on subsequent worlds.

## 2. Requirements
1. The **left navigation** (logo, links, hot-keys, profile) is *persistent* and should be created **once** per browser session.
2. The **top HUD** is *world-specific* and should be (re)created every time a `GameScene` starts and removed when that scene shuts down.
3. Reloading or switching worlds must never leave dangling DOM nodes or duplicate keyboard listeners.
4. Follow `AI_DEVELOPMENT_GUIDELINES.md` – targeted, modular changes only.

## 3. Solution Overview
A. **Guarded DOM Creation**
   * Before inserting a new element, check if it already exists.
   * If a persistent element exists (left nav), skip recreation.
   * If a world-specific element exists (top HUD) from a previous world, remove it first.

B. **`UI.destroy()` Method**
   * Add a method that removes all world-specific DOM nodes (`#top-bar-hud`, build menu panel, settings modal, notification container).
   * Detach Phaser event listeners stored in the `UI` instance.

C. **Scene Lifecycle Hook**
   * In `GameScene.create()` register:
     ```javascript
     this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
       if (this.ui && this.ui.destroy) this.ui.destroy();
     });
     ```
   * Ensures cleanup when the player exits a world.

D. **Left Nav Construction Logic**
   * `UI.createLeftNavigation()` – if `.left-nav-menu` already exists inside `#left-nav`, do nothing.
   * `UI.createHotKeysSection()` – clear `#hotkeys-section` and rebuild (prevents duplicate list items while still allowing new keys to be added).

E. **HUD Creation Logic**
   * `UI.createHUD()` – if `#top-bar-hud` exists, remove it before inserting a fresh one.

F. **Wave System Verification**
   * With lifecycle fixed, `startGameplay()` will reliably run after terrain generation and call `enemyManager.startWave()`.  Add a temporary console log for confirmation.

## 4. Files to Modify
1. `src/ui.js`
   * Add guards & `destroy()` method.
2. `src/game.js`
   * Register `shutdown` hook for UI cleanup.

_No other modules are modified, preserving separation of concerns._

## 5. Testing
1. Launch a world ➜ ensure single HUD & single left nav.
2. Open Galaxy Map ➜ launch another planet ➜ verify duplicates do **not** appear.
3. Observe console: `startGameplay()` log fires and waves spawn (enemy counters increment).

## 6. Future Work
* Consider moving persistent UI (left nav) to its own class to further decouple scene-specific code, but this is out-of-scope for the targeted fix. 