class PopupManager {
  constructor() {
    this.initializePopup();
  }

  async initializePopup() {
    await this.loadStatus();
    this.setupEventListeners();
    this.setupAnimations();
    await this.updateTabCounts();
    await this.updateGroupCounters();
  }

  setupAnimations() {
    // Animate domain settings visibility
    const domainToggle = document.getElementById('domainGroupingToggle');
    const domainSettings = document.getElementById('domainSettings');
    const toggleDomainSettings = () => {
      if (domainToggle.checked) {
        domainSettings.style.opacity = "1";
        domainSettings.style.pointerEvents = "auto";
      } else {
        domainSettings.style.opacity = "0.5";
        domainSettings.style.pointerEvents = "none";
      }
    };
    toggleDomainSettings();
    domainToggle.addEventListener('change', toggleDomainSettings);
  }

  async loadStatus() {
    try {
      const response = await this.sendMessage({ action: 'getStatus' });
      this.updateUI(response);
    } catch (error) {
      console.error('Error loading status:', error);
    }
  }

  async updateTabCounts() {
    try {
      const [currentTab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!currentTab) return;
      const tabs = await chrome.tabs.query({ windowId: currentTab.windowId });

      // Get all tab groups in current window
      const groups = await chrome.tabGroups.query({ windowId: currentTab.windowId });
      const gmailGroup = groups.find(group =>
        group.title === 'Gmail' || group.title.toLowerCase() === 'gmail'
      );
      const aiGroup = groups.find(group =>
        group.title === 'AI' || group.title === 'AI Services' || group.title.toLowerCase() === 'ai'
      );

      let gmailCount = 0, aiCount = 0;
      if (gmailGroup)
        gmailCount = tabs.filter(tab => tab.groupId === gmailGroup.id).length;
      if (aiGroup)
        aiCount = tabs.filter(tab => tab.groupId === aiGroup.id).length;

      this.animateNumber(document.getElementById('gmailTabCount'), gmailCount);
      this.animateNumber(document.getElementById('aiTabCount'), aiCount);
    } catch (error) {
      document.getElementById('gmailTabCount').textContent = '0';
      document.getElementById('aiTabCount').textContent = '0';
    }
  }

  async updateGroupCounters() {
    try {
      const [currentTab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!currentTab) return;
      const groups = await chrome.tabGroups.query({ windowId: currentTab.windowId });
      let smartGroups = 0, domainGroups = 0;
      for (const group of groups) {
        if (
          group.title === "Gmail" ||
          group.title === "AI Services" ||
          group.title === "AI" ||
          group.title.toLowerCase() === "gmail" ||
          group.title.toLowerCase() === "ai"
        ) {
          smartGroups++;
        } else {
          domainGroups++;
        }
      }
      this.animateNumber(document.getElementById('activeGroupsCount'), smartGroups);
      this.animateNumber(document.getElementById('activeDomainGroupsCount'), domainGroups);
    } catch (error) {
      document.getElementById('activeGroupsCount').textContent = '0';
      document.getElementById('activeDomainGroupsCount').textContent = '0';
    }
  }

  updateUI(status) {
    const enableToggle = document.getElementById('enableToggle');
    const statusText = document.getElementById('statusText');
    enableToggle.checked = status.enabled;
    statusText.textContent = status.enabled ? 'Enabled' : 'Disabled';

    const domainGroupingToggle = document.getElementById('domainGroupingToggle');
    const minTabsSelect = document.getElementById('minTabsSelect');
    const excludePinnedToggle = document.getElementById('excludePinnedToggle');
    const mergeSubdomainsToggle = document.getElementById('mergeSubdomainsToggle');

    if (status.settings) {
      domainGroupingToggle.checked = status.settings.domainGrouping;
      minTabsSelect.value = status.settings.minTabsForDomainGroup;
      excludePinnedToggle.checked = status.settings.excludePinnedTabs;
      mergeSubdomainsToggle.checked = status.settings.mergeSubdomains;
      // Update domain settings visibility
      const domainSettings = document.getElementById('domainSettings');
      if (status.settings.domainGrouping) {
        domainSettings.style.opacity = "1";
        domainSettings.style.pointerEvents = "auto";
      } else {
        domainSettings.style.opacity = "0.5";
        domainSettings.style.pointerEvents = "none";
      }
    }
  }

  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const duration = 400;
    const steps = 16;
    const stepValue = (targetValue - currentValue) / steps;
    let currentStep = 0;

