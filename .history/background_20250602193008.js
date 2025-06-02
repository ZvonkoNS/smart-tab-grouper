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
          '*://*.gmail.com/*',
          '*://www.gmail.com/*'
        ]
      },
      ai: {
        title: 'AI',
        color: 'blue',
        patterns: [
          '*://chat.openai.com/*',
          '*://chatgpt.com/*',
          '*://*.openai.com/*',
          '*://www.chatgpt.com/*',
          '*://gemini.google.com/*',
          '*://bard.google.com/*',
          '*://ai.google.dev/*',
          '*://makersuite.google.com/*',
          '*://aistudio.google.com/*',
          '*://perplexity.ai/*',
          '*://*.perplexity.ai/*',
          '*://www.perplexity.ai/*'
        ]
      }
    };
    
    this.groupCache = new Map();
    this.domainGroupCache = new Map();
    this.pendingTabs = new Map();
    this.settings = {
      domainGrouping: false,
      minTabsForDomainGroup: 2,
      excludePinnedTabs: true,
      mergeSubdomains: false
    };
    
    this.initializeExtension();
  }

  async initializeExtension() {
    try {
      const stored = await chrome.storage.sync.get(['groupConfigs', 'enabled', 'settings']);
      if (stored.groupConfigs) {
        this.groupConfigs = { ...this.groupConfigs, ...stored.groupConfigs };
      }
      if (stored.settings) {
        this.settings = { ...this.settings, ...stored.settings };
      }
      this.enabled = stored.enabled !== false;

      this.setupEventListeners();
      
      setTimeout(async () => {
        await this.discoverExistingGroups();
        await this.processExistingTabs();
      }, 2000);
      
    } catch (error) {
      console.error('Error initializing extension:', error);
    }
  }

  setupEventListeners() {
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (!this.enabled) return;
      
      if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        console.log('Tab completed loading:', tab.url);
        
        setTimeout(async () => {
          await this.processTab(tab);
        }, 1000);
      }
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (!this.enabled) return;
      
      if (changeInfo.url && !changeInfo.url.startsWith('chrome://')) {
        console.log('Tab URL changed:', changeInfo.url);
        
        setTimeout(async () => {
          await this.processTab(tab);
        }, 1000);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.pendingTabs.delete(tabId);
      setTimeout(() => this.cleanupEmptyGroups(), 2000);
    });
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      let domain = urlObj.hostname;
      
      // Remove www. prefix if mergeSubdomains is enabled
      if (this.settings.mergeSubdomains && domain.startsWith('www.')) {
        domain = domain.substring(4);
      }
      
      // For mergeSubdomains, extract main domain (e.g., google.com from mail.google.com)
      if (this.settings.mergeSubdomains) {
        const parts = domain.split('.');
        if (parts.length > 2) {
          domain = parts.slice(-2).join('.');
        }
      }
      
      return domain;
    } catch (error) {
      console.error('Error extracting domain from URL:', url, error);
      return null;
    }
  }

  async discoverExistingGroups() {
    try {
      console.log('Discovering existing groups...');
      const windows = await chrome.windows.getAll();
      
      for (const window of windows) {
        try {
          const groups = await chrome.tabGroups.query({ windowId: window.id });
          console.log(`Found ${groups.length} groups in window ${window.id}`);
          
          for (const group of groups) {
            // Check for predefined groups (Gmail, AI)
            for (const [groupType, config] of Object.entries(this.groupConfigs)) {
              if (group.title === config.title || 
                  group.title.toLowerCase() === config.title.toLowerCase()) {
                const cacheKey = `${window.id}-${groupType}`;
                this.groupCache.set(cacheKey, group.id);
                console.log(`Cached existing ${groupType} group:`, group.id);
              }
            }
            
            // Check for domain groups
            if (this.settings.domainGrouping) {
              const domainCacheKey = `${window.id}-${group.title}`;
              this.domainGroupCache.set(domainCacheKey, group.id);
              console.log(`Cached existing domain group "${group.title}":`, group.id);
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

  async processExistingTabs() {
    try {
      console.log('Processing existing tabs...');
      const windows = await chrome.windows.getAll({ populate: true });
      
      for (const window of windows) {
        if (this.settings.domainGrouping) {
          await this.groupTabsByDomain(window);
        }
        
        // Process individual tabs for predefined groups
        for (const tab of window.tabs) {
          if (tab.url && !tab.url.startsWith('chrome://') && tab.status === 'complete') {
            await this.processTab(tab);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
    } catch (error) {
      console.error('Error processing existing tabs:', error);
    }
  }

  async groupTabsByDomain(window) {
    try {
      const domainGroups = new Map();
      
      // Group tabs by domain
      for (const tab of window.tabs) {
        if (!tab.url || tab.url.startsWith('chrome://')) continue;
        if (this.settings.excludePinnedTabs && tab.pinned) continue;
        
        const domain = this.extractDomain(tab.url);
        if (!domain) continue;
        
        // Skip if tab already matches a predefined group
        if (this.determineGroupType(tab.url)) continue;
        
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, []);
        }
        domainGroups.get(domain).push(tab);
      }
      
      // Create groups for domains with enough tabs
      for (const [domain, tabs] of domainGroups.entries()) {
        if (tabs.length >= this.settings.minTabsForDomainGroup) {
          await this.createDomainGroup(domain, tabs, window.id);
        }
      }
    } catch (error) {
      console.error('Error grouping tabs by domain:', error);
    }
  }

  async createDomainGroup(domain, tabs, windowId) {
    try {
      const groupTitle = this.formatDomainTitle(domain);
      const cacheKey = `${windowId}-${groupTitle}`;
      
      let groupId = this.domainGroupCache.get(cacheKey);
      
      // Check if group already exists
      if (!groupId) {
        const existingGroups = await chrome.tabGroups.query({ windowId: windowId });
        const matchingGroup = existingGroups.find(group => 
          group.title === groupTitle
        );
        
        if (matchingGroup) {
          groupId = matchingGroup.id;
          this.domainGroupCache.set(cacheKey, groupId);
        }
      }
      
      // Get tabs that aren't already grouped
      const ungroupedTabs = tabs.filter(tab => 
        tab.groupId === chrome.tabs.TAB_ID_NONE || tab.groupId === -1
      );
      
      if (ungroupedTabs.length === 0) return;
      
      if (!groupId) {
        // Create new group
        console.log(`Creating domain group for ${domain} with ${ungroupedTabs.length} tabs`);
        
        groupId = await new Promise((resolve, reject) => {
          chrome.tabs.group({ tabIds: ungroupedTabs.map(t => t.id) }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });

        await new Promise((resolve, reject) => {
          chrome.tabGroups.update(groupId, {
            title: groupTitle,
            color: this.getDomainGroupColor(domain)
          }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        this.domainGroupCache.set(cacheKey, groupId);
        console.log(`Created domain group "${groupTitle}" with ID:`, groupId);
      } else {
        // Add tabs to existing group
        console.log(`Adding ${ungroupedTabs.length} tabs to existing domain group "${groupTitle}"`);
        
        await new Promise((resolve, reject) => {
          chrome.tabs.group({
            groupId: groupId,
            tabIds: ungroupedTabs.map(t => t.id)
          }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error(`Error creating domain group for ${domain}:`, error);
    }
  }

  formatDomainTitle(domain) {
    // Capitalize first letter and remove common prefixes
    let title = domain.replace(/^www\./, '');
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  getDomainGroupColor(domain) {
    // Assign colors based on domain hash for consistency
    const colors = ['grey', 'green', 'yellow', 'cyan', 'purple', 'orange', 'pink'];
    const hash = domain.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  async processTab(tab) {
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
      return;
    }

    if (this.pendingTabs.has(tab.id)) {
      console.log('Tab already being processed:', tab.id);
      return;
    }

    // First check for predefined groups (Gmail, AI)
    const groupType = this.determineGroupType(tab.url);
    if (groupType) {
      console.log(`Processing tab ${tab.id} for ${groupType} group:`, tab.url);
      this.pendingTabs.set(tab.id, groupType);
      
      try {
        await this.addTabToGroup(tab, groupType);
      } catch (error) {
        console.error('Error processing tab:', error);
      } finally {
        this.pendingTabs.delete(tab.id);
      }
      return;
    }

    // If domain grouping is enabled and no predefined group matches
    if (this.settings.domainGrouping) {
      if (this.settings.excludePinnedTabs && tab.pinned) return;
      
      const domain = this.extractDomain(tab.url);
      if (domain) {
        // Check if there are enough tabs from this domain to create a group
        const tabs = await chrome.tabs.query({ windowId: tab.windowId });
        const domainTabs = tabs.filter(t => {
          if (!t.url || t.url.startsWith('chrome://')) return false;
          if (this.settings.excludePinnedTabs && t.pinned) return false;
          return this.extractDomain(t.url) === domain;
        });
        
        if (domainTabs.length >= this.settings.minTabsForDomainGroup) {
          await this.createDomainGroup(domain, domainTabs, tab.windowId);
        }
      }
    }
  }

  determineGroupType(url) {
    const normalizedUrl = url.toLowerCase();
    
    for (const [groupType, config] of Object.entries(this.groupConfigs)) {
      for (const pattern of config.patterns) {
        if (this.matchesPattern(normalizedUrl, pattern.toLowerCase())) {
          console.log(`URL ${url} matches ${groupType} pattern: ${pattern}`);
          return groupType;
        }
      }
    }
    
    // Additional manual checks for common cases
    if (normalizedUrl.includes('mail.google.com') || 
        normalizedUrl.includes('gmail.com')) {
      console.log(`URL ${url} matches gmail (manual check)`);
      return 'gmail';
    }
    
    if (normalizedUrl.includes('chatgpt.com') || 
        normalizedUrl.includes('chat.openai.com') ||
        normalizedUrl.includes('perplexity.ai') ||
        normalizedUrl.includes('gemini.google.com')) {
      console.log(`URL ${url} matches ai (manual check)`);
      return 'ai';
    }
    
    return null;
  }

  matchesPattern(url, pattern) {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\./g, '\\.')
      .replace(/\//g, '\\/');
    
    const regex = new RegExp(`^${regexPattern}`, 'i');
    return regex.test(url);
  }

  async addTabToGroup(tab, groupType) {
    const config = this.groupConfigs[groupType];
    const windowId = tab.windowId;
    const cacheKey = `${windowId}-${groupType}`;

    try {
      let currentTab;
      try {
        currentTab = await chrome.tabs.get(tab.id);
      } catch (error) {
        console.log('Tab no longer exists:', tab.id);
        return;
      }

      let groupId = this.groupCache.get(cacheKey);
      
      if (!groupId) {
        console.log(`Searching for existing ${groupType} group in window ${windowId}`);
        const existingGroups = await chrome.tabGroups.query({ windowId: windowId });
        const matchingGroup = existingGroups.find(group => 
          group.title === config.title || 
          group.title.toLowerCase() === config.title.toLowerCase()
        );
        
        if (matchingGroup) {
          groupId = matchingGroup.id;
          this.groupCache.set(cacheKey, groupId);
          console.log(`Found existing ${groupType} group:`, groupId);
        }
      }
      
      if (groupId) {
        try {
          await chrome.tabGroups.get(groupId);
        } catch {
          console.log('Cached group no longer exists:', groupId);
          this.groupCache.delete(cacheKey);
          groupId = null;
        }
      }

      if (currentTab.groupId === groupId && groupId !== chrome.tabs.TAB_ID_NONE) {
        console.log('Tab already in correct group');
        return;
      }

      if (!groupId) {
        console.log(`Creating new ${groupType} group for tab:`, currentTab.url);
        
        groupId = await new Promise((resolve, reject) => {
          chrome.tabs.group({ tabIds: [currentTab.id] }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result);
            }
          });
        });

        await new Promise((resolve, reject) => {
          chrome.tabGroups.update(groupId, {
            title: config.title,
            color: config.color
          }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        this.groupCache.set(cacheKey, groupId);
        console.log(`Created ${groupType} group with ID:`, groupId);
      } else {
        console.log(`Adding tab to existing ${groupType} group:`, groupId);
        
        await new Promise((resolve, reject) => {
          chrome.tabs.group({
            groupId: groupId,
            tabIds: [currentTab.id]
          }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }

      console.log(`Successfully processed tab ${currentTab.id} into ${groupType} group`);

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
            // Remove from both caches
            for (const [key, cachedGroupId] of this.groupCache.entries()) {
              if (cachedGroupId === group.id) {
                this.groupCache.delete(key);
                console.log('Removed empty group from cache:', group.id);
                break;
              }
            }
            for (const [key, cachedGroupId] of this.domainGroupCache.entries()) {
              if (cachedGroupId === group.id) {
                this.domainGroupCache.delete(key);
                console.log('Removed empty domain group from cache:', group.id);
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

  async groupAllTabsByDomain() {
    console.log('Grouping all tabs by domain...');
    const windows = await chrome.windows.getAll({ populate: true });
    
    for (const window of windows) {
      await this.groupTabsByDomain(window);
    }
  }

  async refreshGroupDetection() {
    console.log('Refreshing group detection...');
    this.groupCache.clear();
    this.domainGroupCache.clear();
    this.pendingTabs.clear();
    await this.discoverExistingGroups();
    await this.processExistingTabs();
    return this.groupCache.size + this.domainGroupCache.size;
  }

  async toggleEnabled() {
    this.enabled = !this.enabled;
    await chrome.storage.sync.set({ enabled: this.enabled });
    console.log('Extension enabled:', this.enabled);
    
    if (this.enabled) {
      await this.discoverExistingGroups();
      await this.processExistingTabs();
    }
    
    return this.enabled;
  }

  async toggleDomainGrouping() {
    this.settings.domainGrouping = !this.settings.domainGrouping;
    await chrome.storage.sync.set({ settings: this.settings });
    console.log('Domain grouping enabled:', this.settings.domainGrouping);
    
    if (this.settings.domainGrouping) {
      await this.groupAllTabsByDomain();
    }
    
    return this.settings.domainGrouping;
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await chrome.storage.sync.set({ settings: this.settings });
  }

  async updateGroupConfig(groupType, config) {
    this.groupConfigs[groupType] = { ...this.groupConfigs[groupType], ...config };
    await chrome.storage.sync.set({ groupConfigs: this.groupConfigs });
  }

  getStatus() {
    return {
      enabled: this.enabled,
      groupConfigs: this.groupConfigs,
      settings: this.settings,
      activeGroups: this.groupCache.size,
      activeDomainGroups: this.domainGroupCache.size
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

        case 'toggleDomainGrouping':
          const domainGrouping = await tabGroupManager.toggleDomainGrouping();
          sendResponse({ domainGrouping });
          break;

        case 'groupByDomain':
          await tabGroupManager.groupAllTabsByDomain();
          sendResponse({ success: true });
          break;

        case 'updateSettings':
          await tabGroupManager.updateSettings(request.settings);
          sendResponse({ success: true });
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
