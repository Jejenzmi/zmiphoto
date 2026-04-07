/**
 * ZMI Photobox — Auto-detect Print Bridge
 */
const os = require('os');
const platform = os.platform();

console.log(`Detected OS: ${platform}`);

if (platform === 'win32') {
  console.log('Starting Windows print bridge...\n');
  require('./bridge-windows');
} else {
  console.log('Starting Linux print bridge (CUPS)...\n');
  require('./bridge-linux');
}
