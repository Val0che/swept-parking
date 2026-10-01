const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The bundled street-side database (assets/data/sides.db) ships as an asset.
config.resolver.assetExts.push('db');

module.exports = config;
