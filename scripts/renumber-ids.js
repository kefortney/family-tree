/**
 * renumber-ids.js
 * Assigns sequential 4-digit numeric IDs (0001, 0002, …) to every node in
 * family.json, then rewrites all cross-references (spouseId, marriages[].spouseId).
 * Root and branch nodes are also renumbered; tree.js branch lookup uses
 * branch+type fields so it is unaffected.
 *
 * Usage: node scripts/renumber-ids.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'family.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// ── Step 1: collect every node in DFS order ──────────────────────────────
const allNodes = [];
function collect(node) {
  if (node && typeof node === 'object') {
    allNodes.push(node);
    (node.children || []).forEach(collect);
  }
}
collect(data);

// ── Step 2: build old→new ID map ─────────────────────────────────────────
const idMap = new Map(); // old string id → new padded numeric string
let counter = 1;
allNodes.forEach(node => {
  if (node.id !== undefined && node.id !== null) {
    if (!idMap.has(node.id)) {
      idMap.set(node.id, String(counter).padStart(4, '0'));
      counter++;
    }
  }
});

// ── Step 3: rewrite all ID fields in place ───────────────────────────────
function rewrite(node) {
  if (!node || typeof node !== 'object') return;

  // Primary id
  if (node.id !== undefined && idMap.has(node.id)) {
    node.id = idMap.get(node.id);
  }

  // spouseId (top-level)
  if (node.spouseId && idMap.has(node.spouseId)) {
    node.spouseId = idMap.get(node.spouseId);
  }

  // marriages[].spouseId
  if (Array.isArray(node.marriages)) {
    node.marriages.forEach(m => {
      if (m.spouseId && idMap.has(m.spouseId)) {
        m.spouseId = idMap.get(m.spouseId);
      }
    });
  }

  // Recurse into children
  (node.children || []).forEach(rewrite);
}
rewrite(data);

// ── Step 4: write back ────────────────────────────────────────────────────
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

// ── Report ────────────────────────────────────────────────────────────────
console.log(`Renumbered ${idMap.size} IDs.`);
idMap.forEach((newId, oldId) => {
  console.log(`  ${oldId.padEnd(45)} → ${newId}`);
});
