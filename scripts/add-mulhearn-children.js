/**
 * add-mulhearn-children.js
 *
 * Adds the nine missing children of Robert & Agnes Mulhearn, plus their
 * known descendants, to the family.json tree.
 *
 * Source: mulhearn.html / Lynn's family document.
 *
 * Usage: node scripts/add-mulhearn-children.js
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'family.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// ── Find highest existing numeric ID ─────────────────────────────────────────
let maxId = 0;
function scanIds(node) {
  const n = parseInt(node.id, 10);
  if (!isNaN(n) && n > maxId) maxId = n;
  (node.children || []).forEach(scanIds);
}
scanIds(data);
let counter = maxId;
function nextId() { return String(++counter).padStart(4, '0'); }

// ── Build the nine new children (Shirley = 0168 already exists) ──────────────

const newChildren = [

  // 1. Mae
  {
    id: nextId(), name: 'Mae Mulhearn', gender: 'F', branch: 'mulhearn',
    notes: 'Deceased. Eldest daughter of Robert and Agnes Mulhearn.',
    children: [
      { id: nextId(), name: 'Kitty', gender: 'F', branch: 'mulhearn',
        notes: 'Daughter of Mae Mulhearn. Additional siblings may exist — details unknown.', children: [] }
    ]
  },

  // 2. Harry
  {
    id: nextId(), name: 'Harry Mulhearn', gender: 'M', branch: 'mulhearn',
    notes: 'Deceased. Son of Robert and Agnes Mulhearn. Children unknown.', children: []
  },

  // 3. Agnes (named for her mother)
  {
    id: nextId(), name: 'Agnes Mulhearn Carolan', gender: 'F', branch: 'mulhearn',
    spouse: 'John Carolan',
    notes: 'Daughter of Robert and Agnes Mulhearn. Married John Carolan.',
    children: [
      { id: nextId(), name: 'Kathleen Carolan', gender: 'F', branch: 'mulhearn',
        notes: '5 children and 1 stepson — details not yet recorded.', children: [] },
      { id: nextId(), name: 'Patty Carolan', gender: 'F', branch: 'mulhearn',
        notes: 'Known as "Pat-Pat." 2 children — details not yet recorded.', children: [] }
    ]
  },

  // 4. Robert Jr.
  {
    id: nextId(), name: 'Robert Mulhearn Jr.', gender: 'M', branch: 'mulhearn',
    spouse: 'Helen',
    notes: 'Deceased. Son of Robert and Agnes Mulhearn. Married Helen.',
    children: [
      { id: nextId(), name: 'Eileen Mulhearn', gender: 'F', branch: 'mulhearn', children: [] },
      { id: nextId(), name: 'Robert Mulhearn III', gender: 'M', branch: 'mulhearn', children: [] }
    ]
  },

  // 5. Shirley — already exists as 0168, inserted programmatically below

  // 6. Rheta
  {
    id: nextId(), name: 'Rheta Mulhearn Gotz', gender: 'F', branch: 'mulhearn',
    spouse: 'Eddy Gotz',
    notes: 'Daughter of Robert and Agnes Mulhearn. Married Eddy Gotz.',
    children: [
      { id: nextId(), name: 'Rheta Gotz', gender: 'F', branch: 'mulhearn',
        notes: 'Known as "Rita girl."', children: [] },
      { id: nextId(), name: 'Cecilia Gotz', gender: 'F', branch: 'mulhearn',
        notes: 'Known as "Ceil."', children: [] }
    ]
  },

  // 7. Raymond
  {
    id: nextId(), name: 'Raymond Mulhearn', gender: 'M', branch: 'mulhearn',
    spouse: 'Josie',
    notes: 'Deceased. Son of Robert and Agnes Mulhearn. Married Josie. Children unknown.', children: []
  },

  // 8. [Name unknown]
  {
    id: nextId(), name: '[Name unknown] Mulhearn', gender: 'F', branch: 'mulhearn',
    notes: 'Eighth child of Robert and Agnes Mulhearn. Given name not recorded in available sources.',
    children: [
      { id: nextId(), name: 'Joanne', gender: 'F', branch: 'mulhearn', children: [] }
    ]
  },

  // 9. Pat
  {
    id: nextId(), name: 'Pat Mulhearn', gender: 'F', branch: 'mulhearn',
    spouse: 'Eddie',
    notes: 'Daughter of Robert and Agnes Mulhearn. Married Eddie.',
    children: [
      {
        id: nextId(), name: 'Sheila', gender: 'F', branch: 'mulhearn',
        children: [
          { id: nextId(), name: 'Donna', gender: 'F', branch: 'mulhearn', children: [] }
        ]
      },
      { id: nextId(), name: 'Kenneth', gender: 'M', branch: 'mulhearn', children: [] },
      { id: nextId(), name: 'Rebecca', gender: 'F', branch: 'mulhearn', children: [] },
      { id: nextId(), name: 'Pat', gender: 'F', branch: 'mulhearn',
        notes: 'Known as "Little Pat."', children: [] }
    ]
  },

  // 10. Myrtle
  {
    id: nextId(), name: 'Myrtle Mulhearn Caprigleone', gender: 'F', branch: 'mulhearn',
    birth: 1929, death: 2011,
    spouse: 'Barney Caprigleone',
    notes: 'Born 25 May 1929. Died 2011. Tenth child of Robert and Agnes Mulhearn. Married Barney Caprigleone (deceased).',
    children: [
      {
        id: nextId(), name: 'Barbara Caprigleone', gender: 'F', branch: 'mulhearn',
        children: [
          { id: nextId(), name: 'Jennifer', gender: 'F', branch: 'mulhearn', children: [] },
          { id: nextId(), name: 'Jacki',    gender: 'F', branch: 'mulhearn', children: [] },
          { id: nextId(), name: 'Michelle', gender: 'F', branch: 'mulhearn', children: [] },
          { id: nextId(), name: 'Edward Jr.', gender: 'M', branch: 'mulhearn', children: [] }
        ]
      },
      {
        id: nextId(), name: 'Barney Caprigleone Jr.', gender: 'M', branch: 'mulhearn',
        children: [
          { id: nextId(), name: 'Jacqui', gender: 'F', branch: 'mulhearn', children: [] }
        ]
      },
      {
        id: nextId(), name: 'Lynne Caprigleone', gender: 'F', branch: 'mulhearn',
        children: [
          { id: nextId(), name: 'Mark', gender: 'M', branch: 'mulhearn', children: [] },
          {
            id: nextId(), name: 'Lisa', gender: 'F', branch: 'mulhearn',
            children: [
              { id: nextId(), name: 'Henry', gender: 'M', branch: 'mulhearn', children: [] }
            ]
          }
        ]
      }
    ]
  }

];

// ── Locate Robert Mulhearn [0167] and insert the new children ─────────────────
const byId = new Map();
function collect(n) { if (n && n.id) byId.set(n.id, n); (n.children || []).forEach(collect); }
collect(data);

const robert = byId.get('0167');
if (!robert) { console.error('Robert Mulhearn [0167] not found!'); process.exit(1); }

// Existing children (Shirley, 0168) stays in the list
const existingChildren = robert.children || [];

// The canonical order of Robert & Agnes's 10 children:
//  1 Mae, 2 Harry, 3 Agnes, 4 Robert Jr., 5 Shirley (existing),
//  6 Rheta, 7 Raymond, 8 [Unknown], 9 Pat, 10 Myrtle
const shirley = existingChildren.find(c => c.id === '0168');

robert.children = [
  newChildren[0],  // Mae
  newChildren[1],  // Harry
  newChildren[2],  // Agnes
  newChildren[3],  // Robert Jr.
  ...(shirley ? [shirley] : []),  // Shirley (position 5)
  newChildren[4],  // Rheta
  newChildren[5],  // Raymond
  newChildren[6],  // [Unknown]
  newChildren[7],  // Pat
  newChildren[8],  // Myrtle
];

// ── Also link Agnes McEntee [0189] ↔ Robert Mulhearn [0167] via spouseId ──────
// Agnes is a direct child of mulhearn_branch and should be proxyOnly
const agnes = byId.get('0189');
if (agnes && !agnes.spouseId) {
  agnes.spouseId  = '0167';
  agnes.proxyOnly = true;
  robert.spouseId = '0189';
  console.log('Linked Agnes McEntee [0189] <-> Robert Mulhearn [0167] and marked Agnes as proxyOnly.');
}

// ── Write back ────────────────────────────────────────────────────────────────
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

// ── Report ────────────────────────────────────────────────────────────────────
function countNew(node) {
  let n = 1;
  (node.children || []).forEach(c => { n += countNew(c); });
  return n;
}
const total = newChildren.reduce((s, n) => s + countNew(n), 0);
console.log(`Added ${total} new nodes (IDs ${String(maxId + 1).padStart(4,'0')}–${String(counter).padStart(4,'0')}).`);
newChildren.forEach(n => console.log('  ' + n.id + ' ' + n.name + '  (' + (n.children||[]).length + ' direct children)'));
