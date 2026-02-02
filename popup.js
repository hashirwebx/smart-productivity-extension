// Popup script for Smart Productivity Assistant

document.addEventListener('DOMContentLoaded', init);

// Initialize popup
function init() {
  loadExtensionState();
  loadDashboard();
  loadLimits();
  loadBlockedSites();
  loadSettings();
  setupEventListeners();
}

// Load extension state
function loadExtensionState() {
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    const enabled = result.extensionEnabled !== false; // Default to true
    updateExtensionState(enabled, false);
  });
}

// Update extension state
function updateExtensionState(enabled, save = true) {
  const toggle = document.getElementById('extensionToggle');
  const status = document.getElementById('toggleStatus');
  const container = document.querySelector('.container');
  
  toggle.checked = enabled;
  status.textContent = enabled ? 'ON' : 'OFF';
  status.classList.toggle('off', !enabled);
  
  // Disable/enable content
  const tabs = document.querySelectorAll('.tab-content');
  const navTabs = document.querySelector('.tabs');
  
  if (!enabled) {
    tabs.forEach(tab => tab.classList.add('extension-disabled'));
    navTabs.classList.add('extension-disabled');
  } else {
    tabs.forEach(tab => tab.classList.remove('extension-disabled'));
    navTabs.classList.remove('extension-disabled');
  }
  
  if (save) {
    // Save state and notify background script
    chrome.storage.local.set({ extensionEnabled: enabled }, () => {
      chrome.runtime.sendMessage({ 
        action: 'toggleExtension', 
        enabled: enabled 
      });
      
      // Show notification
      const message = enabled ? 
        'Extension enabled - Tracking and blocking active' : 
        'Extension disabled - All tracking and blocking paused';
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Smart Productivity Assistant',
        message: message
      });
    });
  }
}

// Setup event listeners
function setupEventListeners() {
  // Extension ON/OFF toggle
  document.getElementById('extensionToggle').addEventListener('change', (e) => {
    updateExtensionState(e.target.checked, true);
  });
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'saveSession' }, () => {
      loadDashboard();
    });
  });
  
  // Limit form
  document.getElementById('limitForm').addEventListener('submit', handleAddLimit);
  
  // Block form
  document.getElementById('blockForm').addEventListener('submit', handleBlockSite);
  
  // Settings
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  document.getElementById('notificationsToggle').addEventListener('change', updateSettings);
  document.getElementById('trackingToggle').addEventListener('change', updateSettings);
  document.getElementById('warningThreshold').addEventListener('input', updateThreshold);
  document.getElementById('resetData').addEventListener('click', resetAllData);
}

// Switch tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabName);
  });
}

