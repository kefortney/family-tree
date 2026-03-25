/**
 * fix-floating-inlaws.js
 *
 * Removes "floating" in-law nodes that were parked as direct children of a
 * branch node instead of being shown as spouse proxies beside their partner.
 *
 * For each removed node:
 *  - The spouse's `marriages` array is updated so it has a spouseName entry
 *    (this drives the external-proxy label in the tree view).
 *  - Any notable data (birth, death) is folded into that marriage entry as a note.
 *  - The node's own spouseId is kept in the marriage entry for the bidirectional
 *    panel display; the top-level spouseId on the spouse node is left intact.
 *
 * Usage: node scripts/fix-floating-inlaws.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'family.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Build a flat id→node map
const byId = new Map();
function collect(n) {
  if (n && n.id) byId.set(n.id, n);
  (n.children || []).forEach(collect);
}
collect(data);

// ----- Helpers ---------------------------------------------------------------

function ensureMarriageEntry(spouseNode, inlawNode) {
  if (!Array.isArray(spouseNode.marriages)) spouseNode.marriages = [];

  // Find existing entry for this in-law
  let entry = spouseNode.marriages.find(m => m.spouseId === inlawNode.id);

  if (!entry) {
    entry = { spouseName: inlawNode.name, spouseId: inlawNode.id };
    spouseNode.marriages.push(entry);
  } else {
    // Fill in name if missing
    if (!entry.spouseName) entry.spouseName = inlawNode.name;
  }

  // Preserve birth / death as a note on the marriage entry if present
  const parts = [];
  if (inlawNode.birth  && inlawNode.birth  > 1000) parts.push('b. ' + inlawNode.birth);
  if (inlawNode.death  && inlawNode.death  > 1000) parts.push('d. ' + inlawNode.death);
  if (inlawNode.notes) parts.push(inlawNode.notes);
  if (parts.length && !entry.spouseNotes) entry.spouseNotes = parts.join(' · ');
}

// ----- Process each branch ---------------------------------------------------

let removed = 0;

data.children.forEach(branch => {
  if (branch.type !== 'branch') return;

  const floating = (branch.children || []).filter(c => c.spouseId);
  if (floating.length === 0) return;

  floating.forEach(inlaw => {
    const spouse = byId.get(inlaw.spouseId);
    if (!spouse) {
      console.warn('  WARNING: spouse not found for', inlaw.name, '[' + inlaw.id + ']');
      return;
    }

    // Ensure the spouse node has the in-law's name in its marriages array
    ensureMarriageEntry(spouse, inlaw);

    console.log('  Removed [' + inlaw.id + '] ' + inlaw.name +
                ' from ' + branch.branch + '_branch  →  proxy beside ' +
                spouse.name + ' [' + spouse.id + ']');
    removed++;
  });

  // Strip the floating in-laws from the branch's direct children
  branch.children = branch.children.filter(c => !c.spouseId);
});

// ----- Write back ------------------------------------------------------------

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log('\nDone — removed ' + removed + ' floating in-law node(s) from branch children.');
console.log('Their names are now preserved in their spouses\' marriages[] entries.');
