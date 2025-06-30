# EdgeWorldMiners UI Wireframes

This document presents wireframe designs and screen layout concepts for the key interfaces in EdgeWorldMiners, based on the new architectural requirements. These wireframes maintain the existing UI structure with a persistent left navigation bar and header bar while accommodating new features.

## 1. Common UI Elements

### Persistent Left Navigation Bar

The left navigation bar remains consistent across all screens, providing core navigation functionality.

```
┌──────── Left Navigation (240px) ────────┐
│ Home Base                               │
│ Galaxy Map                              │
│ Research                                │
│ Upgrades                                │
│ Settings                                │
│                                         │
│ -------- Hot Keys --------              │
│  B  Toggle Build Menu                   │
│  F  Focus Mode                          │
│  M  Galaxy Map                          │
└─────────────────────────────────────────┘
```

### Header Bar (World/Expedition Screens)

The header bar appears on gameplay screens to display critical information.

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ RES: 500 | DRILLS: 2 | TURRETS: 3 │ PLANET: MINERALIS (Rich, Med) │ WAVE 3 ░░▒▒▓▓▓▓      │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Landing Menu

The Landing Menu serves as the entry point to the game while maintaining the existing navigation structure.

```
┌───┬─────────────────────────────────────────────────┐
│   │                                                 │
│   │           EDGE WORLD MINERS                     │
│ L │                                                 │
│ E │   Welcome, Commander.                           │
│ F │   Use the navigation panel to open the          │
│ T │   Galaxy Map and begin your adventure.          │
│   │                                                 │
│ N │               [OPEN GALAXY MAP]                 │
│ A │                                                 │
│ V │                               v1.0.0           │
└───┴─────────────────────────────────────────────────┘
```

### Key Features:
- **Welcome Panel**: Centered title and greeting
- **Open Galaxy Map Button**: Primary call-to-action
- **Left Navigation**: Provides access to all other sections
- **Version Number**: Displayed bottom right

### User Flow:
1. **Open Galaxy Map**: Launches the Galaxy Map overlay
2. **Navigation Panel**: Access Home Base, Settings, etc. via left nav

## 3. Galaxy Map View

The Galaxy Map is implemented as a full-screen overlay that temporarily covers the entire UI, including the left navigation bar. This preserves the current implementation approach.

