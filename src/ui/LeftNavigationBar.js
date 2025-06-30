/**
 * LeftNavigationBar - Persistent left navigation component
 * Provides primary navigation for the game across all scenes.
 */
import { UIComponent } from './UIComponent.js';
import services from '../core/services.js';

export class LeftNavigationBar extends UIComponent {
  /**
   * Create a new left navigation bar
   */
  constructor() {
    super('left-nav');
    
    // Apply styling
    this.addClass('left-navigation-bar');
    
    // Get services
    this.eventBus = services.get('eventBus');
    this.gameState = services.get('gameState');
    
    // Track navigation items
    this.navigationItems = [];
    this.activeItem = null;
    
    // Create title
    this.title = new UIComponent(null, 'div');
    this.title.addClass('nav-title');
    this.title.setContent('EdgeWorld<br>Miners');
    this.addChild(this.title);
    
    // Create navigation container
    this.navList = new UIComponent(null, 'nav');
    this.navList.addClass('nav-list');
    this.addChild(this.navList);
  }
  
  /**
   * Initialize the component
   */
  init() {
    // Create standard navigation items
    this.addNavigationItem('home', 'Home', () => {
      this.eventBus.emit('navigation:home');
    });
    
    this.addNavigationItem('map', 'Galaxy Map', () => {
      this.eventBus.emit('overlay:show', { overlay: 'galaxyMap' });
    });
    
    this.addNavigationItem('base', 'Home Base', () => {
      this.eventBus.emit('navigation:base');
    });
    
    this.addNavigationItem('settings', 'Settings', () => {
      this.eventBus.emit('overlay:show', { overlay: 'settings' });
    });
    
    this.addNavigationItem('help', 'Help', () => {
      this.eventBus.emit('overlay:show', { overlay: 'help' });
    });
    
    // Listen for navigation changes
    this.eventBus.on('navigation:change', (data) => {
      this.setActiveItem(data.page);
    });
    
    // Set initial active item based on current scene
    const activeScene = this.gameState.get('ui.activeScene');
    if (activeScene) {
      // Map scene name to navigation item
      const navMap = {
        'gameScene': 'home',
        'homeBaseScene': 'base',
        'landingScene': 'home'
      };
      
      if (navMap[activeScene]) {
        this.setActiveItem(navMap[activeScene]);
      }
    }
  }
  
  /**
   * Add a navigation item to the bar
   * @param {string} id - Item identifier
   * @param {string} label - Display label
   * @param {Function} callback - Click handler
   * @returns {UIComponent} The created navigation item
   */
  addNavigationItem(id, label, callback) {
    // Create item component
    const item = new UIComponent(`nav-${id}`, 'div');
    item.addClass('nav-item');
    item.setContent(label);
    
    // Add click event
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Set as active item
      this.setActiveItem(id);
      
      // Execute callback
      if (callback && typeof callback === 'function') {
        callback();
      }
    });
    
    // Add to navigation list
    this.navList.addChild(item);
    
    // Store reference
    this.navigationItems.push({
      id,
      component: item
    });
    
    return item;
  }
  
  /**
   * Set the active navigation item
   * @param {string} id - Item identifier
   */
  setActiveItem(id) {
    // No change needed if already active
    if (this.activeItem === id) {
      return;
    }
    
    this.activeItem = id;
    
    // Update class on all items
    this.navigationItems.forEach(item => {
      if (item.id === id) {
        item.component.addClass('active');
      } else {
        item.component.removeClass('active');
      }
    });
    
    // Update state
    this.gameState.update('ui.activeNavItem', id);
  }
  
  /**
   * Called when navigation bar is mounted
   */
  onMount() {
    // Initialize once mounted
    this.init();
  }
} 