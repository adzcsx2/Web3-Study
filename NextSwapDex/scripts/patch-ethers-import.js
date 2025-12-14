// Fix for ethers v6 import path issue
// This file redirects old ethers/lib/utils imports to the new v6 paths

const path = require('path');
const fs = require('fs');

// Create the directory if it doesn't exist
const libDir = path.join(__dirname, 'node_modules', 'ethers', 'lib');
const utilsDir = path.join(libDir, 'utils');

if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}

// Create package.json in the utils directory to redirect to the correct export
const packageJson = {
  "main": "../lib.commonjs/utils/index.js",
  "module": "../lib.esm/utils/index.js",
  "types": "../lib.esm/utils/index.d.ts"
};

fs.writeFileSync(
  path.join(utilsDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);