```
┌─────────────────────────────────────────────────────┐
│ GALAXY MAP: ALPHA SECTOR                   [CLOSE] │
├─────────────────────────────────────────────────────┤
│                                                     │
│                                                     │
│     ┌──────────────────────┐  ┌───────────────┐    │
│     │                      │  │ PLANET DETAILS│    │
│     │                      │  │ ─────────────────  │
│     │                      │  │ NAME: MINERALIS    │
│     │     [INTERACTIVE     │  │ TYPE: RICH         │
│     │      STAR MAP WITH   │  │ RESOURCES: HIGH    │
│     │      PLANET ICONS]   │  │ DANGER: MEDIUM     │
│     │                      │  │                    │
│     │                      │  │ DESCRIPTION:       │
│     │                      │  │ Rich in minerals,  │
│     │                      │  │ but watch for      │
│     │                      │  │ hostile fauna.     │
│     │                      │  │                    │
│     │                      │  │ [LAUNCH BUTTON]    │
│     │                      │  │ [RETURN TO HOME]   │
│     └──────────────────────┘  └───────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Key Features:
- **Full-Screen Overlay**: Covers the entire screen including left navigation
- **Interactive Map**: Visual representation of planets
- **Planet Details Panel**: Shows information on hover/selection
- **Launch Button**: Starts expedition to selected planet
- **Return Button**: Takes player back to Home Base
- **Close Button**: Dismisses the overlay and returns to previous screen

### Implementation Details:
- Implemented as a modal overlay rather than a separate scene
- Opens on top of the current view when activated
- Preserves the state of the underlying scene/UI
- Maintains proper Z-index ordering to appear on top of all other UI

## 4. Home Base View

The Home Base serves as the strategic hub, with different facilities for research, upgrades, and resource management.

```
┌───┬─────────────────────────────────────────────────┐
│   │ HOME BASE                            [CLOSE]    │
│   ├─────────────────────────────────────────────────┤
│   │                                                 │
│ L │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│ E │ │RESEARCH│ │WORKSHOP│ │LOGISTICS│ │STORAGE│    │
│ F │ └────────┘ └────────┘ └────────┘ └────────┘    │
│ T ├─────────────────────────────────────────────────┤
│   │                                                 │
│ N │  ┌──────────────────────────────────────────┐  │
│ A │  │                                          │  │
│ V │  │                                          │  │
│   │  │                                          │  │
│ B │  │   [ANIMATED FACILITY VISUALIZATION]      │  │
│ A │  │                                          │  │
│ R │  │                                          │  │
│   │  │                                          │  │
│   │  └──────────────────────────────────────────┘  │
│   │                                                 │
│   │  ┌──────────────┐  ┌─────────────────────────┐ │
│   │  │ RESOURCES    │  │ FACILITY ACTIONS        │ │
│   │  │ ───────────  │  │ ──────────────────      │ │
│   │  │ METAL: 500   │  │ [ACTION 1] - 50 METAL   │ │
│   │  │ CRYSTAL: 200 │  │ [ACTION 2] - 75 CRYSTAL │ │
│   │  │ GAS: 100     │  │ [UPGRADE] - 200 METAL   │ │
│   │  └──────────────┘  └─────────────────────────┘ │
│   │                      [LAUNCH EXPEDITION]       │
└───┴─────────────────────────────────────────────────┘
```

### Key Features:
- **Left Navigation**: Consistent with other screens
- **Facility Navigation Tabs**: Switch between different rooms
- **Animated Facility View**: Visual representation of the current facility
- **Resource Display**: Shows current resources and storage capacity
- **Action Panel**: Facility-specific actions (research, upgrades, etc.)

### Facility-Specific Panels:

#### Research Lab
```
┌────────────────────────────────────────┐
│ RESEARCH PROJECTS                      │
│ ──────────────────                     │
│                                        │
│ [TECH TREE VISUALIZATION]              │
│                                        │
│  ○──→○──→◉                             │
│  │   │   │                             │
│  ○───○───○                             │
│                                        │
│ SELECTED: ADVANCED DRILLING            │
│ COST: 150 METAL, 50 CRYSTAL            │
│ TIME: 5:00                             │
│                                        │
│ [START RESEARCH]  [CANCEL]             │
└────────────────────────────────────────┘
```

#### Workshop
```
┌────────────────────────────────────────┐
│ CARRIER UPGRADES                       │
│ ───────────────                        │
│                                        │
│ [CARRIER VISUALIZATION]                │
│                                        │
│ HULL STRENGTH: ■■■□□  [+] 200 METAL    │
│ TURRET SLOTS:  ■■□□□  [+] 150 METAL    │
│ DRONE CAPACITY:■■□□□  [+] 100 CRYSTAL  │
│ CARGO SPACE:   ■□□□□  [+] 250 METAL    │
│                                        │
│ [APPLY UPGRADES]  [RESET]              │
└────────────────────────────────────────┘
```

#### Logistics Room
```
┌────────────────────────────────────────┐
│ EXPEDITION RESOURCES                   │
│ ───────────────────                    │
│                                        │
│ ACTIVE EXPEDITIONS: 1                  │
│                                        │
│ PLANETX: RUNNING (15:30)               │
│  - METAL:   250 ⬈                      │
│  - CRYSTAL: 120 ⬈                      │
│  - GAS:     50  ⬈                      │
│                                        │
│ [REQUEST CARGO RETURN]                 │
│                                        │
└────────────────────────────────────────┘
```

#### Storage Bay
```
┌────────────────────────────────────────┐
│ RESOURCE STORAGE                       │
│ ───────────────                        │
│                                        │
│ METAL:   500/1000                      │
│ [████████████████░░░░░░░░░░░░░░░]      │
│                                        │
│ CRYSTAL: 200/500                       │
│ [████████████████░░░░░░░░░░░░░░░]      │
│                                        │
│ GAS:     100/300                       │
│ [███████████░░░░░░░░░░░░░░░░░░░░]      │
│                                        │
│ [UPGRADE STORAGE]  [CONVERT RESOURCES] │
└────────────────────────────────────────┘
```

## 5. Expedition View

The Expedition interface combines the current gameplay with new resource export functionality, maintaining the existing header and left navigation.

```
┌───┬─────────────────────────────────────────────────┐
│   │ RESOURCES: 500 🔄 | WAVE: 3 | ENEMIES: 5 | HP:███│
│   ├─────────────────────────────────────────────────┤
│   │                                                 │
│   │                                                 │
│ L │                                                 │
│ E │                                                 │
│ F │                                                 │
│ T │               [GAME WORLD VIEW]                 │
│   │                                                 │
│ N │                                                 │
│ A │                                                 │
│ V │                                                 │
│   │                                                 │
│ B │                                                 │
│ A │                                                 │
│ R │                                                 │
│   ├─────────────────────────────────────────────────┤
│   │ ┌─────────┐ ┌─────────┐ ┌──────────────────┐   │
│   │ │BUILD MENU│ │RESOURCES│ │ EXPORT CARGO     │   │
│   │ │         │ │         │ │ METAL: 0   [+|-] │   │
│   │ │ [DRILL] │ │METAL:250│ │ CRYSTAL: 0 [+|-] │   │
│   │ │ [TURRET]│ │CRYS: 75 │ │ GAS: 0     [+|-] │   │
│   │ │ [WALL]  │ │         │ │ [SEND TO BASE]   │   │
│   │ └─────────┘ └─────────┘ └──────────────────┘   │
└───┴─────────────────────────────────────────────────┘
```

### Key Features:
- **Left Navigation**: Consistent with other screens
- **Header Bar**: Shows critical gameplay information
- **Resource Display**: Shows current on-planet resources
- **Build Menu**: Access to building and defense structures
- **Export Interface**: Allows sending resources to Home Base

## 6. UI Flow Diagram

The following diagram illustrates how the different screens connect and how users navigate between them, with the Galaxy Map as an overlay rather than a full scene:

```
┌───────────────┐
│  LANDING MENU │
└───────┬───────┘
        │
 ┌──────┴────────┐
 │               │
 ▼               ▼
