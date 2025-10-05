// Background service worker for ArbiTips extension
console.log('ArbiTips extension background script loaded');

// Install event
chrome.runtime.onInstalled.addListener(() => {
  console.log('ArbiTips extension installed');
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'getExtensionUrl') {
    sendResponse({ url: chrome.runtime.getURL(request.path || '') });
    return true;
  }
  
  if (request.action === 'arbitrageScan') {
    // Handle arbitrage scanning requests
    handleArbitrageRequest(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Arbitrage scanning function
async function handleArbitrageRequest(data) {
  try {
    // This would integrate with your existing arbitrage logic
    console.log('Performing arbitrage scan with data:', data);
    
    // For now, return mock data
    return {
      opportunities: [],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Arbitrage scan failed:', error);
    throw error;
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked for tab:', tab.id);
});