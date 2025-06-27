# Plan to Update Left Navigation Bar with Hot Keys Section

## 1. Overview
Add a "Hot Keys" section to the bottom part of the left navigation bar that displays available keyboard shortcuts and their functions.

## 2. Styling Approach
- Use the existing CSS variables for consistent styling with the game's theme
- Add a separator line above the Hot Keys section
- Match the existing font, colors, and styling used in the UI

## 3. Implementation Steps

### Step 1: Update the index.html file
Modify the left-nav div to include a placeholder for the hot keys section:

```html
<div id="left-nav">
    <h1 class="game-title">Edge World Miners</h1>
    <!-- Future content: user profile, global stats, etc. -->
    
    <!-- Hot Keys Section will be dynamically populated -->
    <div id="hotkeys-section"></div>
</div>
```

### Step 2: Add CSS styles for the Hot Keys section
Add styling in `src/styles/ui.css` for the hot keys section:

```css
/* Hot Keys Section Styling */
#hotkeys-section {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--panel-border);
  font-size: 0.9rem;
}

#hotkeys-section h3 {
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
}

.hotkey-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hotkey-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.hotkey-button {
  background-color: rgba(0, 170, 255, 0.2);
  border: 1px solid var(--panel-border);
  border-radius: 3px;
  padding: 0 0.3rem;
  font-weight: bold;
  color: var(--text-secondary);
  display: inline-block;
  min-width: 1.5rem;
  text-align: center;
}
```

### Step 3: Update the UI.js class to create and populate the Hot Keys section
Add a new method in the `UI` class to create and manage the hot keys section:

```javascript
createHotKeysSection() {
  // Get the hot keys section element
  const hotkeysSection = document.getElementById('hotkeys-section');
  
  // Create the title
  const title = document.createElement('h3');
  title.innerText = 'HOT KEYS';
  hotkeysSection.appendChild(title);
  
  // Create the list
  const hotkeyList = document.createElement('ul');
  hotkeyList.className = 'hotkey-list';
  
  // Define all hot keys and their functions
  const hotkeys = [
    { key: 'B', description: 'Toggle Build Menu' },
    { key: '1', description: 'Select Drill' },
    { key: '2', description: 'Select Turret' },
    // Add more hot keys as they are implemented in the game
  ];
  
  // Create an entry for each hot key
  hotkeys.forEach(hotkey => {
    const item = document.createElement('li');
    item.className = 'hotkey-item';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'hotkey-button';
    keySpan.innerText = hotkey.key;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'hotkey-desc';
    descSpan.innerText = hotkey.description;
    
    // Add elements to the item
    item.appendChild(keySpan);
    item.appendChild(descSpan);
    
    // Add item to the list
    hotkeyList.appendChild(item);
  });
  
  // Append the list to the section
  hotkeysSection.appendChild(hotkeyList);
}
```

### Step 4: Call the new method in the UI constructor
Update the UI constructor to call the new method:

```javascript
constructor(scene, onSelectBuilding) {
  // ... existing code ...
  
  // Initialize UI components
  this.createHUD();
  this.createBuildMenu();
  this.createNotificationSystem();
  this.createKeyBindings();
  this.createSettingsUI();
  this.createHotKeysSection(); // Add this line
  
  // ... rest of existing code ...
}
```

## 4. Code Update Files
Files that need to be updated:
1. `src/ui.js` - Add the new method and call it in the constructor
2. `src/styles/ui.css` - Add styling for the hot keys section

## 5. Testing Strategy
After implementation:
1. Verify the hot keys section appears at the bottom of the left nav panel
2. Confirm the styling matches the game's theme
3. Check that all hot keys listed are functional
4. Ensure the section is responsive and displays well at different screen sizes

This plan follows the AI Development Guidelines by:
1. Maintaining modularity with a dedicated method for the hot keys section
2. Not refactoring any existing code
3. Thoroughly documenting the new code
4. Using comprehensive JSDoc-style comments for the new function
5. Following the existing UI patterns and styles 