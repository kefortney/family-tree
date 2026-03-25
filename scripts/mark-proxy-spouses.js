/**
 * mark-proxy-spouses.js
 *
 * Adds `"proxyOnly": true` to any person node that is a direct child of a
 * branch node AND has a spouseId pointing to someone deeper in the tree.
 * These nodes should appear as proxy circles beside their spouse in the tree
 * view, not as floating standalone nodes at the top of the branch.
 *
 * Usage: node scripts/mark-proxy-spouses.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'family.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

let marked = 0;
let cleared = 0;

data.children.forEach(branch => {
  if (branch.type !== 'branch') return;

  (branch.children || []).forEach(child => {
    if (child.spouseId) {
      if (!child.proxyOnly) {
        child.proxyOnly = true;
        console.log('  Marked proxy: [' + child.id + '] ' + child.name +
                    '  (branch: ' + branch.branch + ')');
        marked++;
      }
    } else if (child.proxyOnly) {
      // Clean up stale flag if spouseId was removed
      delete child.proxyOnly;
      cleared++;
    }
  });
});

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('\nDone — marked ' + marked + ' proxy-only nodes, cleared ' + cleared + ' stale flags.');
