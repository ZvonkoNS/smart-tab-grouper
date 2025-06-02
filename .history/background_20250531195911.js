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
          '*://ai.google.dev/*',
          '*://makersuite.google.com/*',
          '*://aistudio.google.com/*',
          '*://perplexity.ai/*',
          '*://*.perplexity.ai/*'
        ]
      }
    };
    
    this.groupCache = new Map();
    this.processingTabs = new Set();
    this.initializeExtension();
  }

  async initializeExtension() {
    try {
      // Load user preferences
      const stored = await chrome.storage.sync.get(['groupConfigs', 'enabled']);
      if (stored.groupConfigs) {
        this.groupConfigs = { ...this.groupConfigs, ...stored.groupConfigs };
      }
      this.enabled = stored.enabled !== false;

      // Set up event listeners
      this.setupEventListeners();
      
      // Wait a bit for browser to be ready
      setTimeout(async () => {
        await this.discoverExistingGroups();
        await this.processExistingTabs();
      }, 1000);
      
    } catch (error) {
      console.error('Error initializing extension:', error);
    }
  }

  setupEventListeners() {
    // Listen for new tabs
    chrome.tabs.onCreated.addListener(async (tab) => {
      if (this.enabled && tab.url && tab.url !== 'chrome://newtab/') {
        // Wait a bit for tab to load
        setTimeout(() => this.processTab(tab), 500);
      }
    });

    // Listen for tab updates (URL changes)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (this.enabled && changeInfo.status === 'complete' && tab.url) {
        await this.processTab(tab);
      }
    });

    // Clean up when tabs are removed
    chrome.tabs.onRemoved.addListener(() => {
      setTimeout(() => this.cleanupEmptyGroups(), 1000);
    });
  }

  async discoverExistingGroups() {
    try {
      const windows = await chrome.windows.getAll();
      
      for (const window of windows) {
        try {
          const groups = await chrome.tabGroups.query({ windowId: window.id });
          
          for (const group of groups) {
            for (const [groupType, config] of Object.entries(this.groupConfigs)) {
              if (group.title === config.title || 
                  group.title.toLowerCase() === config.title.toLowerCase()) {
                const cacheKey = `${window.id}-${groupType}`;
                this.groupCache.set(cacheKey, group.id);
                console.log(`Discovered existing ${groupType} group:`, group.id);
              }
            }
          }
        } catch (error) {
          console.error('Error querying groups for window:', window.id, error);
        }
      }
    } catch (error) {
      console.error('Error discovering existing groups:', error);
    }
  }

  async refreshGroupDetection() {
    this.groupCache.clear();
    await this.discoverExistingGroups();
    await this.processExistingTabs();
    return this.groupCache.size;
  }

  async processExistingTabs() {
    try {
      const windows = await chrome.windows.getAll({ populate: true });
      
      for (const window of windows) {
        for (const tab of window.tabs) {
          if (tab.url && !tab.url.startsWith('chrome://') && tab.status === 'complete') {
            await this.processTab(tab);
            // Small delay between processing tabs
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error) {
      console.error('Error processing existing tabs:', error);
    }
  }

  async processTab(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || this.processingTabs.has(tab.id)) {
      return;
    }

    const groupType = this.determineGroupType(tab.url);
    if (!groupType) return;

    this.processingTabs.add(tab.id);
    
    try {
      await this.addTabToGroup(tab, groupType);
    } catch (error) {
      console.error('Error processing tab:', error);
    } finally {
      this.processingTabs.delete(tab.id);
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
      // Get current tab info to ensure it's still valid
      const currentTab = await chrome.tabs.get(tab.id);
      if (!currentTab) return;

      let groupId = this.groupCache.get(cacheKey);
      
      // Search for existing groups if not cached
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
      
      // Verify group still exists
      if (groupId) {
        try {
          await chrome.tabGroups.get(groupId);
        } catch {
          this.groupCache.delete(cacheKey);
          groupId = null;
        }
      }

      // Don't process if already in correct group
      if (currentTab.groupId === groupId && groupId !== chrome.tabs.TAB_ID_NONE) {
        return;
      }

      // Create new group or add to existing
      if (!groupId) {
        console.log(`Creating new ${groupType} group for tab:`, currentTab.url);
        groupId = await chrome.tabs.group({
          tabIds: [currentTab.id]
        });

        await chrome.tabGroups.update(groupId, {
          title: config.title,
          color: config.color
        });

        this.groupCache.set(cacheKey, groupId);
        console.log(`Created ${groupType} group with ID:`, groupId);
      } else {
        console.log(`Adding tab to existing ${groupType} group:`, groupId);
        await chrome.tabs.group({
          groupId: groupId,
          tabIds: [currentTab.id]
        });
      }

    } catch (error) {
      console.error(`Error adding tab to ${groupType} group:`, error);
      // If tab doesn't exist anymore, that's okay
      if (error.message && error.message.includes('No tab with id')) {
        return;
      }
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
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ error: error.message });
    }
  })();
  
  return true;
});
