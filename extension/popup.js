// Popup script for ArbiTips extension
document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scanBtn');
  const openDashboard = document.getElementById('openDashboard');
  const settingsBtn = document.getElementById('settings');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');

  // Scan button handler
  scanBtn.addEventListener('click', async function() {
    try {
      statusEl.textContent = 'Scanning...';
      errorEl.style.display = 'none';
      scanBtn.disabled = true;

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script or background
      const response = await chrome.runtime.sendMessage({
        action: 'arbitrageScan',
        data: { url: tab.url }
      });

      if (response.success) {
        statusEl.textContent = `Found ${response.data.opportunities.length} opportunities`;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      errorEl.textContent = `Scan failed: ${error.message}`;
      errorEl.style.display = 'block';
      statusEl.textContent = 'Scan failed';
    } finally {
      scanBtn.disabled = false;
    }
  });

  // Dashboard button handler
  openDashboard.addEventListener('click', function() {
    // Open the main ArbiTips dashboard
    chrome.tabs.create({
      url: 'https://arbitips.app'
    });
    window.close();
  });

  // Settings button handler
  settingsBtn.addEventListener('click', function() {
    // Open extension options page
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  });

  // Initialize status
  statusEl.textContent = 'Ready to scan';
});