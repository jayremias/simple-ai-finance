const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve modules from both the project and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Bun workspaces don't create node_modules symlinks — map workspace packages
// explicitly so Metro can find them.
config.resolver.extraNodeModules = {
  '@moneylens/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

module.exports = config;
