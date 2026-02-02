// Background service worker for Smart Productivity Assistant

let activeTab = null;
let startTime = null;
let checkInterval = null;

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['timeData', 'limits', 'blockedSites', 'settings', 'extensionEnabled'], (result) => {
    if (!result.timeData) {
      chrome.storage.local.set({ timeData: {} });
    }
    if (!result.limits) {
      chrome.storage.local.set({ limits: {} });
    }
    if (!result.blockedSites) {
      chrome.storage.local.set({ blockedSites: [] });
    }
    if (!result.settings) {
      chrome.storage.local.set({ 
        settings: { 
          notifications: true,
          warningThreshold: 0.9,
          trackingEnabled: true
        } 
      });
    }
    if (result.extensionEnabled === undefined) {
      chrome.storage.local.set({ extensionEnabled: true });
    }
  });
  
  // Set up daily reset alarm
  chrome.alarms.create('dailyReset', {
    when: getNextMidnight(),
    periodInMinutes: 1440 // 24 hours
  });
  
  // Set up periodic save alarm (every minute)
  chrome.alarms.create('periodicSave', {
    periodInMinutes: 1
  });
  
  // Set up periodic block check (every 5 seconds)
  chrome.alarms.create('blockCheck', {
    periodInMinutes: 0.0833 // 5 seconds
  });
});

// Get next midnight timestamp
function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReset') {
    resetDailyData();
  } else if (alarm.name === 'periodicSave') {
    saveCurrentSession();
  } else if (alarm.name === 'blockCheck') {
    checkAllBlockedSites();
  }
});

// Reset daily data at midnight
function resetDailyData() {
  chrome.storage.local.set({ timeData: {} }, () => {
    console.log('Daily data reset');
  });
}

// Track active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    saveCurrentSession();
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.log('Error getting tab:', chrome.runtime.lastError.message);
        return;
      }
      
      if (!tab || !tab.url) return;
      
      startTracking(tab);
      
      // Check if current tab should be blocked
      const domain = getDomain(tab.url);
      if (domain) {
        checkIfBlocked(tab.id, domain);
      }
    });
  });
});

// Track tab updates (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    // Only process if we have a valid tab
    if (!tab) return;
    
    if (changeInfo.status === 'complete' && tab.active) {
      saveCurrentSession();
      startTracking(tab);
    }
    
    // Check if URL should be blocked (even during loading)
    if (changeInfo.url || changeInfo.status === 'loading' || changeInfo.status === 'complete') {
      if (!tab.url) return; // Skip if no URL
      
      const domain = getDomain(tab.url);
      if (domain) {
        checkIfBlocked(tabId, domain);
      }
    }
  });
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      saveCurrentSession();
      activeTab = null;
      startTime = null;
    } else {
      chrome.tabs.query({ active: true, windowId }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || !tabs.length) return;
        
        const tab = tabs[0];
        if (tab && tab.url) {
          startTracking(tab);
          const domain = getDomain(tab.url);
          if (domain) {
            checkIfBlocked(tab.id, domain);
          }
        }
      });
    }
  });
});

// Start tracking a tab
function startTracking(tab) {
  if (!tab || !tab.url) return;
  
  activeTab = tab;
  startTime = Date.now();
  
  const domain = getDomain(tab.url);
  if (domain) {
    checkLimits(domain);
  }
}

