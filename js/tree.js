/* ============================================================
   Fortney Family Tree — D3 v7 Radial Tree Visualization
   Oldest ancestor at center, descendants expanding outward.
   ============================================================ */

(function () {
  const BRANCH_COLORS = {
    fortney:  { stroke: '#1d3a6c', fill: '#e8edf5', text: '#1d3a6c' },
    sodergren:{ stroke: '#2d6e5e', fill: '#e6f0ee', text: '#2d6e5e' },
    mulhearn: { stroke: '#3a5c2d', fill: '#e8f0e5', text: '#3a5c2d' },
    andersen: { stroke: '#7a2b3a', fill: '#f0e6e8', text: '#7a2b3a' },
    root:     { stroke: '#b8962e', fill: '#faf6ef', text: '#2c1a10' },
    branch:   { stroke: '#5c3d2e', fill: '#f0e9da', text: '#2c1a10' },
  };

  const BRANCH_LABELS = {
    fortney:   'Fortney / Forthun',
    sodergren: 'Södergren',
    mulhearn:  "Mulhearn / O'Brien",
    andersen:  'Andersen',
  };

  // Layout constants
  const RING_SPACING = 140;   // pixels between each generation ring
  const MIN_RADIUS   = 100;   // minimum inner radius
  const NODE_RADIUS  = 6;
  const BRANCH_RADIUS = 9;

  let treeData = null;
  let svg, g, zoomBehavior;
  let root;
  let currentBranch = 'fortney';
  let personById = new Map();
  let svgW = 900;
  let svgH = 700;

  const detailPanel = document.getElementById('person-detail');
  const container   = document.getElementById('tree-container');

  // ── Helpers ────────────────────────────────────────────────

  function colorFor(d) {
    if (d.data.type === 'root')   return BRANCH_COLORS.root;
    if (d.data.type === 'branch') return BRANCH_COLORS.branch;
    return BRANCH_COLORS[d.data.branch] || BRANCH_COLORS.root;
  }

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  function expandAll(d) {
    if (d._children) {
      d.children  = d._children;
      d._children = null;
    }
    if (d.children) d.children.forEach(expandAll);
  }

  function rebuildPersonLookup() {
    personById = new Map();
    if (!treeData) return;
    (function walk(node) {
      if (node && node.id) personById.set(node.id, node);
      (node.children || []).forEach(walk);
    })(treeData);
  }

  /**
   * Get all marriages for a node.
   * Supports new `marriages` array format and legacy `spouse`/`spouseId` fields.
   */
  function getMarriages(data) {
    if (data.marriages && data.marriages.length > 0) {
      return data.marriages;
    }
    const result = [];
    const spouseRecord = data.spouseId ? personById.get(data.spouseId) : null;
    const spouseName = (spouseRecord && spouseRecord.name) || data.spouse || '';
    if (spouseName || data.spouseId) {
      result.push({
        spouseName: spouseName || data.spouseId || '',
        spouseId: data.spouseId || null,
      });
    }
    return result;
  }

  // Convert D3 radial coords (angle, radius) → Cartesian (x, y)
  function radialXY(node) {
    return [
      node.y * Math.cos(node.x - Math.PI / 2),
      node.y * Math.sin(node.x - Math.PI / 2),
    ];
  }

  // ── Init ───────────────────────────────────────────────────

  function init() {
    if (!container) return;
    container.innerHTML = '';

    const rect = container.getBoundingClientRect();
    svgW = rect.width  || 900;
    svgH = Math.max(rect.height || 700, 600);

    svg = d3.select('#tree-container')
      .append('svg')
      .attr('width',  '100%')
      .attr('height', svgH);

    g = svg.append('g');

    zoomBehavior = d3.zoom()
      .scaleExtent([0.08, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoomBehavior);

    // Click on blank canvas closes the detail panel
    svg.on('click', () => detailPanel?.classList.remove('visible'));

    // Cache-bust so browsers always load latest family.json
    fetch('data/family.json?v=' + Date.now())
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        treeData = data;
        rebuildPersonLookup();
        buildTree(currentBranch);
        setupControls();
      })
      .catch(err => {
        container.innerHTML = [
          '<div style="padding:2rem;text-align:center;color:#8b6b52;font-family:Inter,sans-serif;">',
          '<strong>Unable to load family data.</strong><br>',
          'Run this page from a local server: <code>python serve.py</code>',
          '</div>',
        ].join('');
        console.error('Tree load error:', err);
      });
  }

  // ── Build / filter tree ────────────────────────────────────

  function buildTree(branchFilter) {
    currentBranch = branchFilter;
    g.selectAll('*').remove();

    if (branchFilter === 'all') {
      root = d3.hierarchy(treeData);
      root.children?.forEach(collapse);
    } else {
      const branchData = treeData.children
        ? treeData.children.find(c => c.id === branchFilter + '_branch')
        : null;
      if (!branchData) return;
      root = d3.hierarchy(branchData);
      // Show the branch's direct children collapsed
      if (root.children) {
        root.children.forEach(child => collapse(child));
      }
    }

    // Center the view
    centerView();
    update(root);

    document.querySelectorAll('.branch-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.branch === branchFilter);
    });
  }

  // Expose for inline onclick in index.html
  window.filterBranchTree = buildTree;

  function centerView() {
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(svgW / 2, svgH / 2)
    );
  }

  // ── D3 radial update ───────────────────────────────────────

  function update(source) {
    const isAllMode = currentBranch === 'all';

    // Determine the max visible depth to set the radius
    const allNodes = root.descendants();
    const maxDepth = d3.max(allNodes.filter(d => !(isAllMode && d.depth === 0)), d => d.depth) || 1;
    const radius   = Math.max(maxDepth * RING_SPACING, MIN_RADIUS);

    // Run the radial tree layout
    const treeLayout = d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / Math.max(a.depth, 1));
    treeLayout(root);

    const nodes = allNodes;
    const links = root.links();

    // In all-branches mode, hide the virtual root
    const visibleNodes = (isAllMode ? nodes.filter(d => d.depth > 0) : nodes);
    const visibleLinks = (isAllMode ? links.filter(d => d.source.depth > 0) : links);

    // Build a map so spouseUnits can look up node positions
    const nodeById = new Map(nodes.map(n => [n.data?.id, n]));

    // ── Spouse / marriage display ───────────────────────
    const spouseUnits = [];
    const spouseSeen = new Set();

    visibleNodes.forEach(n => {
      if (!n?.data?.id) return;
      if (n.data.type === 'root' || n.data.type === 'branch') return;

      const marriages = getMarriages(n.data);
      marriages.forEach((m, mi) => {
        const label = m.spouseName || m.spouseId || '';
        if (!label) return;

        // Deduplicate linked (in-tree) spouse pairs
        const pairKey = m.spouseId
          ? [n.data.id, m.spouseId].sort().join('|')
          : `${n.data.id}|ext:${label.toLowerCase()}|${mi}`;
        if (spouseSeen.has(pairKey)) return;
        spouseSeen.add(pairKey);

        // If spouse is also in the tree, skip rendering here — they have their own node
        if (m.spouseId && nodeById.has(m.spouseId)) return;

        const [nx, ny] = radialXY(n);

        // Place external spouse slightly outward and offset angularly
        const angleOff = mi % 2 === 0 ? 0.18 : -0.18;
        const sa = n.x + angleOff;
        const sr = n.y + 50;
        const sx = sr * Math.cos(sa - Math.PI / 2);
        const sy = sr * Math.sin(sa - Math.PI / 2);

        spouseUnits.push({
          id: pairKey,
          nx, ny, sx, sy,
          label,
          color: colorFor(n).stroke,
        });
      });
    });

    const unionSel    = g.selectAll('g.union-unit').data(spouseUnits, d => d.id);
    const unionEnter  = unionSel.enter().append('g').attr('class', 'union-unit');

    unionEnter.append('line').attr('class', 'union-line')
      .attr('stroke-dasharray', '3,2').attr('opacity', 0.75);
    unionEnter.append('circle').attr('class', 'spouse-proxy')
      .attr('r', 4.5).attr('fill', '#fff').attr('stroke-width', 1.5);
    unionEnter.append('text').attr('class', 'spouse-label')
      .style('font-size', '9px').style('fill', '#5c3d2e').style('font-weight', '500');

    const unionUpdate = unionSel.merge(unionEnter);

    unionUpdate.select('line.union-line')
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('x1', d => d.nx).attr('y1', d => d.ny)
      .attr('x2', d => d.sx).attr('y2', d => d.sy);

    unionUpdate.select('circle.spouse-proxy')
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('cx', d => d.sx).attr('cy', d => d.sy);

    unionUpdate.select('text.spouse-label')
      .attr('dy', '0.35em')
      .text(d => d.label.length > 28 ? d.label.slice(0, 26) + '…' : d.label)
      .transition().duration(350)
      .attr('x', d => d.sx + (d.sx >= 0 ? 8 : -8))
      .attr('y', d => d.sy)
      .attr('text-anchor', d => d.sx >= 0 ? 'start' : 'end');

    unionSel.exit().remove();

    // ── Links ───────────────────────────────────────────
    const radialLink = d3.linkRadial()
      .angle(d => d.x)
      .radius(d => d.y);

    const link      = g.selectAll('path.link').data(visibleLinks, d => (d.source.data?.id || '') + '>' + (d.target.data?.id || ''));
    const linkEnter = link.enter().append('path').attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x || 0, y: source.y || 0 };
        return radialLink({ source: o, target: o });
      });

    link.merge(linkEnter)
      .transition().duration(350)
      .attr('d', radialLink)
      .attr('stroke', d => {
        const c = BRANCH_COLORS[d.target.data.branch] || BRANCH_COLORS.root;
        return c.stroke + '55';
      });

    link.exit()
      .transition().duration(350)
      .attr('d', () => {
        const o = { x: source.x || 0, y: source.y || 0 };
        return radialLink({ source: o, target: o });
      })
      .remove();

    // ── Nodes ───────────────────────────────────────────
    const node = g.selectAll('g.node').data(visibleNodes, d => d.data?.id || (d.data?.type + '-' + d.depth));

    const nodeEnter = node.enter().append('g')
      .attr('class', d => `node branch-${d.data.branch || 'root'} type-${d.data.type || 'person'}`)
      .attr('transform', () => {
        // Enter from parent's position
        const [px, py] = radialXY(source);
        return `translate(${px},${py})`;
      })
      .style('opacity', 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        toggleNode(d);
        showDetail(d);
      });

    nodeEnter.append('circle');
    nodeEnter.append('text').attr('class', 'collapse-indicator')
      .attr('dy', '0.35em').attr('text-anchor', 'middle')
      .style('font-size', '9px').style('pointer-events', 'none');
    nodeEnter.append('text').attr('class', 'node-label').style('pointer-events', 'none');

    const nodeUpdate = node.merge(nodeEnter);

    nodeUpdate.transition().duration(350)
      .style('opacity', d => (isAllMode && d.depth === 0) ? 0 : 1)
      .attr('transform', d => {
        const [px, py] = radialXY(d);
        return `translate(${px},${py})`;
      });

    nodeUpdate.style('pointer-events', d => (isAllMode && d.depth === 0) ? 'none' : null);

    nodeUpdate.select('circle')
      .attr('r',      d => (d.data.type === 'branch' || d.data.type === 'root') ? BRANCH_RADIUS : NODE_RADIUS)
      .attr('fill',   d => colorFor(d).fill)
      .attr('stroke', d => colorFor(d).stroke);

    nodeUpdate.select('text.collapse-indicator')
      .style('fill', d => colorFor(d).stroke)
      .text(d => d._children ? '+' : '');

    nodeUpdate.select('text.node-label')
      .style('font-size',   d => (d.data.type === 'branch' || d.data.type === 'root') ? '12px' : '10.5px')
      .style('font-weight', d => (d.data.type === 'branch' || d.data.type === 'root') ? '600' : '400')
      .style('fill', d => colorFor(d).text)
      .each(function (d) {
        const el = d3.select(this);
        el.selectAll('tspan').remove();

        // Root node: centered label above the dot
        if (d.y === 0) {
          el.attr('text-anchor', 'middle');
          el.append('tspan')
            .attr('x', 0).attr('dy', `${-(BRANCH_RADIUS + 5)}px`)
            .text(d.data.name || '');
          return;
        }

        // Determine which side of the circle this node falls on
        const cosA  = Math.cos(d.x - Math.PI / 2);
        const isRight = cosA >= 0;
        const xOff  = isRight ? (NODE_RADIUS + 5) : -(NODE_RADIUS + 5);
        const anchor = isRight ? 'start' : 'end';

        el.attr('text-anchor', anchor);

        const name = d.data.name || '';
        el.append('tspan')
          .attr('x', xOff).attr('dy', '0.35em')
          .text(name.length > 28 ? name.slice(0, 26) + '…' : name);

        if (d.data.birth || d.data.death) {
          const b  = d.data.birth  || '';
          const de = d.data.death  || '';
          const txt = (b && de) ? `${b}–${de}` : b ? `b.${b}` : `d.${de}`;
          el.append('tspan')
            .attr('x', xOff).attr('dy', '1.1em')
            .style('font-size', '8.5px').style('fill', '#8b6b52').style('font-weight', '400')
            .text(txt);
        }
      });

    node.exit()
      .transition().duration(350)
      .style('opacity', 0)
      .attr('transform', () => {
        const [px, py] = radialXY(source);
        return `translate(${px},${py})`;
      })
      .remove();

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
  }

  // ── Toggle expand/collapse ─────────────────────────────────

  function toggleNode(d) {
    if (d.children) {
      d._children = d.children;
      d.children  = null;
    } else if (d._children) {
      d.children  = d._children;
      d._children = null;
    }
    update(d);
  }

  // ── Detail panel ───────────────────────────────────────────

  function showDetail(d) {
    if (!detailPanel) return;
    const data = d.data;
    if (data.type === 'root' || data.type === 'branch') return;

    let dates = '';
    if (data.birth || data.death) {
      if (data.birth) dates += `b. ${data.birth}`;
      if (data.birthplace) dates += ` · ${data.birthplace}`;
      if (data.death) dates += `\nd. ${data.death}`;
      if (data.deathplace) dates += ` · ${data.deathplace}`;
    }

    const marriages = getMarriages(data);
    marriages.forEach(m => {
      const name = m.spouseName || (m.spouseId && personById.get(m.spouseId)?.name) || m.spouseId || '';
      if (!name) return;
      let line = `m. ${name}`;
      if (m.married) line += ` (${m.married}${m.divorced ? `–${m.divorced}` : ''})`;
      dates += (dates ? '\n' : '') + line;
    });

    detailPanel.querySelector('#detail-name').textContent  = data.name  || '';
    detailPanel.querySelector('#detail-dates').textContent = dates;
    detailPanel.querySelector('#detail-notes').textContent = data.notes || '';

    const branchEl = detailPanel.querySelector('#detail-branch');
    if (data.branch && BRANCH_LABELS[data.branch]) {
      branchEl.textContent   = BRANCH_LABELS[data.branch];
      branchEl.className     = `branch-badge ${data.branch}`;
      branchEl.style.display = 'inline-block';
    } else {
      branchEl.style.display = 'none';
    }

    const linkEl = detailPanel.querySelector('#detail-link');
    if (data.url) {
      linkEl.href = data.url;
      linkEl.textContent   = 'View full story →';
      linkEl.style.display = 'inline-block';
    } else if (data.branch) {
      linkEl.href = `${data.branch}.html`;
      linkEl.textContent   = `View ${BRANCH_LABELS[data.branch] || data.branch} story →`;
      linkEl.style.display = 'inline-block';
    } else {
      linkEl.style.display = 'none';
    }

    detailPanel.classList.add('visible');
  }

  // ── Controls ───────────────────────────────────────────────

  function setupControls() {
    document.getElementById('btn-expand-all')?.addEventListener('click', () => {
      expandAll(root);
      update(root);
    });

    document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
      root.children?.forEach(collapse);
      update(root);
    });

    document.getElementById('detail-close')?.addEventListener('click', () =>
      detailPanel?.classList.remove('visible')
    );
  }

  // ── Bootstrap ─────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