    if (currentValue === targetValue) {
      element.textContent = targetValue;
      return;
    }

    const timer = setInterval(() => {
      currentStep++;
      const newValue = Math.round(currentValue + (stepValue * currentStep));
      element.textContent = newValue;
      if (currentStep >= steps) {
        element.textContent = targetValue;
        clearInterval(timer);
      }
    }, duration / steps);
  }

  setupEventListeners() {
    const enableToggle = document.getElementById('enableToggle');
    const domainGroupingToggle = document.getElementById('domainGroupingToggle');
    const minTabsSelect = document.getElementById('minTabsSelect');
    const excludePinnedToggle = document.getElementById('excludePinnedToggle');
    const mergeSubdomainsToggle = document.getElementById('mergeSubdomainsToggle');
    const groupByDomain = document.getElementById('groupByDomain');
    const processAllTabs = document.getElementById('processAllTabs');
    const refreshGroups = document.getElementById('refreshGroups');

    enableToggle.addEventListener('change', async () => {
      try {
        await this.sendMessage({ action: 'toggleEnabled' });
        await this.loadStatus();
        await this.updateTabCounts();
        await this.updateGroupCounters();
      } catch (error) {}
    });

    domainGroupingToggle.addEventListener('change', async () => {
      try {
        await this.sendMessage({ action: 'toggleDomainGrouping' });
        await this.loadStatus();
        await this.updateTabCounts();
        await this.updateGroupCounters();
      } catch (error) {}
    });

    const updateSettings = async () => {
      try {
        const settings = {
          minTabsForDomainGroup: parseInt(minTabsSelect.value),
          excludePinnedTabs: excludePinnedToggle.checked,
          mergeSubdomains: mergeSubdomainsToggle.checked
        };
        await this.sendMessage({ action: 'updateSettings', settings });
        await this.updateTabCounts();
        await this.updateGroupCounters();
      } catch (error) {}
    };

    minTabsSelect.addEventListener('change', updateSettings);
    excludePinnedToggle.addEventListener('change', updateSettings);
    mergeSubdomainsToggle.addEventListener('change', updateSettings);

    groupByDomain.addEventListener('click', async () => {
      await this.handleButtonClick(groupByDomain, async () => {
        await this.sendMessage({ action: 'groupByDomain' });
        await this.updateTabCounts();
        await this.updateGroupCounters();
      });
    });

    processAllTabs.addEventListener('click', async () => {
      await this.handleButtonClick(processAllTabs, async () => {
        await this.sendMessage({ action: 'processAllTabs' });
        await this.updateTabCounts();
        await this.updateGroupCounters();
      });
    });

    refreshGroups.addEventListener('click', async () => {
      await this.handleButtonClick(refreshGroups, async () => {
        await this.sendMessage({ action: 'refreshGroups' });
        await this.updateTabCounts();
        await this.updateGroupCounters();
      });
    });

    // Listen for tab changes to update counts in real-time
    chrome.tabs.onCreated.addListener(() => {
      setTimeout(() => {
        this.updateTabCounts();
        this.updateGroupCounters();
      }, 400);
    });
    chrome.tabs.onRemoved.addListener(() => {
      setTimeout(() => {
        this.updateTabCounts();
        this.updateGroupCounters();
      }, 400);
    });
    chrome.tabs.onUpdated.addListener(() => {
      setTimeout(() => {
        this.updateTabCounts();
        this.updateGroupCounters();
      }, 400);
    });
  }

  async handleButtonClick(button, action) {
    try {
      button.classList.add('loading');
      button.disabled = true;
      await action();
    } catch (error) {
      // Optionally show error
    } finally {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
