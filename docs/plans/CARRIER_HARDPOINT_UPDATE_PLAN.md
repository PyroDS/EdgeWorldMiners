# Carrier Hardpoint Update Plan

## Current Implementation Overview

The carrier currently has two fixed mini-turrets that function as point defense weapons. These turrets are directly integrated into the carrier's implementation with the following characteristics:

- Created as part of the carrier initialization in `createCarrier()` function
- Visually represented as rectangular barrels positioned at fixed offsets
- Target and fire at enemies within range
- Share health pool with the carrier (not independently targetable)
- Projectiles managed within the carrier object's update loop

## Update Goals

1. Remove the current integrated turrets from the carrier
2. Add two hardpoints that can mount different weapon types
3. Make hardpoints independently targetable with their own health pools
4. Implement visual updates to show hardpoints and their destruction state
5. Default hardpoints will have "point defense turrets" similar to current functionality

## Implementation Plan

### 1. Create CarrierHardpoint Class

Create a new file `src/CarrierHardpoint.js` that will:

- Extend the `BaseTurret` class to leverage existing turret functionality
- Add carrier-specific positioning and update logic
- Include health and destruction properties
- Handle visual representation of the hardpoint mount and weapon

```javascript
// Example structure for CarrierHardpoint.js
export class CarrierHardpoint extends BaseTurret {
  constructor(scene, manager, carrier, offsetX, offsetY, turretType = 'PointDefense') {
    // Initialize with appropriate stats for the mount point itself
    super(scene, manager, carrier.x + offsetX, carrier.y + offsetY, 
          { HEALTH: 100 }, { PRIMARY: 0x5A5A7A });
    
    this.carrier = carrier;
    this.offset = { x: offsetX, y: offsetY };
    this.turretType = turretType;
    this.destroyed = false;
    
    // Create visual representation
    this.createVisuals();
    
    // Create the actual weapon based on type
    this.mountWeapon(turretType);
  }
  
  // Methods for visuals, positioning, weapon mounting, etc.
}
```

### 2. Create PointDefenseTurret Class

Create a new file `src/turrets/PointDefenseTurret.js` to implement the default weapon type:

- Extend the `BaseTurret` class
- Replicate the current mini-turret functionality but as a standalone class
- Include targeting, firing, and projectile management

### 3. Update Carrier Implementation

Modify `src/carrier.js` to:

1. Remove the current mini-turret implementation
2. Add support for hardpoints:
   ```javascript
   carrier.hardpoints = [];
   
   // Create hardpoints at the same positions as previous turrets
   const hardpointOffsets = [
     { x: -100, y: -40 },
     { x:  100, y: -40 }
   ];
   
   // Initialize hardpoints with default point defense weapons
   for (const offset of hardpointOffsets) {
     const hardpoint = new CarrierHardpoint(
       scene, 
       turretManager, 
       carrier, 
       offset.x, 
       offset.y,
       'PointDefense'
     );
     carrier.hardpoints.push(hardpoint);
   }
   
   // Update carrier's update method to also update hardpoints
   const originalUpdate = carrier.update;
   carrier.update = function() {
     originalUpdate.call(this);
     
     // Update all active hardpoints
     for (const hardpoint of this.hardpoints) {
       if (!hardpoint.destroyed) {
         hardpoint.update();
       }
     }
   };
   ```

3. Update the carrier's visual representation to show hardpoint mounts

### 4. Update TurretManager

Modify `src/turretManager.js` to:

1. Add support for managing carrier hardpoints
2. Include methods for hardpoint destruction and replacement
3. Register hardpoints as targetable objects for enemies

### 5. Update EnemyManager

Modify `src/enemyManager.js` to:

1. Allow enemies to target hardpoints
2. Adjust targeting priority to consider both carrier and hardpoints

## Testing Plan

1. Verify basic carrier movement and behavior remains intact
2. Confirm hardpoints visually appear in the correct positions
3. Test hardpoint targeting and firing mechanics
4. Verify hardpoints can be damaged independently of the carrier
5. Confirm visual feedback when hardpoints are damaged or destroyed

## Future Enhancements (Post-Implementation)

1. Add to Focus mode for viewing hardpoint status and health
2. Implement hardpoint weapon swapping/upgrading
3. Add additional weapon types beyond point defense
4. Create special abilities for certain hardpoint combinations

## Implementation Sequence

1. Create the `CarrierHardpoint` class
2. Create the `PointDefenseTurret` class 
3. Update the carrier implementation to use hardpoints
4. Update EnemyManager to target hardpoints
5. Test and refine the implementation 