// Save current tracking session
function saveCurrentSession() {
  if (!activeTab || !startTime) return;
  
  // Additional safety check for activeTab.url before accessing it
  if (!activeTab.url) return;
  
  // Store reference to prevent race conditions with async callbacks
  const currentTabUrl = activeTab.url;
  const sessionStartTime = startTime;
  
  chrome.storage.local.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    // Use stored reference instead of activeTab which may have changed
    const domain = getDomain(currentTabUrl);
    if (!domain) return;
    
    const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000); // in seconds
    
    chrome.storage.local.get(['timeData', 'settings'], (result) => {
      const settings = result.settings || { trackingEnabled: true };
      if (!settings.trackingEnabled) return;
      
      const timeData = result.timeData || {};
      const today = new Date().toDateString();
      
      if (!timeData[today]) {
        timeData[today] = {};
      }
      
      if (!timeData[today][domain]) {
        timeData[today][domain] = 0;
      }
      
      timeData[today][domain] += timeSpent;
      
      chrome.storage.local.set({ timeData }, () => {
        checkLimits(domain);
      });
    });
    
    startTime = Date.now();
  });
}

// Extract domain from URL
function getDomain(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'chrome:' || 
        urlObj.protocol === 'chrome-extension:' || 
        urlObj.protocol === 'about:' ||
        urlObj.protocol === 'edge:' ||
        urlObj.protocol === 'brave:') {
      return null;
    }
    return urlObj.hostname || null;
  } catch (e) {
    console.log('Error parsing URL:', url, e.message);
    return null;
  }
}

// Check if domain has exceeded limits
function checkLimits(domain) {
  chrome.storage.local.get(['timeData', 'limits', 'blockedSites', 'settings'], (result) => {
    const timeData = result.timeData || {};
    const limits = result.limits || {};
    const blockedSites = result.blockedSites || [];
    const settings = result.settings || { notifications: true, warningThreshold: 0.9 };
    const today = new Date().toDateString();
    
    // Check if site is permanently blocked
    if (blockedSites.includes(domain)) {
      blockSite(domain, 'permanently_blocked');
      return;
    }
    
    // Check time limits
    if (limits[domain] && timeData[today] && timeData[today][domain]) {
      const timeSpent = timeData[today][domain];
      const limit = limits[domain] * 60; // Convert minutes to seconds
      const percentage = timeSpent / limit;
      
      if (timeSpent >= limit) {
        // Time limit exceeded - block the site
        const timeInfo = {
          spent: timeSpent,
          limit: limit,
          limitMinutes: limits[domain]
        };
        blockSite(domain, 'time_limit_exceeded', timeInfo);
        
        if (settings.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Time Limit Reached',
            message: `You've reached your ${limits[domain]}-minute daily limit for ${domain}`,
            priority: 2
          });
        }
      } else if (percentage >= settings.warningThreshold && settings.notifications) {
        const remaining = Math.floor((limit - timeSpent) / 60);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Time Limit Warning',
          message: `${remaining} minutes remaining for ${domain}`,
          priority: 1
        });
      }
    }
  });
}

// Block a site
function blockSite(domain, reason = 'permanently_blocked', timeInfo = null) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && getDomain(tab.url) === domain) {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'block', 
          domain: domain,
          reason: reason,
          timeInfo: timeInfo
        });
      }
    });
  });
}

// Check if a specific site should be blocked
function checkIfBlocked(tabId, domain) {
  if (!domain) return;
  
  chrome.storage.local.get(['blockedSites', 'limits', 'timeData', 'extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    const blockedSites = result.blockedSites || [];
    const limits = result.limits || {};
    const timeData = result.timeData || {};
    const today = new Date().toDateString();
    
    let shouldBlock = false;
    let reason = 'permanently_blocked';
    let timeInfo = null;
    
    // Check if permanently blocked
    if (blockedSites.includes(domain)) {
      shouldBlock = true;
      reason = 'permanently_blocked';
    }
    // Check if time limit exceeded
    else if (limits[domain] && timeData[today] && timeData[today][domain]) {
      const timeSpent = timeData[today][domain];
      const limit = limits[domain] * 60;
      
      if (timeSpent >= limit) {
        shouldBlock = true;
        reason = 'time_limit_exceeded';
        timeInfo = {
          spent: timeSpent,
          limit: limit,
          limitMinutes: limits[domain]
        };
      }
    }
    
    if (shouldBlock) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'block', 
        domain: domain,
        reason: reason,
        timeInfo: timeInfo
      }, (response) => {
        if (chrome.runtime.lastError) {
          // If content script not ready, inject it
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).then(() => {
            // Try sending message again
            chrome.tabs.sendMessage(tabId, { 
              action: 'block', 
              domain: domain,
              reason: reason,
              timeInfo: timeInfo
            });
          }).catch(err => {
            // Silently ignore errors for chrome:// pages and other protected pages
            console.log('Could not inject content script:', err.message);
          });
        }
      });
    }
  });
}

