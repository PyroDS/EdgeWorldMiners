# Resource System

**File**: [src/resourceManager.js](../src/resourceManager.js)

## Current State Summary

The Resource System in EdgeWorldMiners is currently very minimal, managing a single resource type used for building and upgrading.

### Key Components

#### 1. Resource Storage
- Maintains a single numerical value starting at 30 units
- Stores the value in both the manager instance and the scene registry

#### 2. Resource Operations
- `spend(amount)`: Deducts resources if sufficient amount exists
- `add(amount)`: Increases resources by given amount
- `get()`: Returns current resource amount

### Key Interactions

- `DrillManager` adds resources when minerals are mined
- `TurretManager` and `BuildManager` spend resources to purchase equipment
- `UI` system reads the resource value from scene registry to display it

### Technical Details

- Simple class structure with minimal functionality
- Uses Phaser's scene registry for state sharing
- No support for multiple resource types
- No support for resource caps or conversion

### Limitations

The current system is extremely basic and would need significant expansion to support:
- Multiple resource types (minerals, energy, research points)
- Resource storage capacity limitations 
- Resource conversion between different types
- Resource visualization and UI components
- Resource transportation between planets 