(function () {
  // Branch palette: dark = saturated color used for recent nodes,
  // light = washed-out tint used for oldest ancestors.
  const BRANCH = {
    fortney:   { dark: '#1d3a6c', light: '#d8e4f5' },
    sodergren: { dark: '#2d6e5e', light: '#c5e0da' },
    mulhearn:  { dark: '#3a5c2d', light: '#c5d9be' },
    andersen:  { dark: '#7a2b3a', light: '#f0d0d6' },
    unknown:   { dark: '#8b6b52', light: '#e4d8ce' },
  };

  const BRANCH_URLS = {
    fortney:   'fortney.html',
    sodergren: 'sodergren.html',
    mulhearn:  'mulhearn.html',
    andersen:  'andersen.html',
  };

  // Year range across the full dataset (Aamund b.1570 → youngest b.~2007)
  const MIN_YEAR = 1570;
  const MAX_YEAR = 2010;

  // Node circle radius in pixels
  const NODE_R = 24;

  // Honorifics to skip when picking a display first name
  const SKIP_WORDS = new Set(['rev.', 'dr.', 'mr.', 'mrs.', 'ms.', 'col.', 'prof.', 'lt.', 'maj.', 'capt.']);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function shortName(name) {
    if (!name) return '?';
    const clean = name.replace(/\s*\([^)]*\)/g, '').trim();
    const parts = clean.split(/\s+/);
    const first = parts.find(p => !SKIP_WORDS.has(p.toLowerCase())) || parts[0] || '?';
    return first.length <= 9 ? first : first.slice(0, 8) + '…';
  }

  function nodeColor(d) {
    const palette = BRANCH[d.branch] || BRANCH.unknown;
    const year = d.birth || d.death;
    if (!year) return d3.interpolateRgb(palette.light, palette.dark)(0.45);
    const t = Math.max(0, Math.min(1, (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)));
    return d3.interpolateRgb(palette.light, palette.dark)(t);
  }

  // Pick white or dark-brown text for legibility on the given background hex.
  function contrastText(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.52 ? '#3a2a1a' : '#ffffff';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Flatten family.json ──────────────────────────────────────────────────────
  // Walks the hierarchical tree and produces a flat list of person nodes plus
  // two arrays of links: parent→child (from tree structure) and spouse (from
  // spouseId / marriages[]).  Links use string IDs so they are never mutated
  // by D3's forceLink resolver; fresh copies are made before each simulation.

  function flattenFamily(root) {
    const nodes = [];
    const byId = new Map();
    const parentChildLinks = [];
    const spousePairs = new Set();
    const spouseLinks = [];

    function walk(node, parentId) {
      if (!node) return;
      if (node.type === 'root' || node.type === 'branch') {
        (node.children || []).forEach(c => walk(c, null));
        return;
      }
      if (!node.id || byId.has(node.id)) return;

      const n = {
        id:         node.id,
        name:       node.name  || node.id,
        branch:     node.branch || 'unknown',
        birth:      node.birth  ? +node.birth  : null,
        death:      node.death  ? +node.death  : null,
        birthplace: node.birthplace  || null,
        deathplace: node.deathplace  || null,
        gender:     node.gender      || null,
        notes:      node.notes       || null,
        marriages:  node.marriages   || null,
        spouseId:   node.spouseId    || null,
        spouse:     node.spouse      || null,
        url:        BRANCH_URLS[node.branch] || null,
      };

      nodes.push(n);
      byId.set(node.id, n);

      if (parentId) {
        parentChildLinks.push({ source: parentId, target: node.id, type: 'parent-child' });
      }

      (node.children || []).forEach(c => walk(c, node.id));
    }

    walk(root, null);

    // Build spouse links only between nodes that exist in the tree
    nodes.forEach(n => {
      const marriages = (n.marriages && n.marriages.length)
        ? n.marriages
        : (n.spouseId ? [{ spouseId: n.spouseId }] : []);

      marriages.forEach(m => {
        if (!m.spouseId || !byId.has(m.spouseId)) return;
        const pair = [n.id, m.spouseId].sort().join('|');
        if (spousePairs.has(pair)) return;
        spousePairs.add(pair);
        spouseLinks.push({ source: n.id, target: m.spouseId, type: 'spouse' });
      });
    });

    return {
      nodes,
      byId,
      parentChildLinks,
      spouseLinks,
    };
  }

  // ── State ────────────────────────────────────────────────────────────────────

  const container   = document.getElementById('graph-container');
  const statsEl     = document.getElementById('graph-stats');
  const searchEl    = document.getElementById('node-search');
  const detailPanel = document.getElementById('person-detail');

  let allNodes = [];
  let parentChildLinks = [], spouseLinks = [];
  let activeFilters = new Set(['fortney', 'sodergren', 'mulhearn', 'andersen']);

  let simulation = null;
  let svg = null, gLinks = null, gNodes = null;

  // ── Detail panel ─────────────────────────────────────────────────────────────

  function showDetail(d) {
    document.getElementById('detail-name').textContent = d.name || d.id;

    const badge = document.getElementById('detail-branch');
    if (d.branch && d.branch !== 'unknown') {
      badge.textContent = d.branch.charAt(0).toUpperCase() + d.branch.slice(1);
      badge.className = `branch-badge ${d.branch}`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }

    const lines = [];
    if (d.birth) lines.push(`b. ${d.birth}${d.birthplace ? ', ' + d.birthplace : ''}`);
    if (d.death) lines.push(`d. ${d.death}${d.deathplace ? ', ' + d.deathplace : ''}`);
    document.getElementById('detail-dates').textContent = lines.join('\n');

    document.getElementById('detail-notes').textContent = d.notes || '';

    const marriagesEl = document.getElementById('detail-marriages');
    const marriages = (d.marriages && d.marriages.length)
      ? d.marriages
      : (d.spouse ? [{ spouseName: d.spouse }] : []);

    if (marriages.length) {
      const parts = marriages.map(m => {
        let s = escHtml(m.spouseName || '');
        if (m.married)  s += ` (m.&nbsp;${escHtml(String(m.married))}`;
        if (m.divorced) s += `, div.&nbsp;${escHtml(String(m.divorced))}`;
        if (m.married)  s += ')';
        return s;
      }).filter(Boolean);
      marriagesEl.innerHTML = parts.length
        ? '<strong>Married:</strong> ' + parts.join('; ')
        : '';
    } else {
      marriagesEl.textContent = '';
    }

    const linkEl = document.getElementById('detail-link');
    if (d.url) {
      linkEl.href = d.url;
      linkEl.style.display = 'inline-block';
    } else {
      linkEl.style.display = 'none';
    }

    detailPanel.classList.add('visible');
  }

  function hideDetail() {
    detailPanel.classList.remove('visible');
    if (gNodes) gNodes.selectAll('circle').attr('stroke-width', 1.5);
  }

  document.getElementById('detail-close').addEventListener('click', hideDetail);

  // ── Graph construction ───────────────────────────────────────────────────────

  function buildGraph(nodes, links) {
    if (simulation) simulation.stop();

    const w = container.clientWidth  || 900;
    const h = container.clientHeight || Math.round(window.innerHeight * 0.76);

    d3.select(container).select('svg').remove();

    svg = d3.select(container)
      .insert('svg', '#person-detail')
      .attr('width',  w)
      .attr('height', h);

    // Arrow marker for parent→child links
    svg.append('defs').append('marker')
      .attr('id',          'pc-arrow')
      .attr('viewBox',     '0 -4 8 8')
      .attr('refX',        NODE_R + 6)
      .attr('refY',        0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient',      'auto')
      .append('path')
        .attr('d',    'M0,-4L8,0L0,4')
        .attr('fill', '#b0a090');

    const zoom = d3.zoom()
      .scaleExtent([0.08, 5])
      .on('zoom', e => g.attr('transform', e.transform));

    svg.call(zoom)
      .on('click', () => hideDetail());

    const g = svg.append('g');

    gLinks = g.append('g').attr('class', 'links');
    gNodes = g.append('g').attr('class', 'nodes');

    // ── Simulation ─────────────────────────────────────────────────────────────

    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(d => d.type === 'spouse' ? 58 : 75)
        .strength(d => d.type === 'spouse' ? 0.7 : 0.55)
      )
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center',  d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide(NODE_R + 5).iterations(2));

    // ── Links ──────────────────────────────────────────────────────────────────

    const linkSel = gLinks.selectAll('line')
      .data(links, d => `${d.source}-${d.target}-${d.type}`)
      .join('line')
        .attr('stroke',           d => d.type === 'spouse' ? '#c8b0b0' : '#b0a090')
        .attr('stroke-width',     d => d.type === 'spouse' ? 1.2 : 1.5)
        .attr('stroke-dasharray', d => d.type === 'spouse' ? '4 3' : null)
        .attr('marker-end',       d => d.type === 'parent-child' ? 'url(#pc-arrow)' : null)
        .attr('stroke-opacity',   0.75);

    // ── Nodes ──────────────────────────────────────────────────────────────────

    const nodeSel = gNodes.selectAll('g.node')
      .data(nodes, d => d.id)
      .join('g')
        .attr('class', 'node')
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
        )
        .on('click', (event, d) => {
          event.stopPropagation();
          gNodes.selectAll('circle').attr('stroke-width', 1.5);
          d3.select(event.currentTarget).select('circle').attr('stroke-width', 3);
          showDetail(d);
        });

    nodeSel.append('circle')
      .attr('r',            NODE_R)
      .attr('fill',         d => nodeColor(d))
      .attr('stroke',       d => (BRANCH[d.branch] || BRANCH.unknown).dark)
      .attr('stroke-width', 1.5);

    nodeSel.append('text')
      .attr('text-anchor',      'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size',         '8.5px')
      .attr('font-family',       'Inter, sans-serif')
      .attr('font-weight',       '500')
      .attr('fill',              d => contrastText(nodeColor(d)))
      .attr('pointer-events',    'none')
      .text(d => shortName(d.name));

    // ── Tick ───────────────────────────────────────────────────────────────────

    simulation.on('tick', () => {
      linkSel
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  // ── Filter & refresh ─────────────────────────────────────────────────────────

  function refresh() {
    const visibleNodes = allNodes.filter(
      n => activeFilters.has(n.branch) || n.branch === 'unknown'
    );
    const visibleIds = new Set(visibleNodes.map(n => n.id));

    const allLinksOriginal = [...parentChildLinks, ...spouseLinks];
    const visibleLinks = allLinksOriginal.filter(
      l => visibleIds.has(l.source) && visibleIds.has(l.target)
    );

    // Fresh copies — D3 forceLink mutates source/target from strings to objects
    const nodesCopy = visibleNodes.map(n => ({ ...n }));
    const linksCopy = visibleLinks.map(l => ({ source: l.source, target: l.target, type: l.type }));

    buildGraph(nodesCopy, linksCopy);
    hideDetail();

    statsEl.textContent = `${visibleNodes.length} people · ${visibleLinks.length} connections`;
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    if (!gNodes || !gLinks) return;

    if (!q) {
      gNodes.selectAll('g.node').select('circle').attr('opacity', 1).attr('stroke-width', 1.5);
      gNodes.selectAll('g.node').select('text').attr('opacity', 1);
      gLinks.selectAll('line').attr('opacity', 0.75);
      return;
    }

    const matched = new Set();
    allNodes.forEach(n => {
      if ((n.name || '').toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) {
        matched.add(n.id);
      }
    });

    gNodes.selectAll('g.node').each(function (d) {
      const hit = matched.has(d.id);
      d3.select(this).select('circle')
        .attr('opacity',      hit ? 1 : 0.18)
        .attr('stroke-width', hit ? 3 : 1.5);
      d3.select(this).select('text').attr('opacity', hit ? 1 : 0.18);
    });

    gLinks.selectAll('line').attr('opacity', 0.08);
  });

  // ── Branch filter pills ───────────────────────────────────────────────────────

  const BRANCHES = ['fortney', 'sodergren', 'mulhearn', 'andersen'];

  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const branch = btn.dataset.branch;

      if (branch === 'all') {
        const allOn = BRANCHES.every(b => activeFilters.has(b));
        BRANCHES.forEach(b => allOn ? activeFilters.delete(b) : activeFilters.add(b));
        document.querySelectorAll('.filter-pill').forEach(p => {
          p.classList.toggle('active', !allOn);
        });
      } else {
        if (activeFilters.has(branch)) {
          activeFilters.delete(branch);
          btn.classList.remove('active');
        } else {
          activeFilters.add(branch);
          btn.classList.add('active');
        }
        const allBtn = document.querySelector('.filter-pill[data-branch="all"]');
        allBtn.classList.toggle('active', BRANCHES.every(b => activeFilters.has(b)));
      }

      refresh();
    });
  });

  // ── Init ──────────────────────────────────────────────────────────────────────

  async function init() {
    statsEl.textContent = 'Loading…';

    const resp = await fetch('data/family.json');
    if (!resp.ok) throw new Error('Could not load data/family.json');
    const root = await resp.json();

    const flat = flattenFamily(root);
    allNodes          = flat.nodes;
    parentChildLinks  = flat.parentChildLinks;
    spouseLinks       = flat.spouseLinks;

    refresh();
  }

  init().catch(err => {
    statsEl.textContent = 'Error loading graph: ' + err.message;
    console.error(err);
  });
})();
