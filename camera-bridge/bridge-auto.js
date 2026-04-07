/**
 * ZMI Photobox — Auto-detect Bridge
 * Automatically picks the right bridge based on OS.
 * Also handles auto-install of dependencies.
 */

const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const platform = os.platform();

console.log('╔══════════════════════════════════════╗');
console.log('║   ZMI Photobox — Camera Bridge       ║');
console.log('╚══════════════════════════════════════╝');
console.log(`OS: ${platform}`);

// Auto-install dependencies
const bridgeDir = __dirname;
const nodeModulesPath = path.join(bridgeDir, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n📦 Installing dependencies...');
  try {
    execSync('npm install', { cwd: bridgeDir, stdio: 'inherit' });
    console.log('✅ Dependencies installed!\n');
  } catch (e) {
    console.error('❌ Failed to install dependencies. Please run: cd camera-bridge && npm install');
    process.exit(1);
  }
}

// Check camera prerequisites
if (platform === 'win32') {
  console.log('\n🔍 Checking digiCamControl...');
  const digicamPaths = [
    'C:\\Program Files (x86)\\digiCamControl',
    'C:\\Program Files\\digiCamControl',
  ];
  const found = digicamPaths.some(p => fs.existsSync(p));
  if (!found) {
    console.warn('⚠️  digiCamControl not found!');
    console.warn('   Download: http://digicamcontrol.com/download');
    console.warn('   Install and run digiCamControl before starting this bridge.\n');
  } else {
    console.log('✅ digiCamControl found');
  }
  console.log('\nStarting Windows bridge (digiCamControl)...\n');
  require('./bridge-windows');
} else {
  console.log('\n🔍 Checking gPhoto2...');
  try {
    execSync('which gphoto2', { stdio: 'pipe' });
    console.log('✅ gPhoto2 found');
    
    // Check if camera is detected
    try {
      const detected = execSync('gphoto2 --auto-detect', { stdio: 'pipe' }).toString();
      console.log('📷 Camera detection:\n' + detected);
    } catch {
      console.warn('⚠️  No camera detected. Please connect your Canon camera via USB.');
    }
  } catch {
    console.warn('⚠️  gPhoto2 not found!');
    console.warn('   Install: sudo apt-get install gphoto2 libgphoto2-dev');
    console.warn('   Then reconnect your camera.\n');
  }
  console.log('\nStarting Linux bridge (gPhoto2)...\n');
  require('./bridge-linux');
}
