// popup.js
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

    enableToggle.checked = status.enabled;
    statusText.textContent = status.enabled ? 'Enabled' : 'Disabled';
    activeGroupsCount.textContent = status.activeGroups || 0;
  }

  setupEventListeners() {
    const enableToggle = document.getElementById('enableToggle');
    const processAllTabs = document.getElementById('processAllTabs');
    const refreshStatus = document.getElementById('refreshStatus');

    enableToggle.addEventListener('change', async () => {
      try {
        const response = await this.sendMessage({ action: 'toggleEnabled' });
        const statusText = document.getElementById('statusText');
        statusText.textContent = response.enabled ? 'Enabled' : 'Disabled';
      } catch (error) {
        console.error('Error toggling enabled state:', error);
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
