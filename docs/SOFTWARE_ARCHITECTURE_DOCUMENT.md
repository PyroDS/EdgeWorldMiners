# EdgeWorldMiners Software Architecture Document

## 1. Executive Summary

This document outlines the comprehensive software architecture for EdgeWorldMiners, a voxel-based mining and tower defense game. The architecture is designed to support the evolution from the current prototype into a more robust, modular, and scalable application that can accommodate future features including a Home Base system, multiple expedition planets, research progression, and more complex gameplay mechanics.

## 2. Architecture Overview

### 2.1 Current Architecture Assessment

The current EdgeWorldMiners codebase exhibits characteristics of a **Component-Manager architecture** with elements of the **Scene System** pattern provided by Phaser 3. The application primarily consists of:

1. **Scene Management**: Phaser scenes (LoadingScene, GameScene, LandingScene) forming the primary gameplay loop
2. **Manager Classes**: Domain-specific managers for terrain, resources, enemies, drills, etc.
3. **Entity Components**: Individual game entity classes (Carrier, BaseEnemy, BaseTurret)
4. **UI Management**: Hybrid DOM/Canvas UI system with persistent left navigation and header bars

While functional for a prototype, the current architecture faces several challenges:
- **Tight Coupling**: Many components directly reference other components
- **Limited State Management**: Heavy reliance on imperative updates rather than reactive state
- **Monolithic Scenes**: Core game loop concentrated in a single scene with many responsibilities
- **Scalability Constraints**: Limited modularity for adding new content types

### 2.2 Target Architecture

To support the expanded feature set, we recommend evolving toward a **Modular Component-Based Architecture** with the following characteristics:

1. **Core Systems Layer**: Fundamental game systems (rendering, physics, input)
2. **Domain Manager Layer**: Specialized managers for domain-specific logic 
3. **Component Layer**: Reusable, self-contained game entity components
4. **State Management Layer**: Centralized state with reactive updates
5. **Scene Management Layer**: Decoupled scene transitions and persistence
6. **Service Layer**: Cross-cutting concerns and external integrations

This architecture will prioritize:
- **Loose Coupling**: Components communicate via events and service locators
- **High Cohesion**: Related functionality grouped into clearly defined modules
- **Extensibility**: Easy addition of new entity types and features
- **Testability**: Components designed for isolated testing
- **Performance**: Optimized rendering and update cycles for late-game scaling
- **UI Consistency**: Maintaining the persistent left navigation and header bar structure

## 3. Core Architecture Components

### 3.1 Scene Management System

The game will use a multi-scene approach, with clearly defined scene types while maintaining UI consistency:

1. **Meta Scenes**
   - `LandingScene`: Entry point with game options
   - `HomeBaseScene`: Central hub for research, upgrades and expedition management

2. **Gameplay Scenes**
   - `LoadingScene`: World generation and resource loading
   - `ExpeditionScene`: Main gameplay for mining/defense on planets
   - `ResultScene`: Post-expedition summary and rewards

3. **UI Overlays**
   - `GalaxyMapOverlay`: Planet selection interface implemented as a full-screen overlay
   - `ModalOverlay`: Base class for popups and temporary interfaces
   - `DialogOverlay`: Information and confirmation dialogs

4. **UI Components** (persistent across scenes)
   - `LeftNavigationBar`: Always present for core navigation
   - `HeaderBar`: Status information for gameplay screens
   - `UIOverlay`: Context-specific UI elements

Scene transitions will follow this pattern while maintaining the left navigation:
```
LandingScene ↔ HomeBaseScene → [GalaxyMapOverlay] → LoadingScene → ExpeditionScene → ResultScene → HomeBaseScene
```

### 3.2 State Management System

A centralized, reactive state management system will be implemented:

1. **Core State**: Game-wide persistent state (research, unlocks, resources)
2. **Session State**: Current expedition/gameplay state
3. **UI State**: Interface visibility and configuration
4. **Settings State**: User preferences and configuration
5. **Navigation State**: Current navigation location and history

