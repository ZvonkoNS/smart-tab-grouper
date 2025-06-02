class PopupManager {
  constructor() {
    this.initializePopup();
  }

  async initializePopup() {
    await this.loadStatus();
    this.setupEventListeners();
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
    const activeGroupsCount = document.getElementById('activeGroupsCount');
    const activeDomainGroupsCount = document.getElementById('activeDomainGroupsCount');
    
    const domainGroupingToggle = document.getElementById('domainGroupingToggle');
    const minTabsSelect = document.getElementById('minTabsSelect');
    const excludePinnedToggle = document.getElementById('excludePinnedToggle');
    const mergeSubdomainsToggle = document.getElementById('mergeSubdomainsToggle');

    enableToggle.checked = status.enabled;
    statusText.textContent = status.enabled ? 'Enabled' : 'Disabled';
    activeGroupsCount.textContent = status.activeGroups || 0;
    activeDomainGroupsCount.textContent = status.activeDomainGroups || 0;
    
    if (status.settings) {
      domainGroupingToggle.checked = status.settings.domainGrouping;
      minTabsSelect.value = status.settings.minTabsForDomainGroup;
      excludePinnedToggle.checked = status.settings.excludePinnedTabs;
      mergeSubdomainsToggle.checked = status.settings.mergeSubdomains;
    }
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
    const refreshStatus = document.getElementById('refreshStatus');

    enableToggle.addEventListener('change', async () => {
      try {
        const response = await this.sendMessage({ action: 'toggleEnabled' });
        const statusText = document.getElementById('statusText');
        statusText.textContent = response.enabled ? 'Enabled' : 'Disabled';
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

    groupByDomain.addEventListener('click', async () => {
      try {
        groupByDomain.textContent = 'Grouping...';
        groupByDomain.disabled = true;
        
        await this.sendMessage({ action: 'groupByDomain' });
        await this.loadStatus();
        
        groupByDomain.textContent = 'Group All Tabs by Domain';
        groupByDomain.disabled = false;
      } catch (error) {
        console.error('Error grouping by domain:', error);
        groupByDomain.textContent = 'Group All Tabs by Domain';
        groupByDomain.disabled = false;
      }
    });

    processAllTabs.addEventListener('click', async () => {
      try {
        processAllTabs.textContent = 'Processing...';
        processAllTabs.disabled = true;
        
        await this.sendMessage({ action: 'processAllTabs' });
        await this.loadStatus();
        
        processAllTabs.textContent = 'Process All Open Tabs';
        processAllTabs.disabled = false;
      } catch (error) {
        console.error('Error processing all tabs:', error);
        processAllTabs.textContent = 'Process All Open Tabs';
        processAllTabs.disabled = false;
      }
    });

    refreshGroups.addEventListener('click', async () => {
      try {
        refreshGroups.textContent = 'Refreshing...';
        refreshGroups.disabled = true;
        
        await this.sendMessage({ action: 'refreshGroups' });
        await this.loadStatus();
        
        refreshGroups.textContent = 'Refresh Group Detection';
        refreshGroups.disabled = false;
      } catch (error) {
        console.error('Error refreshing groups:', error);
        refreshGroups.textContent = 'Refresh Group Detection';
        refreshGroups.disabled = false;
      }
    });

    refreshStatus.addEventListener('click', () => {
      this.loadStatus();
    });
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
