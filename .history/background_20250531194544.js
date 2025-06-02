// background.js
class TabGroupManager {
  constructor() {
    this.groupConfigs = {
      gmail: {
        title: 'Gmail',
        color: 'red',
        patterns: [
          '*://mail.google.com/*',
          '*://gmail.com/*',
          '*://*.gmail.com/*'
        ]
      },
      ai: {
        title: 'AI',
        color: 'blue',
        patterns: [
          '*://chat.openai.com/*',
          '*://chatgpt.com/*',
          '*://*.openai.com/*',
          '*://gemini.google.com/*',
          '*://bard.google.com/*',
          '*://perplexity.ai/*',
          '*://*.perplexity.ai/*'
        ]
      }
    };
    
    this.groupCache = new Map();
    this.initializeExtension();
  }

  async initializeExtension() {
    // Load user preferences
    const stored = await chrome.storage.sync.get(['groupConfigs', 'enabled']);
    if (stored.groupConfigs) {
      this.groupConfigs = { ...this.groupConfigs, ...stored.groupConfigs };
    }
    this.enabled = stored.enabled !== false; // Default to enabled

    // Set up event listeners
    this.setupEventListeners();
    
    // Discover existing groups before processing tabs
    await this.discoverExistingGroups();
    
    // Process existing tabs on startup
    await this.processExistingTabs();
  }

  setupEventListeners() {
    // Listen for new tabs
    chrome.tabs.onCreated.addListener((tab) => {
      if (this.enabled && tab.url && tab.url !== 'chrome://newtab/') {
        this.processTab(tab);
      }
    });

    // Listen for tab updates (URL changes)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (this.enabled && changeInfo.url && tab.url) {
        this.processTab(tab);
      }
    });

    // Clean up group cache when tabs are removed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.cleanupEmptyGroups();
    });

    // Handle window focus changes
    chrome.windows.onFocusChanged.addListener(() => {
      this.cleanupEmptyGroups();
    });
  }

  async discoverExistingGroups() {
    try {
      const windows = await chrome.windows.getAll();
      
      for (const window of windows) {
        const groups = await chrome.tabGroups.query({ windowId: window.id });
        
        for (const group of groups) {
          // Check if this group matches any of our configured groups
          for (const [groupType, config] of Object.entries(this.groupConfigs)) {
            if (group.title === config.title || 
                group.title.toLowerCase() === config.title.toLowerCase()) {
              const cacheKey = `${window.id}-${groupType}`;
              this.groupCache.set(cacheKey, group.id);
              console.log(`Discovered existing ${groupType} group:`, group.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error discovering existing groups:', error);
    }
  }

  async refreshGroupDetection() {
    // Clear existing cache
    this.groupCache.clear();
    
    // Rediscover groups
    await this.discoverExistingGroups();
    
    // Reprocess all tabs
    await this.processExistingTabs();
    
    return this.groupCache.size;
  }

  async processExistingTabs() {
    try {
      const windows = await chrome.windows.getAll({ populate: true });
      
      for (const window of windows) {
        for (const tab of window.tabs) {
          if (tab.url && !tab.url.startsWith('chrome://')) {
            await this.processTab(tab);
          }
        }
      }
    } catch (error) {
      console.error('Error processing existing tabs:', error);
    }
  }

  async processTab(tab) {
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    const groupType = this.determineGroupType(tab.url);
    if (!groupType) return;

    try {
      await this.addTabToGroup(tab, groupType);
    } catch (error) {
      console.error('Error processing tab:', error);
    }
  }

  determineGroupType(url) {
    for (const [groupType, config] of Object.entries(this.groupConfigs)) {
      for (const pattern of config.patterns) {
        if (this.matchesPattern(url, pattern)) {
          return groupType;
        }
      }
    }
    return null;
  }

  matchesPattern(url, pattern) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(url);
  }

  async addTabToGroup(tab, groupType) {
    const config = this.groupConfigs[groupType];
    const windowId = tab.windowId;
    const cacheKey = `${windowId}-${groupType}`;

    try {
      // First, check if we have a cached group ID
      let groupId = this.groupCache.get(cacheKey);
      
      // If no cached group, search for existing groups with matching title
      if (!groupId) {
        const existingGroups = await chrome.tabGroups.query({ windowId: windowId });
        const matchingGroup = existingGroups.find(group => 
          group.title === config.title || 
          group.title.toLowerCase() === config.title.toLowerCase()
        );
        
        if (matchingGroup) {
          groupId = matchingGroup.id;
          this.groupCache.set(cacheKey, groupId);
        }
      }
      
      // Verify group still exists if we have an ID
      if (groupId) {
        try {
          await chrome.tabGroups.get(groupId);
        } catch {
          // Group doesn't exist anymore, remove from cache
          this.groupCache.delete(cacheKey);
          groupId = null;
        }
      }

      // If tab is already in the correct group, do nothing
      if (tab.groupId === groupId && groupId !== chrome.tabs.TAB_ID_NONE) {
        return;
      }

      // Create new group if needed
      if (!groupId) {
        groupId = await chrome.tabs.group({
          tabIds: [tab.id]
        });

        await chrome.tabGroups.update(groupId, {
          title: config.title,
          color: config.color
        });

        this.groupCache.set(cacheKey, groupId);
      } else {
        // Add tab to existing group
        await chrome.tabs.group({
          groupId: groupId,
          tabIds: [tab.id]
        });
      }

    } catch (error) {
      console.error(`Error adding tab to ${groupType} group:`, error);
    }
  }

  async cleanupEmptyGroups() {
    try {
      const windows = await chrome.windows.getAll({ populate: true });
      
      for (const window of windows) {
        const groups = await chrome.tabGroups.query({ windowId: window.id });
        
        for (const group of groups) {
          const tabsInGroup = window.tabs.filter(tab => tab.groupId === group.id);
          
          if (tabsInGroup.length === 0) {
            // Remove empty group from cache
            for (const [key, cachedGroupId] of this.groupCache.entries()) {
              if (cachedGroupId === group.id) {
                this.groupCache.delete(key);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up empty groups:', error);
    }
  }

  async toggleEnabled() {
    this.enabled = !this.enabled;
    await chrome.storage.sync.set({ enabled: this.enabled });
    
    if (this.enabled) {
      await this.discoverExistingGroups();
      await this.processExistingTabs();
    }
    
    return this.enabled;
  }

  async updateGroupConfig(groupType, config) {
    this.groupConfigs[groupType] = { ...this.groupConfigs[groupType], ...config };
    await chrome.storage.sync.set({ groupConfigs: this.groupConfigs });
  }

  getStatus() {
    return {
      enabled: this.enabled,
      groupConfigs: this.groupConfigs,
      activeGroups: this.groupCache.size
    };
  }
}

// Initialize the manager
const tabGroupManager = new TabGroupManager();

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getStatus':
          sendResponse(tabGroupManager.getStatus());
          break;
          
        case 'toggleEnabled':
          const enabled = await tabGroupManager.toggleEnabled();
          sendResponse({ enabled });
          break;
          
        case 'updateGroupConfig':
          await tabGroupManager.updateGroupConfig(request.groupType, request.config);
          sendResponse({ success: true });
          break;
          
        case 'processAllTabs':
          await tabGroupManager.processExistingTabs();
          sendResponse({ success: true });
          break;

        case 'refreshGroups':
          const activeGroups = await tabGroupManager.refreshGroupDetection();
          sendResponse({ success: true, activeGroups });
          break;
          
        default:
          sendResponse({ error: 'Unknown action
