class PopupManager {
  constructor() {
    this.initializePopup();
  }

  async initializePopup() {
    await this.loadStatus();
    this.setupEventListeners();
    this.setupAnimations();
  }

  setupAnimations() {
    // Animate domain settings visibility
    const domainToggle = document.getElementById('domainGroupingToggle');
    const domainSettings = document.getElementById('domainSettings');
    
    const toggleDomainSettings = () => {
      if (domainToggle.checked) {
        domainSettings.classList.add('active');
      } else {
        domainSettings.classList.remove('active');
      }
    };
    
    // Initial state
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

  updateUI(status) {
    const enableToggle = document.getElementById('enableToggle');
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    const activeGroupsCount = document.getElementById('activeGroupsCount');
    const activeDomainGroupsCount = document.getElementById('activeDomainGroupsCount');
    
    const domainGroupingToggle = document.getElementById('domainGroupingToggle');
    const minTabsSelect = document.getElementById('minTabsSelect');
    const excludePinnedToggle = document.getElementById('excludePinnedToggle');
    const mergeSubdomainsToggle = document.getElementById('mergeSubdomainsToggle');

    // Update main toggle
    enableToggle.checked = status.enabled;
    statusText.textContent = status.enabled ? 'Enabled' : 'Disabled';
    
    // Update status indicator
    if (status.enabled) {
      statusDot.style.background = 'var(--success-color)';
    } else {
      statusDot.style.background = 'var(--text-tertiary)';
    }
    
    // Update counts with animation
    this.animateNumber(activeGroupsCount, status.activeGroups || 0);
    this.animateNumber(activeDomainGroupsCount, status.activeDomainGroups || 0);
    
    // Update settings
    if (status.settings) {
      domainGroupingToggle.checked = status.settings.domainGrouping;
      minTabsSelect.value = status.settings.minTabsForDomainGroup;
      excludePinnedToggle.checked = status.settings.excludePinnedTabs;
      mergeSubdomainsToggle.checked = status.settings.mergeSubdomains;
      
      // Update domain settings visibility
      const domainSettings = document.getElementById('domainSettings');
      if (status.settings.domainGrouping) {
        domainSettings.classList.add('active');
      } else {
        domainSettings.classList.remove('active');
      }
    }
  }

  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const duration = 500;
    const steps = 30;
    const stepValue = (targetValue - currentValue) / steps;
    let currentStep = 0;

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
        const response = await this.sendMessage({ action: 'toggleEnabled' });
        await this.loadStatus();
      } catch (error) {
        console.error('Error toggling enabled state:', error);
      }
    });

    domainGroupingToggle.addEventListener('change', async () => {
      try {
        await this.sendMessage({ action: 'toggleDomainGrouping' });
        await this.loadStatus();
      } catch (error) {
        console.error('Error toggling domain grouping:', error);
      }
    });

    const updateSettings = async () => {
      try {
        const settings = {
          minTabsForDomainGroup: parseInt(minTabsSelect.value),
          excludePinnedTabs: excludePinnedToggle.checked,
          mergeSubdomains: mergeSubdomainsToggle.checked
        };
        await this.sendMessage({ action: 'updateSettings', settings });
      } catch (error) {
        console.error('Error updating settings:', error);
      }
    };

    minTabsSelect.addEventListener('change', updateSettings);
    excludePinnedToggle.addEventListener('change', updateSettings);
    mergeSubdomainsToggle.addEventListener('change', updateSettings);

    // Button click handlers with loading states
    groupByDomain.addEventListener('click', async () => {
      await this.handleButtonClick(groupByDomain, async () => {
        await this.sendMessage({ action: 'groupByDomain' });
        await this.loadStatus();
      });
    });

    processAllTabs.addEventListener('click', async () => {
      await this.handleButtonClick(processAllTabs, async () => {
        await this.sendMessage({ action: 'processAllTabs' });
        await this.loadStatus();
      });
    });

    refreshGroups.addEventListener('click', async () => {
      await this.handleButtonClick(refreshGroups, async () => {
        await this.sendMessage({ action: 'refreshGroups' });
        await this.loadStatus();
      });
    });
  }

  async handleButtonClick(button, action) {
    try {
      button.classList.add('loading');
      button.disabled = true;
      
      await action();
    } catch (error) {
      console.error('Button action error:', error);
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
        } else if (response.error) {
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
