/* ============================================================
  Fortney Family Tree — D3 v7 Vertical Tree Visualization
  Oldest ancestor at top, descendants progressing downward.
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
  const LEVEL_GAP     = 50;   // pixels between generation rows
  const SIBLING_GAP   = 76;   // horizontal spacing hint between siblings
  const TOP_PADDING   = 28;
  const NODE_RADIUS   = 6;
  const BRANCH_RADIUS = 9;
  const SPOUSE_PAIR_GAP = 24;
  const EXTERNAL_SPOUSE_OFFSET = 26;

  let treeData = null;
  let svg, g, zoomBehavior;
  let root;
  let currentBranch = 'fortney+sodergren';
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

  /** Returns true for nodes that should never appear as standalone tree nodes —
   *  they are external spouses stored in the branch for admin editing only. */
  function isProxyOnly(data) {
    return data && data.proxyOnly === true;
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

  function nodeXY(node) {
    return [node.x, node.y];
  }

  function applySpouseCompaction(visibleNodes) {
    const byId = new Map(visibleNodes.map(n => [n.data?.id, n]));
    const seen = new Set();

    visibleNodes.forEach(n => {
      if (!n?.data?.id || n.data.type === 'root' || n.data.type === 'branch') return;

      getMarriages(n.data).forEach(m => {
        if (!m.spouseId) return;
        const partner = byId.get(m.spouseId);
        if (!partner) return;
        if (partner.depth !== n.depth) return;

        const key = [n.data.id, m.spouseId].sort().join('|');
        if (seen.has(key)) return;
        seen.add(key);

        const left = n.x <= partner.x ? n : partner;
        const right = n.x <= partner.x ? partner : n;
        const mid = (left.x + right.x) / 2;
        const targetGap = SPOUSE_PAIR_GAP;
        left.x = mid - (targetGap / 2);
        right.x = mid + (targetGap / 2);
      });
    });
  }

  function parseYear(value) {
    if (value === undefined || value === null) return Number.POSITIVE_INFINITY;
    const match = String(value).match(/\d{3,4}/);
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
  }

  function compareChronological(a, b) {
    const ay = parseYear(a.data?.birth);
    const by = parseYear(b.data?.birth);
    if (ay !== by) return ay - by;

    const an = (a.data?.name || '').toLowerCase();
    const bn = (b.data?.name || '').toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
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
      .scaleExtent([0.35, 4])
      .extent([[0, 0], [svgW, svgH]])
      .translateExtent([[-5000, -5000], [5000, 12000]])
      .filter((event) => {
        // Let normal page scrolling work; only zoom with Ctrl/Cmd + wheel.
        if (event.type === 'wheel') return !!(event.ctrlKey || event.metaKey);
        return !event.button;
      })
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
        buildTree('fortney+sodergren');
        setupControls();

        window.addEventListener('resize', () => {
          const r = container.getBoundingClientRect();
          svgW = r.width || svgW;
          centerView();
        });
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
    } else if (branchFilter.includes('+')) {
      // Combined multi-branch view: create a virtual root containing the requested branches
      const filters = branchFilter.split('+');
      const branches = (treeData.children || []).filter(
        c => c.type === 'branch' && filters.includes(c.branch)
      );
      if (branches.length === 0) return;
      const virtualRoot = { id: 'virtual-root', type: 'root', name: '', children: branches };
      root = d3.hierarchy(virtualRoot);
    } else {
      const branchData = treeData.children
        ? treeData.children.find(c => c.type === 'branch' && c.branch === branchFilter)
        : null;
      if (!branchData) return;
      root = d3.hierarchy(branchData);
    }

    root.x0 = 0;
    root.y0 = 0;

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
      d3.zoomIdentity.translate(svgW / 2, TOP_PADDING)
    );
  }

  // ── D3 radial update ───────────────────────────────────────

  function update(source) {
    const isAllMode = currentBranch === 'all' || currentBranch.includes('+');

    root.sort(compareChronological);

    const treeLayout = d3.tree().nodeSize([SIBLING_GAP, LEVEL_GAP]);
    treeLayout(root);

    const nodes = root.descendants();
    const links = root.links();

    // In all-branches/combined mode hide the virtual root; always hide proxyOnly nodes
    const visibleNodes = nodes.filter(d => {
      if (isAllMode && d.depth === 0) return false;
      return !isProxyOnly(d.data);
    });
    const visibleLinks = links.filter(d =>
      !(isAllMode && d.source.depth === 0) &&
      !isProxyOnly(d.target.data)
    );

    applySpouseCompaction(visibleNodes);

    // Build a map so spouseUnits can look up node positions
    const nodeById = new Map(visibleNodes.map(n => [n.data?.id, n]));
    const sourceX = source.x0 ?? source.x ?? 0;
    const sourceY = source.y0 ?? source.y ?? 0;

    // ── In-tree spouse links (short marriage connectors) ─────
    const marriageLinks = [];
    const marriageSeen = new Set();

    visibleNodes.forEach(n => {
      if (!n?.data?.id || n.data.type === 'root' || n.data.type === 'branch') return;

      getMarriages(n.data).forEach(m => {
        if (!m.spouseId) return;
        const spouseNode = nodeById.get(m.spouseId);
        if (!spouseNode) return;

        const pairKey = [n.data.id, m.spouseId].sort().join('|');
        if (marriageSeen.has(pairKey)) return;
        marriageSeen.add(pairKey);

        marriageLinks.push({
          id: pairKey,
          x1: n.x,
          y1: n.y,
          x2: spouseNode.x,
          y2: spouseNode.y,
          color: colorFor(n).stroke,
        });
      });
    });

    const marriageSel = g.selectAll('line.marriage-link').data(marriageLinks, d => d.id);

    marriageSel.enter()
      .append('line')
      .attr('class', 'marriage-link')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '1.5,2.5')
      .attr('opacity', 0.68)
      .attr('x1', sourceX)
      .attr('y1', sourceY)
      .attr('x2', sourceX)
      .attr('y2', sourceY)
      .merge(marriageSel)
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2);

    marriageSel.exit().remove();

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

        const [nx, ny] = nodeXY(n);

        // External spouses are rendered directly beside the person with a short link.
        const direction = (mi % 2 === 0) ? 1 : -1;
        const sx = nx + (direction * EXTERNAL_SPOUSE_OFFSET);
        const sy = ny;

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
      .attr('stroke-dasharray', '2,2').attr('opacity', 0.65);
    unionEnter.append('circle').attr('class', 'spouse-proxy')
      .attr('r', 4).attr('fill', '#fff').attr('stroke-width', 1.25);
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
      .attr('x', d => d.sx)
      .attr('y', d => d.sy - 10)
      .attr('text-anchor', 'middle');

    unionSel.exit().remove();

    // ── Links ───────────────────────────────────────────
    const verticalLink = d3.linkVertical()
      .x(d => d.x)
      .y(d => d.y);

    const link      = g.selectAll('path.link').data(visibleLinks, d => (d.source.data?.id || '') + '>' + (d.target.data?.id || ''));
    const linkEnter = link.enter().append('path').attr('class', 'link')
      .attr('d', () => {
        const o = { x: sourceX, y: sourceY };
        return verticalLink({ source: o, target: o });
      });

    link.merge(linkEnter)
      .transition().duration(350)
      .attr('d', verticalLink)
      .attr('stroke', '#5a5a5a');

    link.exit()
      .transition().duration(350)
      .attr('d', () => {
        const o = { x: sourceX, y: sourceY };
        return verticalLink({ source: o, target: o });
      })
      .remove();

    // ── Nodes ───────────────────────────────────────────
    const node = g.selectAll('g.node').data(visibleNodes, d => d.data?.id || (d.data?.type + '-' + d.depth));

    const nodeEnter = node.enter().append('g')
      .attr('class', d => `node branch-${d.data.branch || 'root'} type-${d.data.type || 'person'}`)
      .attr('transform', () => {
        // Enter from parent's position
        return `translate(${sourceX},${sourceY})`;
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
      .attr('transform', d => `translate(${d.x},${d.y})`);

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

        if (d.data.type === 'root' || d.data.type === 'branch') {
          el.attr('text-anchor', 'middle');
          el.append('tspan')
            .attr('x', 0).attr('dy', `${-(BRANCH_RADIUS + 5)}px`)
            .text(d.data.name || '');
          return;
        }

        el.attr('text-anchor', 'middle');

        const name = d.data.name || '';
        el.append('tspan')
          .attr('x', 0).attr('dy', `${NODE_RADIUS + 12}px`)
          .text(name.length > 28 ? name.slice(0, 26) + '…' : name);

        if (d.data.birth || d.data.death) {
          const b  = d.data.birth  || '';
          const de = d.data.death  || '';
          const txt = (b && de) ? `${b}–${de}` : b ? `b.${b}` : `d.${de}`;
          el.append('tspan')
            .attr('x', 0).attr('dy', '1.15em')
            .style('font-size', '8.5px').style('fill', '#8b6b52').style('font-weight', '400')
            .text(txt);
        }
      });

    node.exit()
      .transition().duration(350)
      .style('opacity', 0)
      .attr('transform', () => `translate(${sourceX},${sourceY})`)
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