// Load dashboard data
function loadDashboard() {
  chrome.storage.local.get(['timeData'], (result) => {
    const timeData = result.timeData || {};
    const today = new Date().toDateString();
    const todayData = timeData[today] || {};
    
    // Calculate total time
    let totalSeconds = 0;
    Object.values(todayData).forEach(seconds => {
      totalSeconds += seconds;
    });
    
    // Update total time display
    document.getElementById('totalTime').textContent = formatTime(totalSeconds);
    
    // Sort sites by time
    const sortedSites = Object.entries(todayData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Display top sites
    const topSitesContainer = document.getElementById('topSites');
    if (sortedSites.length === 0) {
      topSitesContainer.innerHTML = '<div class="empty-state">No activity tracked yet today</div>';
    } else {
      topSitesContainer.innerHTML = sortedSites.map(([domain, seconds]) => {
        const percentage = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
        return `
          <div class="site-item">
            <div class="site-info">
              <div class="site-domain">${domain}</div>
              <div class="site-time">${formatTime(seconds)} (${percentage.toFixed(1)}%)</div>
            </div>
          </div>
        `;
      }).join('');
    }
  });
}

// Load limits
function loadLimits() {
  chrome.storage.local.get(['limits', 'timeData'], (result) => {
    const limits = result.limits || {};
    const timeData = result.timeData || {};
    const today = new Date().toDateString();
    const todayData = timeData[today] || {};
    
    const limitsContainer = document.getElementById('limitsList');
    const limitEntries = Object.entries(limits);
    
    if (limitEntries.length === 0) {
      limitsContainer.innerHTML = '<div class="empty-state">No limits set</div>';
    } else {
      limitsContainer.innerHTML = limitEntries.map(([domain, minutes]) => {
        const seconds = todayData[domain] || 0;
        const limitSeconds = minutes * 60;
        const percentage = Math.min((seconds / limitSeconds) * 100, 100);
        const remaining = Math.max(0, limitSeconds - seconds);
        const remainingMins = Math.floor(remaining / 60);
        const remainingSecs = remaining % 60;
        
        let progressClass = '';
        let statusBadge = '';
        
        if (percentage >= 100) {
          progressClass = 'danger';
          statusBadge = '<span class="status-badge status-exceeded">⏱️ LIMIT REACHED</span>';
        } else if (percentage >= 90) {
          progressClass = 'warning';
          statusBadge = `<span class="status-badge status-warning">⚠️ ${remainingMins}m ${remainingSecs}s left</span>`;
        } else {
          statusBadge = `<span class="status-badge status-ok">✓ ${remainingMins}m ${remainingSecs}s remaining</span>`;
        }
        
        return `
          <div class="limit-item ${percentage >= 100 ? 'limit-exceeded' : ''}">
            <div class="limit-info">
              <div class="limit-header">
                <div class="limit-domain">${domain}</div>
                ${statusBadge}
              </div>
              <div class="limit-details">
                ${formatTime(seconds)} / ${formatTime(limitSeconds)} (${minutes} min limit)
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${progressClass}" style="width: ${percentage}%"></div>
              </div>
            </div>
            <button class="delete-btn" data-domain="${domain}" data-type="limit">Remove</button>
          </div>
        `;
      }).join('');
      
      // Add delete listeners
      document.querySelectorAll('[data-type="limit"]').forEach(btn => {
        btn.addEventListener('click', () => removeLimit(btn.dataset.domain));
      });
    }
  });
}

// Load blocked sites
function loadBlockedSites() {
  chrome.storage.local.get(['blockedSites'], (result) => {
    const blockedSites = result.blockedSites || [];
    const blockedContainer = document.getElementById('blockedList');
    
    if (blockedSites.length === 0) {
      blockedContainer.innerHTML = '<div class="empty-state">No sites blocked</div>';
    } else {
      blockedContainer.innerHTML = blockedSites.map(domain => `
        <div class="blocked-item">
          <div class="blocked-info">
            <div class="blocked-domain">${domain}</div>
          </div>
          <button class="delete-btn" data-domain="${domain}" data-type="blocked">Unblock</button>
        </div>
      `).join('');
      
      // Add delete listeners
      document.querySelectorAll('[data-type="blocked"]').forEach(btn => {
        btn.addEventListener('click', () => unblockSite(btn.dataset.domain));
      });
    }
  });
}

// Handle add limit
function handleAddLimit(e) {
  e.preventDefault();
  
  const domain = document.getElementById('limitDomain').value.trim().toLowerCase();
  const minutes = parseInt(document.getElementById('limitMinutes').value);
  
  if (!domain || !minutes || minutes < 1) {
    alert('Please enter a valid domain and time limit');
    return;
  }
  
  chrome.storage.local.get(['limits'], (result) => {
    const limits = result.limits || {};
    limits[domain] = minutes;
    
    chrome.storage.local.set({ limits }, () => {
      document.getElementById('limitForm').reset();
      loadLimits();
    });
  });
}

// Remove limit
function removeLimit(domain) {
  chrome.storage.local.get(['limits'], (result) => {
    const limits = result.limits || {};
    delete limits[domain];
    
    chrome.storage.local.set({ limits }, () => {
      loadLimits();
    });
  });
}

// Handle block site
function handleBlockSite(e) {
  e.preventDefault();
  
  const domain = document.getElementById('blockDomain').value.trim().toLowerCase();
  
  if (!domain) {
    alert('Please enter a valid domain');
    return;
  }
  
  // Remove http://, https://, and www. if present
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\/$/, '')
    .split('/')[0];
  
  chrome.storage.local.get(['blockedSites'], (result) => {
    const blockedSites = result.blockedSites || [];
    
    if (blockedSites.includes(cleanDomain)) {
      alert('This site is already blocked');
      return;
    }
    
    blockedSites.push(cleanDomain);
    
    chrome.storage.local.set({ blockedSites }, () => {
      document.getElementById('blockForm').reset();
      loadBlockedSites();
      
      // Notify background script to check and block immediately
      chrome.runtime.sendMessage({ action: 'siteBlocked' });
      
      // Show success message
      alert(`${cleanDomain} has been blocked!`);
    });
  });
}

// Unblock site
function unblockSite(domain) {
  if (!confirm(`Are you sure you want to unblock ${domain}?`)) {
    return;
  }
  
  chrome.storage.local.get(['blockedSites'], (result) => {
    const blockedSites = result.blockedSites || [];
    const index = blockedSites.indexOf(domain);
    
    if (index > -1) {
      blockedSites.splice(index, 1);
      
      chrome.storage.local.set({ blockedSites }, () => {
        loadBlockedSites();
        
        // Notify background to reload affected tabs
        chrome.runtime.sendMessage({ 
          action: 'siteUnblocked',
          domain: domain
        });
        
        alert(`${domain} has been unblocked!`);
      });
    }
  });
}

// Load settings
function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {
      notifications: true,
      warningThreshold: 0.9,
      trackingEnabled: true
    };
    
    document.getElementById('notificationsToggle').checked = settings.notifications;
    document.getElementById('trackingToggle').checked = settings.trackingEnabled;
    document.getElementById('warningThreshold').value = settings.warningThreshold * 100;
    document.getElementById('thresholdValue').textContent = `${Math.round(settings.warningThreshold * 100)}%`;
  });
}

// Update settings
function updateSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    
    settings.notifications = document.getElementById('notificationsToggle').checked;
    settings.trackingEnabled = document.getElementById('trackingToggle').checked;
    
    chrome.storage.local.set({ settings });
  });
}

// Update threshold
function updateThreshold(e) {
  const value = e.target.value;
  document.getElementById('thresholdValue').textContent = `${value}%`;
  
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};
    settings.warningThreshold = value / 100;
    chrome.storage.local.set({ settings });
  });
}

// Open settings modal
function openSettings() {
  document.getElementById('settingsModal').classList.add('active');
}

// Close settings modal
function closeSettings() {
  document.getElementById('settingsModal').classList.remove('active');
}

// Reset all data
function resetAllData() {
  if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
    chrome.storage.local.set({
      timeData: {},
      limits: {},
      blockedSites: []
    }, () => {
      loadDashboard();
      loadLimits();
      loadBlockedSites();
      closeSettings();
      alert('All data has been reset');
    });
  }
}

// Format time in seconds to readable format
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Close modal when clicking outside
document.getElementById('settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') {
    closeSettings();
  }
});
