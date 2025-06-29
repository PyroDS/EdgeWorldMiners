# Edge World Miners (Phaser 3)

## 🌌 Overview
A fast-paced sci-fi mining & defense game written in **Phaser 3**.  Navigate the galaxy map to select a planet, establish drilling operations on different worlds, mine the voxel terrain for resources, and defend your hardware against ever-stronger alien waves.  A sleek futuristic UI keeps you informed while dynamic terrain, explosions, and enemy AI make every session feel fresh.

---

## 🔧 Key Features
- 🚀 **Galaxy Map** – select from different planets with unique properties and difficulty levels.
- 🌌 **Landing Page** – welcome interface that allows you to select your destination.
- 🛸 **Hovering Carrier** – central resource drop-off & spawn point.
- 🧱 **Fully Destructible Voxel Terrain** – sand, dirt & rock layers with gravity simulation.
- ⛏ **Buildable Drills**
  - Mine downward automatically.
  - Reduced efficiency (25 %) & colour shift after reaching the world bottom.
  - 200 HP, takes colour-coded damage & explodes on destruction (60 px radius, 25 base dmg, terrain crater).
- 🚛 **Autonomous Cargo** – ferries mined ore up to the carrier and converts it to player resources.
- 🔫 **Macro Turrets**
  - 20 💠 cost, 500 px range, fires every 60 frames.
  - Explosive shells: 25 direct dmg + 15 AOE (≤ 80 px) with fall-off.
  - Health bar & damage flashes; shows targeting range during placement.
- 👾 **Procedural Enemy Waves**
  - Small / Medium / Large tiers with unique HP, speed & damage.
  - Patrol behaviour between attacks, targets drills first, then turrets.
  - Wave / break cycle, HUD progress bar & counters.
- 🏗 **Build Manager & Menu**
  - Toggle with **B** or UI button, hotkeys **1** (Drill) & **2** (Turret).
  - Holographic previews, live cost updates, placement validity colouring + turret AOE preview.
- 🎮 **Responsive HTML/CSS HUD Overlay** – dynamic resource & wave indicators, structure status, notification toasts; scales beautifully across window sizes.
- 🖱 **Smooth Camera Controls** – Arrow keys, mouse wheel (vertical) & middle-drag (horizontal).
- 📜 **Well-Commented ES Modules** – easy to read & extend.
- 📡 **Focus Mode Inspector** – press **F** to toggle a magnifier cursor that live-displays the material under your mouse (or SKY / UNDERGROUND) and contextual stats on buildings.
- 🌍 **Advanced Procedural World Generation** – multilayer Simplex-noise height-map, biome-based materials, caves, ore veins, sky gradient & animated clouds.

---

## 🕹️ Controls
| Action | Key / Mouse |
|--------|-------------|
| Access Galaxy Map | Click on Galaxy Map in the left navigation |
| Toggle Build Menu | **B** or UI button |
| Quick-Select Drill / Turret | **1** / **2** |
| Confirm Placement | Left Click |
| Cancel Build Mode | **ESC** or Right Click |
| Toggle Turret Stats | **T** |
| **Toggle Focus Mode** | **F** |
| Scroll Camera (Vertical) | Mouse Wheel ↑/↓ or Arrow ↑/↓ |
| Scroll Camera (Horizontal) | Arrow ←/→ or Middle-Button Drag |

---

## 🚀 Installation & Running
Prerequisites: **Node 16+** & **npm**.

```bash
npm install      # install Phaser & dev tools
npm start        # runs Parcel dev-server and opens the game
```
Parcel defaults to <http://localhost:1234>.  Change the port with the `--port` flag if needed.

## 🌟 Game Flow
1. **Landing Page** – When you first open the game, you'll see a welcome screen.
2. **Planet Selection** – Click on "Galaxy Map" in the left navigation to view available planets.
3. **World Generation** – After selecting a planet, the game generates a world with properties based on the planet type.
4. **Gameplay** – Build drills and turrets to mine resources and defend against enemy waves.
5. **Return to Landing** – Access the settings menu to return to the landing page and select a different planet.

---

## 🔬 Core Gameplay Details
### Mining & Drills
* Cost: **10** resources.  Place only on the topmost solid block.
* Mines one tile every ~1 s.  Cargo spawns every second mined tile (8 at bottom efficiency).
* HP: **200**.  Damage tint (orange / red) and chain-reaction explosions encourage careful layouts.

### Defense & Turrets
* Cost: **20** resources.  Can be built on any valid ground, same placement rules as drills.
* Shows AOE preview ring while placing.
* Fires homing explosive shells—direct and AOE damage with distance fall-off.
* Flashes red when taking hits; destroyed turrets leave debris.

### Enemy Waves
* Incremental wave system: each wave spawns **5 + 3 × (wave-1)** enemies.
* Break of 10 s (600 frames) between waves.  HUD bar shows progress / break time.
* Three tiers: **Small (30 HP, 70 px/s, 3 dmg)**, **Medium (60 HP, 50 px/s, 5 dmg)**, **Large (120 HP, 35 px/s, 10 dmg)**.
* AI prioritises nearest drill, then turret; damages terrain around the target on hit.

---

## 🗂️ Code Structure
| File | Responsibility |
|------|---------------|
| `src/game.js` | Phaser config, scene lifecycle, camera & manager wiring |
| `src/landingScene.js` | Landing page scene with welcome message |
| `src/galaxyMap.js` | Planet selection interface and world parameters |
| `src/ui.js` | Complete HUD, build menu, notifications & keybindings |
| `src/buildManager.js` | Handles build mode, previews, cost checking |
| `src/terrainManager.js` | Voxel terrain generation, rendering & physics-based destruction |
| `src/drillManager.js` | Drill placement, mining loop, health & explosion logic |
| `src/cargoManager.js` | Cargo sprite behaviour & resource deposit |
| `src/turretManager.js` | Turret stats, targeting, projectiles & health |
| `src/enemyManager.js` | Wave logic, enemy AI, patrol & attack routines |
| `src/resourceManager.js` | Centralised resource store (registry binding) |
| `src/carrier.js` | Creates the hover-carrier sprite one time |
| `src/styles/landing.css` | Styling for the landing page |
| `src/styles/galaxyMap.css` | Styling for the galaxy map interface |

---

## 📅 Roadmap
- Multiple ore types & automated sorting.
- Additional turret classes (laser, railgun, EM-pulse).
- Upgrade system for drills & turrets (range, rate, HP, etc.).
- Camera zoom & mini-map.
- Proper sound & music.
- Save / load via localStorage.

*Contributions & ideas are welcome – feel free to open an issue or PR!*