This will be implemented using:
- A central `GameState` service
- Event-driven updates to minimize direct coupling
- Subscription model for state consumers
- Persistence layer for saving/loading

### 3.3 Resource Management System

The resource system will be expanded to support:

1. **Multiple Resource Types**:
   - Basic: Metal, Crystal, Gas
   - Advanced: Energy, Research Points, Fabrication Materials
   - Special: Artifacts, Blueprint Fragments

2. **Resource Operations**:
   - Collection, Storage, Transportation
   - Conversion and Processing
   - Consumption and Production

3. **Home Base Integration**:
   - Resource storage and limits
   - Automated processing facilities
   - Transportation logistics

### 3.4 Entity Component System

Game entities will follow a composition-based pattern:

1. **Base Components**:
   - Renderable (visual representation)
   - Physical (collision and physics)
   - Health (damage and destruction)
   - Interactive (player interaction)

2. **Specialized Components**:
   - BuildingComponent (placement, construction, upgrading)
   - CombatComponent (attack, defense, targeting)
   - ResourceComponent (gathering, storage, transport)
   - AIComponent (behavior, pathfinding, decision-making)

3. **Entity Registry**:
   - Central repository for active entities
   - Spatial partitioning for performance
   - Update cycle management
   - Component querying system

## 4. Domain-Specific Architectures

### 4.1 Home Base System

The Home Base will be architecturally separated into:

1. **Base Facilities**:
   - Research Lab: Tech tree progression
   - Workshop: Carrier/equipment upgrades
   - Logistics Room: Resource management
   - Expedition Deck: Mission launching
   - Storage Bay: Resource storage and management

2. **Facility Management**:
   - Level progression system
   - Upgrade paths and requirements
   - Visual representation
   - Functionality unlocks

3. **Integration Points**:
   - `HomeBaseManager`: Overall base state and operations
   - `ResearchManager`: Tech tree and research progression
   - `UpgradeManager`: Equipment and carrier improvements
   - `ResourceStorageManager`: Resource capacity and handling
   - `LeftNavigationService`: Integration with persistent navigation

### 4.2 Expedition System

The expedition system will manage planetary missions:

1. **Planet Generation**:
   - Procedural planet properties and parameters
   - Difficulty scaling and rewards
   - Environmental challenges
   - Resource distribution

2. **Expedition Flow**:
   - Launch preparation and loadout
   - Resource collection and objective completion
   - Return logic with recovered resources
   - Risk/reward balancing

3. **Integration Points**:
   - `GalaxyMapOverlay`: Planet selection and visualization
   - `ExpeditionManager`: Mission state and progress
   - `CargoManager`: Resource transport and recovery
   - `ResultsManager`: Mission outcome calculation
   - `HeaderBarManager`: Real-time status display

### 4.3 Research & Technology System

The research system will enable progression:

1. **Tech Tree Structure**:
   - Research nodes with prerequisites
   - Multiple tech branches (Mining, Defense, Production, Exploration)
   - Research costs and time requirements
   - Unlockable abilities and upgrades

2. **Research Process**:
   - Resource investment
   - Time-based progression
   - Instant completion options
   - Discovery mechanics (optional)

3. **Integration Points**:
   - `TechTreeManager`: Research visualization and selection
   - `ResearchQueueManager`: Active research management
   - `UnlockRegistry`: Track available technologies
   - `UpgradeRegistry`: Apply research effects to entities

### 4.4 Construction System

The construction system will handle building:

1. **Construction Process**:
   - Resource allocation
   - Building placement
   - Construction time
   - Construction drones/vehicles

2. **Building Types**:
   - Resource collection (drills, extractors)
   - Defense (turrets, shields, walls)
   - Production (factories, refineries)
   - Utility (sensors, teleporters, storage)

3. **Integration Points**:
   - `BuildManager`: Placement and construction queue
   - `DroneManager`: Construction unit control
   - `BuildingRegistry`: Available buildings and requirements
   - `PlacementValidator`: Check valid building locations

