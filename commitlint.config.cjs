const fs = require('fs');
const path = require('path');

const PATHS_TO_DIR = ['packages/modules/', 'packages/providers/', 'packages/utils'];
const REPO_SCOPES = ['deps', 'release', 'docs', 'root'];

const packageScopes = PATHS_TO_DIR.flatMap(dirPath => {
  const fullPath = path.resolve(__dirname, dirPath);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => fs.existsSync(path.join(fullPath, d.name, 'package.json')))
    .map(d => d.name);
});

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [...packageScopes, ...REPO_SCOPES]],
    'scope-empty': [1, 'never'],
    'header-max-length': [2, 'always', 300],
  },
};
