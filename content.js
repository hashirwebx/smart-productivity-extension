// Content script for Smart Productivity Assistant

// Listen for block messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'block') {
    blockPage(request.domain, request.reason || 'permanently_blocked', request.timeInfo);
    sendResponse({ blocked: true });
  } else if (request.action === 'checkLimit') {
    // Check if this page should be blocked due to time limit
    checkAndBlockIfNeeded();
    sendResponse({ checked: true });
  }
  return true;
});

// Check if page should be blocked on load
(function() {
  const domain = window.location.hostname;
  chrome.storage.local.get(['blockedSites', 'limits', 'timeData', 'extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    const blockedSites = result.blockedSites || [];
    const limits = result.limits || {};
    const timeData = result.timeData || {};
    const today = new Date().toDateString();
    
    // Check if permanently blocked
    if (blockedSites.includes(domain)) {
      blockPage(domain, 'permanently_blocked');
      return;
    }
    
    // Check if time limit exceeded
    if (limits[domain] && timeData[today] && timeData[today][domain]) {
      const timeSpent = timeData[today][domain];
      const limit = limits[domain] * 60; // Convert minutes to seconds
      
      if (timeSpent >= limit) {
        const timeInfo = {
          spent: timeSpent,
          limit: limit,
          limitMinutes: limits[domain]
        };
        blockPage(domain, 'time_limit_exceeded', timeInfo);
      }
    }
  });
})();

// Function to check and block if needed (called periodically)
function checkAndBlockIfNeeded() {
  const domain = window.location.hostname;
  chrome.storage.local.get(['blockedSites', 'limits', 'timeData', 'extensionEnabled'], (result) => {
    if (result.extensionEnabled === false) return;
    
    const blockedSites = result.blockedSites || [];
    const limits = result.limits || {};
    const timeData = result.timeData || {};
    const today = new Date().toDateString();
    
    // Check if permanently blocked
    if (blockedSites.includes(domain)) {
      blockPage(domain, 'permanently_blocked');
      return;
    }
    
    // Check if time limit exceeded
    if (limits[domain] && timeData[today] && timeData[today][domain]) {
      const timeSpent = timeData[today][domain];
      const limit = limits[domain] * 60;
      
      if (timeSpent >= limit) {
        const timeInfo = {
          spent: timeSpent,
          limit: limit,
          limitMinutes: limits[domain]
        };
        blockPage(domain, 'time_limit_exceeded', timeInfo);
      }
    }
  });
}

function blockPage(domain, reason = 'permanently_blocked', timeInfo = null) {
  // Stop all existing scripts and prevent further loading
  if (window.stop) {
    window.stop();
  } else if (document.execCommand) {
    document.execCommand('Stop');
  }
  
  // Remove all page content
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Prevent any further navigation
  history.pushState(null, '', location.href);
  window.addEventListener('popstate', function() {
    history.pushState(null, '', location.href);
  });
  
  // Determine block message based on reason
  let blockIcon = '🚫';
  let blockTitle = 'Website Blocked';
  let blockSubtitle = 'Access Denied';
  let blockMessage = '';
  let blockTip = '';
  
  if (reason === 'time_limit_exceeded' && timeInfo) {
    blockIcon = '⏱️';
    blockTitle = 'Time Limit Reached';
    blockSubtitle = 'Daily Limit Exceeded';
    const limitMins = timeInfo.limitMinutes;
    blockMessage = `
      <strong>⏰ Your ${limitMins}-minute daily limit for this website has been reached.</strong><br><br>
      You've used your allocated time for today. Take a break and return tomorrow when your limit resets!
    `;
    blockTip = 'Your time limit will automatically reset at midnight. To adjust limits, open the <span class="extension-name">Smart Productivity Assistant</span> extension.';
  } else {
    blockIcon = '🚫';
    blockTitle = 'Website Blocked';
    blockSubtitle = 'Access Denied by Productivity Extension';
    blockMessage = `
      <strong>🛡️ Smart Productivity Assistant is protecting your focus.</strong><br><br>
      This site has been added to your blocked list to help you stay productive and focused on your goals.
    `;
    blockTip = 'To unblock this site, open the <span class="extension-name">Smart Productivity Assistant</span> extension and remove it from your blocked sites list.';
  }
  
  // Create blocked page
  const style = document.createElement('style');
  style.textContent = `
    *,
    *::before,
    *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #F6EEDE;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #011C42;
      position: relative;
      overflow: hidden;
    }
    
    body::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: 
        radial-gradient(circle at 20% 50%, rgba(1, 28, 66, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(1, 28, 66, 0.03) 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, rgba(1, 28, 66, 0.02) 0%, transparent 50%);
      animation: float 20s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      33% { transform: translate(30px, -30px) rotate(5deg); }
      66% { transform: translate(-20px, 20px) rotate(-5deg); }
    }
    
    .blocked-container {
      text-align: center;
      padding: 60px 40px;
      max-width: 600px;
      background: white;
      position: relative;
      z-index: 1;
      border: 3px solid #011C42;
      box-shadow: 0 10px 40px rgba(1, 28, 66, 0.15);
    }
    
    .block-icon {
      font-size: 80px;
      margin-bottom: 20px;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    
    h1 {
      font-size: 36px;
      margin-bottom: 16px;
      font-weight: 800;
      color: #011C42;
      letter-spacing: -1px;
    }
    
    .subtitle {
      font-size: 18px;
      color: #ff3b30;
      margin-bottom: 20px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    p {
      font-size: 16px;
      color: #4a4a4a;
      margin-bottom: 12px;
      line-height: 1.6;
      font-weight: 500;
    }
    
    .domain {
      font-weight: 700;
      background: #011C42;
      color: #F6EEDE;
      padding: 12px 24px;
      display: inline-block;
      margin: 20px 0;
      font-size: 20px;
      letter-spacing: 0.5px;
      border: 2px solid #011C42;
    }
    
    .message {
      font-size: 15px;
      color: #6b6b6b;
      margin-top: 24px;
      line-height: 1.7;
      font-weight: 500;
      padding: 20px;
      background: rgba(1, 28, 66, 0.05);
      border-left: 4px solid #011C42;
    }
    
    .tip {
      font-size: 13px;
      color: #9b9b9b;
      margin-top: 20px;
      font-style: italic;
    }
    
    .extension-name {
      font-weight: 700;
      color: #011C42;
    }
  `;
  
  const container = document.createElement('div');
  container.className = 'blocked-container';
  container.innerHTML = `
    <div class="block-icon">${blockIcon}</div>
    <h1>${blockTitle}</h1>
    <p class="subtitle">${blockSubtitle}</p>
    <p>This website is blocked by your productivity extension</p>
    <div class="domain">${domain}</div>
    <div class="message">
      ${blockMessage}
    </div>
    <p class="tip">${blockTip}</p>
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(container);
  
  // Prevent any interaction
  document.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  }, true);
  
  document.addEventListener('keydown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  }, true);
  
  // Prevent context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, true);
  
  // Prevent navigation attempts
  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
  });
}