## 5. Technical Architecture

### 5.1 Framework Structure

The application will continue to use Phaser 3 as the core game engine, with:

1. **Core Modules**:
   - Rendering (Phaser Canvas/WebGL)
   - Physics (Phaser Arcade Physics)
   - Input (Keyboard, Mouse, Touch)
   - Audio (Web Audio API)

2. **Custom Extensions**:
   - Enhanced entity component system
   - Custom particle system for performance
   - Efficient terrain chunk management
   - Dynamic asset loading system
   - Persistent UI framework

3. **Third-party Integrations**:
   - Data persistence (localStorage, IndexedDB)
   - Analytics (optional)
   - Cloud saving (future)

### 5.2 Performance Optimization

Critical performance areas include:

1. **Terrain Rendering**:
   - Chunk-based loading and unloading
   - Visibility culling for off-screen elements
   - Material batching for WebGL optimization
   - Level-of-detail for distant terrain

2. **Entity Management**:
   - Spatial partitioning for collision detection
   - Update frequency management
   - Object pooling for frequently created/destroyed entities
   - Activation zones for AI and behavior

3. **Memory Management**:
   - Asset unloading for scene transitions
   - Texture atlas optimization
   - Garbage collection monitoring
   - Memory profiles for different devices

### 5.3 UI Architecture

The UI system will be structured to maintain the existing layout paradigm while improving modularity:

1. **Persistent Components**:
   - `LeftNavigationBar`: Always visible, provides core navigation
   - `HeaderBar`: Present on gameplay screens, shows critical information
   - `ModalSystem`: Manages overlays and modal dialogs

2. **Scene-Specific Components**:
   - `HomeBaseUI`: Facility selection and management interfaces
   - `ExpeditionUI`: Build menu, resource management, and export

3. **Overlay Components**:
   - `GalaxyMapOverlay`: Full-screen overlay for planet selection
   - `DialogOverlay`: Information and confirmation overlays
   - `MenuOverlay`: Game menus and options

4. **Component Hierarchy**:
   - `UIComponent` (base class)
     - `ContainerComponent` (holds other components)
       - `NavigationComponent`
       - `ButtonComponent`
       - `PanelComponent`
         - `ResourcePanel`
         - `BuildPanel`
         - etc.
     - `OverlayComponent` (for full-screen overlays)
       - `GalaxyMapOverlay`
       - `ModalOverlay`
       - `DialogOverlay`

### 5.4 Code Organization

The codebase will be organized into:

1. **Core Directory Structure**:
   ```
   src/
   ├── core/           # Core systems and base classes
   ├── scenes/         # Scene definitions
   ├── overlays/       # Full-screen overlays like Galaxy Map
   ├── entities/       # Game entity implementations
   │   ├── buildings/
   │   ├── enemies/
   │   ├── turrets/
   │   └── vehicles/
   ├── components/     # Reusable entity components
   ├── managers/       # Domain-specific managers
   ├── services/       # Cross-cutting services
   ├── ui/             # User interface elements
   │   ├── components/ # Reusable UI components
   │   ├── layout/     # Layout components (navigation, header)
   │   └── screens/    # Screen-specific UI
   ├── utils/          # Utility functions
   └── assets/         # Game assets and resources
   ```

2. **Naming Conventions**:
   - PascalCase for classes and components
   - camelCase for methods and properties
   - UPPER_SNAKE_CASE for constants
   - kebab-case for assets and resources

3. **Module Pattern**:
   - ES6 modules for code organization
   - Default exports for primary classes
   - Named exports for utilities and constants
   - Circular dependency avoidance

## 6. Implementation Roadmap

### 6.1 Migration Strategy

The transition from the current architecture should follow these phases:

1. **Phase 1: Core Refactoring**
   - Extract state management system
   - Improve manager communication patterns
   - Establish event system for decoupling
   - Create entity component base classes
   - Refactor UI to maintain existing layout while improving code structure

