const fs = require('fs');
const path = require('path');

console.log('Building ArbiTips browser extension...');

const sourceDir = path.join(__dirname, '../extension');
const publicDir = path.join(__dirname, '../public');

// Ensure extension directory exists
if (!fs.existsSync(sourceDir)) {
  console.error('Extension source directory not found:', sourceDir);
  process.exit(1);
}

// Copy missing icon files from public to extension
const copyIcon = (filename) => {
  const sourcePath = path.join(publicDir, filename);
  const targetPath = path.join(sourceDir, filename);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Copied ${filename} to extension`);
  } else {
    console.warn(`Warning: ${filename} not found in public directory`);
  }
};

// Copy available icons
try {
  copyIcon('favicon.ico');
  copyIcon('icon-192x192.svg');
  
  // Create a basic icon-32x32.png from the SVG (placeholder)
  const icon32Path = path.join(sourceDir, 'icon-32x32.png');
  if (!fs.existsSync(icon32Path)) {
    // Copy the SVG as a placeholder
    const svgPath = path.join(publicDir, 'icon-192x192.svg');
    if (fs.existsSync(svgPath)) {
      fs.copyFileSync(svgPath, path.join(sourceDir, 'icon-32x32.svg'));
      console.log('Created icon-32x32.svg placeholder');
    }
  }
} catch (error) {
  console.warn('Icon copying failed:', error.message);
}

// Validate required files
const requiredFiles = [
  'manifest.json',
  'background.js',
  'contentScript.bundle.js',
  'popup.html',
  'popup.js',
  'content-styles.css',
  'locales/en/translation.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(sourceDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✓ ${file}`);
  }
});

if (!allFilesExist) {
  console.error('Build failed: Missing required files');
  process.exit(1);
}

// Validate manifest.json
try {
  const manifestPath = path.join(sourceDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  if (manifest.manifest_version !== 3) {
    console.error('Invalid manifest version. Expected 3, got:', manifest.manifest_version);
    process.exit(1);
  }
  
  console.log(`✓ Valid Manifest V3 (${manifest.name} v${manifest.version})`);
} catch (error) {
  console.error('Invalid manifest.json:', error.message);
  process.exit(1);
}

console.log('\\n✅ Extension build completed successfully!');
console.log('\\nTo load the extension:');
console.log('1. Open Chrome/Edge and go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the extension folder');
console.log(`4. Extension folder: ${sourceDir}`);
console.log('\\nTo create a zip for distribution:');
console.log('npm run pack:extension');