┌────────┐    
│ HOME   │    
│ BASE   │
└────┬───┘  ┌ ─ ─ ─ ─ ─ ┐
     └─────►│ GALAXY MAP│ (Overlay)
            │  OVERLAY  │
            └ ─ ─ ─ ─ ─ ┘
                   │
                   ▼
              ┌────────┐
              │LOADING │
              │SCREEN  │
              └────┬───┘
                   │
                   ▼
              ┌────────┐
              │EXPEDIT-│
              │  ION   │
              └────────┘
```

### Navigation Flow:
- **Left Nav Consistently Available**: Users can switch between main screens using the persistent left navigation
- **Galaxy Map as Overlay**: Opens on top of either Home Base or Expedition scenes
- **Home Base → Expedition**: Via Galaxy Map overlay and planet selection
- **Expedition → Home Base**: Direct navigation or via Galaxy Map overlay
- **Map Button**: Opens Galaxy Map overlay without changing the underlying scene

## 7. Responsive Considerations

These wireframes maintain the existing UI structure while ensuring responsive design principles:

1. **Persistent Left Navigation**: Always visible but can collapse to icons only on smaller screens
2. **Header Bar**: Fixed at top on world/gameplay screens
3. **Scalable Content Area**: Central content adapts to remaining space
4. **Panel Organization**: Panels stack vertically on smaller screens
5. **Overlay Management**: Galaxy Map overlay adapts to screen size

### Mobile Adaptation Example:
```
┌─┬────────────────────┐
│≡│ HOME BASE    [X]   │
├─┼────────────────────┤
│N│ [RES][WRK][LOG][ST]│
│A├────────────────────┤
│V│                    │
│ │                    │
│B│  [FACILITY VIEW]   │
│A│                    │
│R│                    │
│ ├────────────────────┤
│ │ RESOURCES:         │
│ │ METAL: 500 CRYS:200│
├─┼────────────────────┤
│ │ [ACTION 1][ACTION 2]│
│ │                    │
│ │ [LAUNCH EXPEDITION]│
└─┴────────────────────┘
```

## 8. Visual Style Guide

While maintaining the current visual aesthetics, these UI elements should follow these guidelines:

1. **Color Scheme**:
   - Panel background: Deep navy (#0a1a2a)
   - Accent/border: Electric blue (#00aaff)
   - Highlight text: Cyan (#00ccff)
   - Warning: Warm orange (#ff9933)
   - Danger: Alert red (#ff3300)
   - Background: Dark space-like gradient
   - Text: White (#ffffff)

2. **Typography**:
   - Primary font: Rajdhani (already loaded)
   - Header size: 24px
   - Body text: 16px
   - Small text/captions: 12px

3. **Left Navigation Style**:
   - Dark blue background (#0a1a2a)
   - Width: 240px fixed
   - Right border: 2px solid #00aaff
   - Text: white (#ffffff) / highlighted: #00ccff
   - Links with left border highlight on hover
   - Organized with main navigation at top, hotkeys at bottom
   - Full height with flex column layout

4. **Header Bar Style**:
   - Semi-transparent dark blue background (rgba(10, 26, 42, 0.85))
   - Height: 80px
   - Bottom border: 2px solid #00aaff
   - Grid layout with 4 sections (Left, Planet, Center, Right)
   - Resource counter with hexagonal icon (#33ffcc)
   - Planet info in center with name and details
   - Wave/enemy information with visual progress indicators
   - Status indicators for structures and alerts

5. **Overlay Styling**:
   - Semi-transparent dark background
   - Clear visual hierarchy
   - Prominent close button
   - Smooth transition animations

## 9. Implementation Notes

### Preserving Existing Left Navigation

It is important to note that the left navigation bar shown in these wireframes is not a new design but rather represents the existing navigation system that should be preserved throughout the architecture changes. All new screens should continue to use this established navigation pattern for UI consistency.

Key implementation considerations:
- Maintain the same visual appearance of the left navigation across all screens
- Preserve the existing navigation item layout and functionality
- Ensure the navigation remains accessible during all scene transitions
- Adapt the header bar to show context-appropriate information in each scene

### Galaxy Map as an Overlay

The Galaxy Map is implemented as a full-screen overlay that appears on top of the current scene, rather than as a separate scene with persistent navigation:

- Should maintain the current implementation as a modal overlay
- The overlay should cover the entire screen, including the left navigation
- The underlying scene state should be preserved while the overlay is active
- Proper Z-index management ensures the overlay appears above all other UI
- Closing the overlay should return to the previous state

When implementing new screens or features, developers should:
1. Reuse the existing left navigation component for full scenes
2. Implement overlays like Galaxy Map as modal dialogs that temporarily hide the navigation
3. Ensure the header bar shows relevant information for the current scene
4. Maintain visual consistency with the existing UI language