2. **Phase 2: Scene Restructuring**
   - Split monolithic GameScene
   - Implement proper scene transitions
   - Create UI overlay system
   - Establish data persistence between scenes
   - Preserve navigation consistency across scenes
   - Refine Galaxy Map as a proper overlay

3. **Phase 3: New Systems**
   - Implement Home Base system
   - Add Research and Tech Tree
   - Expand resource types
   - Create construction system with drones

4. **Phase 4: Content Expansion**
   - Add new building types
   - Expand enemy variety
   - Create multiple planet types
   - Implement mission system

### 6.2 Feature Prioritization

Features should be implemented in this order:

1. **Essential Infrastructure**
   - State management system
   - Multi-scene architecture
   - Enhanced resource system
   - Improved entity management
   - UI component system (preserving navigation)
   - Overlay management system

2. **Core Gameplay Loop**
   - Home Base (MVP version)
   - Basic research system
   - Simple expedition flow
   - Resource transportation

3. **Enhanced Features**
   - Advanced building types
   - Enemy variety and behaviors
   - Construction drones
   - Tech tree expansion

4. **Polish and Extension**
   - Performance optimization
   - Visual improvements
   - Additional content
   - User account integration (optional)

## 7. Best Practices & Guidelines

### 7.1 Code Standards

1. **General Principles**
   - Follow SOLID design principles
   - Favor composition over inheritance
   - Keep classes focused and cohesive
   - Document public APIs and complex logic

2. **Performance Guidelines**
   - Minimize object creation in update loops
   - Use object pooling for frequent entity creation
   - Batch rendering operations
   - Implement spatial partitioning for collision

3. **Maintainability**
   - Use meaningful variable and function names
   - Keep functions short and focused
   - Comment complex algorithms and decisions
   - Write unit tests for core logic

### 7.2 UI Guidelines

To maintain consistent UI across the application:

1. **Navigation Consistency**
   - Left navigation available on all main screens
   - Consistent navigation item order and behavior
   - Visual indicators for current location
   - Smooth transitions between screens

2. **Overlay Management**
   - Galaxy Map implemented as full-screen overlay
   - Proper Z-index management for overlays
   - Smooth transitions for overlay opening/closing
   - Underlying scene state preservation

3. **Information Hierarchy**
   - Critical gameplay information in header bar
   - Context-specific actions in main content area
   - Consistent placement of common elements
   - Clear visual grouping of related elements

4. **Interaction Patterns**
   - Consistent button styles for similar actions
   - Standard patterns for drag and drop interactions
   - Clear feedback for user actions
   - Keyboard shortcuts for common operations

### 7.3 Architecture Enforcement

To maintain architectural integrity:

1. **Code Review Process**
   - Check for adherence to patterns
   - Prevent direct manager references
   - Enforce event-based communication
   - Verify proper separation of concerns

2. **Dependency Management**
   - Use service locators for manager access
   - Inject dependencies rather than direct instantiation
   - Avoid circular dependencies
   - Isolate third-party code

3. **Documentation Requirements**
   - Document all managers and services
   - Maintain architecture diagrams
   - Track architectural decisions
   - Update docs for significant changes

## 8. Appendix

### 8.1 Glossary

- **Component**: Reusable piece of functionality attached to entities
- **Entity**: Game object composed of components
- **Manager**: Coordinates specific domain of game logic
- **Service**: Provides functionality across multiple managers
- **Scene**: Distinct gameplay state with its own entities and logic
- **Overlay**: Full-screen UI element that temporarily covers other UI components
- **State**: Data representing the current game condition
- **Left Navigation**: Persistent sidebar for main game navigation
- **Header Bar**: Status display bar for critical gameplay information

### 8.2 References

- Phaser 3 Documentation: https://photonstorm.github.io/phaser3-docs/
- Game Programming Patterns: https://gameprogrammingpatterns.com/
- Entity Component System: https://www.gamedev.net/articles/programming/general-and-gameplay-programming/understanding-component-entity-systems-r3013/ 