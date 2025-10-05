const fs = require('fs');
const path = require('path');

// Simple function to create PNG icons from SVG by modifying the SVG content
function generateIcon(size, outputPath) {
  const svgContent = fs.readFileSync(path.join(__dirname, '../public/icon-192x192.svg'), 'utf8');
  
  // Update the SVG dimensions and font size proportionally
  const ratio = size / 192;
  const fontSize = Math.floor(120 * ratio);
  
  const updatedSvg = svgContent
    .replace(/width="192"/g, `width="${size}"`)
    .replace(/height="192"/g, `height="${size}"`)
    .replace(/viewBox="0 0 192 192"/g, `viewBox="0 0 ${size} ${size}"`)
    .replace(/width="192" height="192"/g, `width="${size}" height="${size}"`)
    .replace(/rx="32"/g, `rx="${Math.floor(32 * ratio)}"`)
    .replace(/x="96"/g, `x="${size / 2}"`)
    .replace(/y="120"/g, `y="${Math.floor(120 * ratio)}"`)
    .replace(/font-size="120"/g, `font-size="${fontSize}"`);
  
  // For now, save as SVG with proper dimensions
  // In production, you'd use a library like sharp or puppeteer to convert to PNG
  const svgOutputPath = outputPath.replace('.png', '.svg');
  fs.writeFileSync(svgOutputPath, updatedSvg);
  
  console.log(`Generated ${size}x${size} icon: ${svgOutputPath}`);
  
  // Create a simple data URI PNG (placeholder)
  // This is a minimal 1x1 transparent PNG in base64
  const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  
  // For now, we'll create placeholder files - in production, convert SVG to PNG
  fs.writeFileSync(outputPath, 'PLACEHOLDER - Convert SVG to PNG using an image processing tool');
  console.log(`Created placeholder for ${size}x${size} PNG: ${outputPath}`);
}

// Create extension directory if it doesn't exist
const extensionDir = path.join(__dirname, '../extension');
if (!fs.existsSync(extensionDir)) {
  fs.mkdirSync(extensionDir, { recursive: true });
}

// Generate all required icon sizes
const sizes = [16, 32, 48, 128, 192, 512];
sizes.forEach(size => {
  const outputPath = path.join(extensionDir, `icon-${size}x${size}.png`);
  generateIcon(size, outputPath);
});

console.log('\\nIcon generation complete!');
console.log('\\nNOTE: The PNG files are placeholders. Use an image conversion tool to convert the SVG files to actual PNG format.');
console.log('Recommended tools:');
console.log('- Online: https://convertio.co/svg-png/');
console.log('- Command line: ImageMagick, Inkscape');
console.log('- Node.js: sharp library');