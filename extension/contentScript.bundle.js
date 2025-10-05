// ArbiTips Content Script
console.log('ArbiTips content script loaded');

// Fix for chrome-extension://invalid/ errors
// Get proper extension URL using chrome.runtime.getURL
function getExtensionResource(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }
  // Fallback - avoid invalid URLs
  return null;
}

// Initialize the extension safely
function initializeArbiTips() {
  try {
    // Avoid loading resources that cause invalid URL errors
    console.log('Initializing ArbiTips extension...');
    
    // Create a safe wrapper for any external resource loading
    const loadResource = (resourcePath) => {
      const url = getExtensionResource(resourcePath);
      if (!url) {
        console.warn('Could not get extension URL for:', resourcePath);
        return Promise.reject('Extension URL not available');
      }
      return fetch(url);
    };

    // Safe translation loading function
    const loadTranslations = async (lang = 'en') => {
      try {
        const url = getExtensionResource(`locales/${lang}/translation.json`);
        if (!url) {
          console.warn('Translation URL not available, using fallback');
          return { arbitrage: 'Arbitrage', scan: 'Scan', opportunities: 'Opportunities' };
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Translation fetch failed: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.warn('Translation loading failed, using fallback:', error);
        return { arbitrage: 'Arbitrage', scan: 'Scan', opportunities: 'Opportunities' };
      }
    };

    // Initialize with safe error handling
    loadTranslations().then(translations => {
      console.log('ArbiTips translations loaded:', translations);
      
      // Initialize the main functionality
      initializeArbitrageScanner();
    }).catch(error => {
      console.warn('Translation initialization failed:', error);
      // Continue with default functionality
      initializeArbitrageScanner();
    });

  } catch (error) {
    console.error('ArbiTips initialization failed:', error);
  }
}

// Main arbitrage scanner functionality
function initializeArbitrageScanner() {
  console.log('ArbiTips scanner initialized');
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scanPage') {
      scanCurrentPage()
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
    }
  });

  // Add ArbiTips UI elements to DeFi pages
  if (isDeFiPage()) {
    addArbiTipsOverlay();
  }
}

// Check if current page is a DeFi platform
function isDeFiPage() {
  const defiDomains = [
    'uniswap.org',
    'app.uniswap.org',
    'sushiswap.fi',
    'pancakeswap.finance',
    'curve.fi',
    'aave.com',
    'compound.finance',
    '1inch.io'
  ];
  
  return defiDomains.some(domain => window.location.hostname.includes(domain));
}

// Add ArbiTips overlay to DeFi pages
function addArbiTipsOverlay() {
  // Create a simple, non-intrusive overlay
  const overlay = document.createElement('div');
  overlay.id = 'arbitips-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #3B82F6, #8B5CF6);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
      🚀 ArbiTips Scanner
    </div>
  `;
  
  // Add click handler
  overlay.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  document.body.appendChild(overlay);
}

// Scan current page for arbitrage opportunities
async function scanCurrentPage() {
  try {
    const pageData = {
      url: window.location.href,
      title: document.title,
      isDeFi: isDeFiPage(),
      tokens: extractTokenInfo(),
      timestamp: Date.now()
    };
    
    console.log('Scanning page:', pageData);
    
    // This would integrate with your existing arbitrage API
    return {
      opportunities: [],
      pageData,
      scanTime: Date.now()
    };
  } catch (error) {
    console.error('Page scan failed:', error);
    throw error;
  }
}

// Extract token information from current page
function extractTokenInfo() {
  // Basic token detection - this would be more sophisticated in production
  const tokens = [];
  
  // Look for common token symbols in the page
  const tokenRegex = /\b(ETH|BTC|USDC|USDT|DAI|WETH|UNI|SUSHI)\b/g;
  const matches = document.body.textContent.match(tokenRegex);
  
  if (matches) {
    tokens.push(...[...new Set(matches)]);
  }
  
  return tokens;
}

// Safe initialization with error boundaries
try {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeArbiTips);
  } else {
    initializeArbiTips();
  }
} catch (error) {
  console.error('ArbiTips content script failed to initialize:', error);
}