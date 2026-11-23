import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getFileHash(filePath) {
  const cleanPath = filePath.split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
  const resolved = path.resolve(rootDir, cleanPath);
  if (!fs.existsSync(resolved)) {
    return Date.now().toString(36).slice(-6);
  }
  const content = fs.readFileSync(resolved);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

function getFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Compute combined hash for all JS files so ANY module change busts main.js
function getAllJsHash() {
  const hash = crypto.createHash('sha256');
  const jsDir = path.join(rootDir, 'js');
  const jsFiles = getFilesRecursively(jsDir);
  jsFiles.sort();
  for (const file of jsFiles) {
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex').slice(0, 8);
}

// 1. Update index.html
const indexPath = path.join(rootDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Replace CSS links with their individual content hashes
indexHtml = indexHtml.replace(/href=["'](\.?\/?(?:css|fonts)\/[^"']+\.css)(?:\?[^"']*)?["']/g, (match, url) => {
  const hash = getFileHash(url);
  return `href="${url}?v=${hash}"`;
});

// Replace JS script tag with the combined JS hash
const allJsHash = getAllJsHash();
indexHtml = indexHtml.replace(/src=["'](\.?\/?js\/[^"']+\.js)(?:\?[^"']*)?["']/g, (match, url) => {
  return `src="${url}?v=${allJsHash}"`;
});

fs.writeFileSync(indexPath, indexHtml, 'utf-8');
console.log(`✔ Updated index.html (JS bundle hash: ${allJsHash})`);

// 2. Compute global project hash for sw.js CACHE_NAME
const allFiles = getFilesRecursively(path.join(rootDir, 'css'))
  .concat(getFilesRecursively(path.join(rootDir, 'js')))
  .concat([indexPath]);
allFiles.sort();

const globalHash = crypto.createHash('sha256');
for (const file of allFiles) {
  globalHash.update(fs.readFileSync(file));
}
const buildVersion = `finance-v1.6.2-${globalHash.digest('hex').slice(0, 8)}`;

const swPath = path.join(rootDir, 'sw.js');
let swContent = fs.readFileSync(swPath, 'utf-8');

swContent = swContent.replace(/const CACHE_NAME = ["'][^"']+["'];/, `const CACHE_NAME = "${buildVersion}";`);
fs.writeFileSync(swPath, swContent, 'utf-8');
console.log(`✔ Updated sw.js CACHE_NAME to: ${buildVersion}`);
