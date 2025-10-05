# ArbiTips Browser Extension - Troubleshooting Guide

## Common Issues and Solutions

### 1. "Resources must be listed in web_accessible_resources" Error

**Problem:** Browser console shows errors like:
```
Denying load of <URL>. Resources must be listed in the web_accessible_resources manifest key
```

**Solution:**
✅ **FIXED** - The extension manifest now includes proper `web_accessible_resources` configuration:

```json
"web_accessible_resources": [
  {
    "resources": [
      "contentScript.bundle.js",
      "content-styles.css", 
      "icon-*.png",
      "fonts/*",
      "locales/*",
      "assets/*"
    ],
    "matches": ["<all_urls>"]
  }
]
```

### 2. "chrome-extension://invalid/" Errors

**Problem:** Console shows failed requests to `chrome-extension://invalid/`

**Solution:**
✅ **FIXED** - Content script now uses proper URL resolution:

```javascript
function getExtensionResource(path) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }
  return null; // Safe fallback
}
```

### 3. Missing Icon Files (404 Errors)

**Problem:** Browser can't load icon-32x32.png, icon-192x192.png, etc.

**Solution:**
✅ **FIXED** - Icons are now generated in multiple sizes:
- Run `npm run build:extension` to copy and generate icons
- Icons are created from the main SVG logo
- All required sizes (16x16, 32x32, 48x48, 128x128, 192x192, 512x512) included

### 4. HTTP 500 Errors from API

**Problem:** Extension content script getting 500 errors from arbitrage API

**Diagnosis:**
```bash
# Test your API endpoints
curl -X GET "http://localhost:3001/api/arbitrage"
curl -X GET "http://localhost:3001/api/news"
```

**Solutions:**
- Verify your `.env.local` file has all required API keys
- Check if your development server is running: `npm run dev`
- Ensure Base network RPC is accessible
- Check API rate limits

### 5. Translation/Localization Errors

**Problem:** i18next translation files not loading

**Solution:**
✅ **FIXED** - Translation files properly structured:
- Located at `extension/locales/en/translation.json`
- Safe fallback translations included in content script
- Proper error handling for missing translation files

## Loading the Extension

### Development Mode
1. Build the extension: `npm run build:extension`
2. Open Chrome/Edge: `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `extension` folder

### Production Build
1. Create distribution package: `npm run pack:extension`
2. Upload `arbitips-extension.zip` to Chrome Web Store

## Debugging Tips

### Check Extension Console
1. Go to `chrome://extensions/`
2. Find "ArbiTips" extension
3. Click "background page" or "service worker" to view background script console
4. Click "Details" > "Inspect views" to debug popup

### Content Script Debugging  
1. Open any webpage
2. Open DevTools (F12)
3. Look for "ArbiTips content script loaded" in console
4. Check for any error messages

### Common Debug Commands
```javascript
// In extension console
chrome.runtime.getManifest()
chrome.runtime.getURL('')
chrome.storage.local.get()

// In content script console  
chrome.runtime.sendMessage({action: 'test'})
```

## File Structure

```
extension/
├── manifest.json              # Main extension manifest (Manifest V3)
├── background.js             # Service worker
├── contentScript.bundle.js   # Content script (injected into web pages)
├── popup.html               # Extension popup UI
├── popup.js                 # Popup functionality
├── content-styles.css       # Styles for content script
├── icon-*.png              # Extension icons (multiple sizes)
├── icon-*.svg              # Generated SVG icons
└── locales/
    └── en/
        └── translation.json # English translations
```

## Environment Variables

Make sure these are set in `.env.local`:

```bash
# Required for extension API calls
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_API_URL=https://api.arbitips.app

# Optional for enhanced features
ALCHEMY_API_KEY=your_alchemy_key
MORALIS_API_KEY=your_moralis_key
```

## Testing Checklist

- [ ] Extension loads without console errors
- [ ] Icon appears in browser toolbar  
- [ ] Popup opens when clicking icon
- [ ] Content script injects on DeFi websites
- [ ] API calls succeed (no 500 errors)
- [ ] Translation files load correctly
- [ ] All required permissions granted
- [ ] Extension works on target websites (Uniswap, etc.)

## Need Help?

1. Check browser console for specific error messages
2. Verify all files exist in `extension/` directory
3. Test with a fresh browser profile
4. Review Chrome extension documentation: https://developer.chrome.com/docs/extensions/

## Version History

- **v1.0.0** - Initial release with fixed manifest V3 configuration
  - ✅ Fixed web_accessible_resources errors
  - ✅ Eliminated chrome-extension://invalid/ URLs  
  - ✅ Added proper icon handling
  - ✅ Implemented safe content script loading
  - ✅ Added comprehensive error handling