// Check all tabs for blocked sites
function checkAllBlockedSites() {
  chrome.storage.local.get(['blockedSites', 'limits', 'timeData', 'extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    const blockedSites = result.blockedSites || [];
    const limits = result.limits || {};
    const timeData = result.timeData || {};
    const today = new Date().toDateString();
    
    if (blockedSites.length === 0 && Object.keys(limits).length === 0) return;
    
    chrome.tabs.query({}, (tabs) => {
      if (!tabs) return;
      
      tabs.forEach((tab) => {
        // Skip tabs without URL or with protected URLs
        if (!tab || !tab.url) return;
        
        const domain = getDomain(tab.url);
        if (!domain) return;
        
        let shouldBlock = false;
        let reason = 'permanently_blocked';
        let timeInfo = null;
        
        // Check if permanently blocked
        if (blockedSites.includes(domain)) {
          shouldBlock = true;
          reason = 'permanently_blocked';
        }
        // Check if time limit exceeded
        else if (limits[domain] && timeData[today] && timeData[today][domain]) {
          const timeSpent = timeData[today][domain];
          const limit = limits[domain] * 60;
          
          if (timeSpent >= limit) {
            shouldBlock = true;
            reason = 'time_limit_exceeded';
            timeInfo = {
              spent: timeSpent,
              limit: limit,
              limitMinutes: limits[domain]
            };
          }
        }
        
        if (shouldBlock) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'block', 
            domain: domain,
            reason: reason,
            timeInfo: timeInfo
          }, (response) => {
            // Ignore errors from tabs where content script isn't loaded
            if (chrome.runtime.lastError) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              }).then(() => {
                chrome.tabs.sendMessage(tab.id, { 
                  action: 'block', 
                  domain: domain,
                  reason: reason,
                  timeInfo: timeInfo
                });
              }).catch(() => {
                // Silently ignore - likely a protected page
              });
            }
          });
        }
      });
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveSession') {
    saveCurrentSession();
    sendResponse({ success: true });
  } else if (request.action === 'getTodayData') {
    const today = new Date().toDateString();
    chrome.storage.local.get(['timeData'], (result) => {
      const timeData = result.timeData || {};
      sendResponse({ data: timeData[today] || {} });
    });
    return true;
  } else if (request.action === 'toggleExtension') {
    const enabled = request.enabled;
    
    if (!enabled) {
      // Extension turned off - stop tracking and unblock all
      activeTab = null;
      startTime = null;
    } else {
      // Extension turned on - start checking blocks immediately
      checkAllBlockedSites();
    }
    
    sendResponse({ success: true });
  } else if (request.action === 'siteBlocked') {
    // When a site is newly blocked, check all tabs immediately
    checkAllBlockedSites();
    sendResponse({ success: true });
  } else if (request.action === 'siteUnblocked') {
    // When a site is unblocked, refresh affected tabs
    const domain = request.domain;
    if (!domain) {
      sendResponse({ success: false });
      return;
    }
    
    chrome.tabs.query({}, (tabs) => {
      if (!tabs) {
        sendResponse({ success: false });
        return;
      }
      
      tabs.forEach((tab) => {
        if (tab && tab.url && getDomain(tab.url) === domain) {
          chrome.tabs.reload(tab.id).catch(err => {
            console.log('Could not reload tab:', err.message);
          });
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

console.log('Smart Productivity Assistant loaded');
