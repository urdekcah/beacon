const fs = require("fs");
const TOML = require('@iarna/toml');

function loadConfig() {
  if (!fs.existsSync('./Beacon.toml')) {
    console.error('Config file not found');
    process.exit(1);
  }

  const config = fs.readFileSync('./Beacon.toml', 'utf8');
  return TOML.parse(config);
}

module.exports = { loadConfig };