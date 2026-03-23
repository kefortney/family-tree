/* ============================================================
   Fortney Family Tree — D3 v7 Collapsible Tree Visualization
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
    mulhearn:  'Mulhearn / O\'Brien',
    andersen:  'Andersen',
  };

  let treeData   = null;
  let svg, g;
  let root;
  let width  = 0;
  let height = 600;
  const MARGIN        = { top: 30, right: 220, bottom: 30, left: 60 };
  const NODE_RADIUS   = 6;
  const BRANCH_RADIUS = 9;
  let nodeId = 0;
  let currentBranch = 'fortney';
  let personById = new Map();

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

  // ── Init ───────────────────────────────────────────────────

  function init() {
    if (!container) return;

    container.innerHTML = '';

    const rect = container.getBoundingClientRect();
    width  = rect.width  || 900;
    height = rect.height || 620;

    svg = d3.select('#tree-container')
      .append('svg')
      .attr('width', '100%')
      .attr('height', height)
      .call(
        d3.zoom()
          .scaleExtent([0.15, 3])
          .on('zoom', (event) => g.attr('transform', event.transform))
      );

    svg.on('click', () => detailPanel?.classList.remove('visible'));

    g = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Cache-bust so browsers always load the latest family.json
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
          '</div>'
        ].join('');
        console.error('Tree load error:', err);
      });
  }

  // ── Build / filter tree ────────────────────────────────────

  function buildTree(branchFilter) {
    currentBranch = branchFilter;
    g.selectAll('*').remove();
    nodeId = 0;

    if (branchFilter === 'all') {
      // Use full data but the virtual root node will be hidden in rendering
      root = d3.hierarchy(treeData);
      root.x0 = (height - MARGIN.top - MARGIN.bottom) / 2;
      root.y0 = 0;
      root.children.forEach(collapse);
    } else {
      // Find just this branch and use it as the root — no parent "Fortney Family Heritage" node
      const branchData = treeData.children
        ? treeData.children.find(c => c.id === branchFilter + '_branch')
        : null;
      if (!branchData) return;

      root = d3.hierarchy(branchData);
      root.x0 = (height - MARGIN.top - MARGIN.bottom) / 2;
      root.y0 = 0;

      // Show the branch node's direct children; collapse their subtrees
      if (root.children) {
        root.children.forEach(child => collapse(child));
      }
    }

    update(root);

    document.querySelectorAll('.branch-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.branch === branchFilter);
    });
  }

  // Expose for inline onclick in index.html
  window.filterBranchTree = buildTree;

  // ── D3 update ──────────────────────────────────────────────

  const NODE_SPACING_Y = 46;
  const NODE_SPACING_X = 210;
  const UNION_OFFSET_Y = 64;
  const SPOUSE_STACK_X = 22;

  function update(source) {
    const isAllMode = currentBranch === 'all';

    const layout = d3.tree().nodeSize([NODE_SPACING_Y, NODE_SPACING_X]);
    layout(root);

    const nodes = root.descendants();
    const links = root.links();
    const nodeById = new Map(nodes.map(n => [n.data?.id, n]));

    // Re-anchor spouse-only records that were added at branch root level
    // but actually belong to a deeper partner node.
    const reanchoredSpouseIds = new Set();
    nodes.forEach(n => {
      if (!n?.data?.id) return;
      if (n.data.type === 'root' || n.data.type === 'branch') return;

      const spouseId = (n.data.spouseId || '').trim();
      if (!spouseId) return;

      const spouseNode = nodeById.get(spouseId);
      if (!spouseNode) return;

      const hasChildren = ((n.children && n.children.length) || (n._children && n._children.length));
      if (hasChildren) return;

      const isBranchLevel = n.parent?.data?.type === 'branch';
      const spouseIsDeeper = spouseNode.depth > n.depth;
      if (isBranchLevel && spouseIsDeeper) {
        reanchoredSpouseIds.add(n.data.id);
      }
    });

    // In all-branches mode, omit the virtual root (depth 0) from extents and links
    const visibleNodes = (isAllMode ? nodes.filter(d => d.depth > 0) : nodes)
      .filter(d => !reanchoredSpouseIds.has(d.data?.id));
    const visibleLinks = (isAllMode ? links.filter(d => d.source.depth > 0) : links)
      .filter(d => !reanchoredSpouseIds.has(d.source.data?.id) && !reanchoredSpouseIds.has(d.target.data?.id));
    const visibleById  = new Map(visibleNodes.map(n => [n.data.id, n]));

    const spouseUnits = [];
    const spouseSeen = new Set();
    visibleNodes.forEach((n, idx) => {
      if (!n?.data?.id) return;
      if (n.data.type === 'root' || n.data.type === 'branch') return;

      const spouseId = (n.data.spouseId || '').trim();
      const spouseText = (n.data.spouse || '').trim();
      if (!spouseId && !spouseText) return;

      const pairKey = spouseId
        ? [n.data.id, spouseId].sort().join('|')
        : `${n.data.id}|ext:${spouseText.toLowerCase()}`;
      if (spouseSeen.has(pairKey)) return;
      spouseSeen.add(pairKey);

      const spouseRecord = spouseId ? personById.get(spouseId) : null;
      const spouseLabel = spouseRecord?.name || spouseText || spouseId;
      const sign = idx % 2 === 0 ? -1 : 1;

      spouseUnits.push({
        id: pairKey,
        person: n,
        spouseId,
        spouseLabel,
        unionX: n.x,
        unionY: n.y + UNION_OFFSET_Y,
        spouseX: n.x + sign * SPOUSE_STACK_X,
        spouseY: n.y,
        color: colorFor(n).stroke,
      });
    });

    const unionByPersonId = new Map(spouseUnits.map(u => [u.person.data.id, u]));

    function linkWithUnion(d) {
      const unit = unionByPersonId.get(d.source?.data?.id);
      const sourceNode = unit ? { x: unit.unionX, y: unit.unionY } : d.source;
      return diagonal({ source: sourceNode, target: d.target });
    }

    const xExtent = d3.extent(visibleNodes, d => d.x);
    const yExtent = d3.extent(visibleNodes, d => d.y);
    const treeH   = Math.max(xExtent[1] - xExtent[0] + MARGIN.top + MARGIN.bottom + 40, 400);
    const treeW   = yExtent[1] + MARGIN.left + MARGIN.right + 200;

    svg.attr('height', treeH).attr('width', Math.max(treeW, width));

    if (source === root) {
      // In all-branches mode, shift left so the hidden root is off-screen
      const leftShift = isAllMode ? MARGIN.left - NODE_SPACING_X : MARGIN.left;
      g.attr('transform', `translate(${leftShift},${MARGIN.top - xExtent[0]})`);
    }

    // ── Links ──────────────────────────────────────────────
    const link      = g.selectAll('path.link').data(visibleLinks, d => d.target.id);
    const linkEnter = link.enter().append('path').attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x0, y: source.y0 };
        return diagonal({ source: o, target: o });
      });

    link.merge(linkEnter)
      .transition().duration(350)
      .attr('d', linkWithUnion)
      .attr('stroke', d => {
        const c = BRANCH_COLORS[d.target.data.branch] || BRANCH_COLORS.root;
        return c.stroke + '55';
      });

    link.exit()
      .transition().duration(350)
      .attr('d', () => {
        const o = { x: source.x, y: source.y };
        return diagonal({ source: o, target: o });
      })
      .remove();

    // ── Union + spouse display ─────────────────────────
    const unionSel = g.selectAll('g.union-unit').data(spouseUnits, d => d.id);
    const unionEnter = unionSel.enter()
      .append('g')
      .attr('class', 'union-unit');

    unionEnter.append('line').attr('class', 'union-person-link').attr('stroke-width', 1.2).attr('opacity', 0.85);
    unionEnter.append('line').attr('class', 'union-spouse-link').attr('stroke-width', 1.2).attr('stroke-dasharray', '3,2').attr('opacity', 0.8);
    unionEnter.append('circle').attr('class', 'union-node').attr('r', 3.3).attr('stroke-width', 1.2);
    unionEnter.append('circle').attr('class', 'spouse-proxy').attr('r', NODE_RADIUS - 1).attr('stroke-width', 1.2);
    unionEnter.append('text').attr('class', 'spouse-label').attr('dy', '0.35em');

    const unionUpdate = unionSel.merge(unionEnter);

    unionUpdate.select('line.union-person-link')
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('x1', d => d.person.y)
      .attr('y1', d => d.person.x)
      .attr('x2', d => d.unionY)
      .attr('y2', d => d.unionX);

    unionUpdate.select('line.union-spouse-link')
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('x1', d => d.spouseY)
      .attr('y1', d => d.spouseX)
      .attr('x2', d => d.unionY)
      .attr('y2', d => d.unionX);

    unionUpdate.select('circle.union-node')
      .attr('fill', '#ffffff')
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('cx', d => d.unionY)
      .attr('cy', d => d.unionX);

    unionUpdate.select('circle.spouse-proxy')
      .attr('fill', '#ffffff')
      .attr('stroke', d => d.color)
      .transition().duration(350)
      .attr('cx', d => d.spouseY)
      .attr('cy', d => d.spouseX);

    unionUpdate.select('text.spouse-label')
      .style('font-size', '10px')
      .style('fill', '#5c3d2e')
      .style('font-weight', '500')
      .attr('text-anchor', 'end')
      .text(d => (d.spouseLabel || '').length > 30 ? `${d.spouseLabel.slice(0, 28)}…` : d.spouseLabel)
      .transition().duration(350)
      .attr('x', d => d.spouseY - 10)
      .attr('y', d => d.spouseX);

    unionSel.exit().remove();

    // ── Nodes ──────────────────────────────────────────────
    const node      = g.selectAll('g.node').data(visibleNodes, d => d.id || (d.id = ++nodeId));
    const nodeEnter = node.enter().append('g')
      .attr('class', d => `node branch-${d.data.branch || 'root'} type-${d.data.type || 'person'}`)
      .attr('transform', `translate(${source.y0},${source.x0})`)
      .style('cursor', 'pointer')
      .style('opacity', d => (isAllMode && d.depth === 0) ? 0 : 1)
      .style('pointer-events', d => (isAllMode && d.depth === 0) ? 'none' : null)
      .on('click', (event, d) => {
        event.stopPropagation();
        toggleNode(d);
        showDetail(d);
      });

    nodeEnter.append('circle');
    nodeEnter.append('text').attr('class', 'collapse-indicator')
      .attr('dy', '0.35em').attr('text-anchor', 'middle')
      .style('font-size', '8px').style('pointer-events', 'none');
    nodeEnter.append('text').attr('class', 'node-label');

    const nodeUpdate = node.merge(nodeEnter);

    nodeUpdate.transition().duration(350)
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('opacity', d => (isAllMode && d.depth === 0) ? 0 : 1);

    nodeUpdate.style('pointer-events', d => (isAllMode && d.depth === 0) ? 'none' : null);

    nodeUpdate.select('circle')
      .attr('r',      d => (d.data.type === 'branch' || d.data.type === 'root') ? BRANCH_RADIUS : NODE_RADIUS)
      .attr('fill',   d => colorFor(d).fill)
      .attr('stroke', d => colorFor(d).stroke);

    nodeUpdate.select('text.collapse-indicator')
      .style('fill', d => colorFor(d).stroke)
      .text(d => d._children ? '▶' : d.children ? '▼' : '');

    nodeUpdate.select('text.node-label')
      .style('font-size',   d => (d.data.type === 'branch' || d.data.type === 'root') ? '12px' : '10.5px')
      .style('font-weight', d => (d.data.type === 'branch' || d.data.type === 'root') ? '600'  : '400')
      .style('fill',        d => colorFor(d).text)
      .each(function (d) {
        const el       = d3.select(this);
        const hasKids  = !!(d.children || d._children);
        const xVal     = hasKids ? -14 : 14;
        const anchor   = hasKids ? 'end' : 'start';

        el.attr('x', xVal).attr('text-anchor', anchor);

        el.selectAll('tspan').remove();

        const name = d.data.name || '';
        el.append('tspan')
          .attr('x', xVal).attr('dy', '0.35em')
          .text(name.length > 32 ? name.slice(0, 30) + '…' : name);

        if (d.data.birth || d.data.death) {
          const b  = d.data.birth  || '';
          const de = d.data.death  || '';
          const txt = (b && de) ? `${b}–${de}` : b ? `b. ${b}` : `d. ${de}`;
          el.append('tspan')
            .attr('x', xVal).attr('dy', '1.2em')
            .style('font-size', '9px').style('fill', '#8b6b52').style('font-weight', '400')
            .text(txt);
        }
      });

    node.exit()
      .transition().duration(350)
      .attr('transform', `translate(${source.y},${source.x})`)
      .remove();

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
  }

  // ── Bezier link path ───────────────────────────────────────

  function diagonal(d) {
    const mx = (d.source.y + d.target.y) / 2;
    return `M${d.source.y},${d.source.x}C${mx},${d.source.x} ${mx},${d.target.x} ${d.target.y},${d.target.x}`;
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

    // Don't show detail for branch/root grouping nodes
    if (data.type === 'root' || data.type === 'branch') return;

    let dates = '';
    if (data.birth || data.death) {
      if (data.birth) dates += `b. ${data.birth}`;
      if (data.birthplace) dates += ` · ${data.birthplace}`;
      if (data.death) dates += `\nd. ${data.death}`;
      if (data.deathplace) dates += ` · ${data.deathplace}`;
    }
    let spouseText = '';
    if (data.spouseId && personById.has(data.spouseId)) {
      spouseText = personById.get(data.spouseId).name || data.spouseId;
    } else if (data.spouseId) {
      spouseText = data.spouseId;
    } else if (data.spouse) {
      spouseText = data.spouse;
    }
    if (spouseText) dates += (dates ? '\n' : '') + `m. ${spouseText}`;

    detailPanel.querySelector('#detail-name').textContent  = data.name  || '';
    detailPanel.querySelector('#detail-dates').textContent = dates;
    detailPanel.querySelector('#detail-notes').textContent = data.notes || '';

    const branchEl = detailPanel.querySelector('#detail-branch');
    if (data.branch && BRANCH_LABELS[data.branch]) {
      branchEl.textContent  = BRANCH_LABELS[data.branch];
      branchEl.className    = `branch-badge ${data.branch}`;
      branchEl.style.display = 'inline-block';
    } else {
      branchEl.style.display = 'none';
    }

    const linkEl = detailPanel.querySelector('#detail-link');
    if (data.url) {
      linkEl.href = data.url;
      linkEl.textContent  = 'View full story →';
      linkEl.style.display = 'inline-block';
    } else if (data.branch) {
      linkEl.href = `${data.branch}.html`;
      linkEl.textContent  = `View ${BRANCH_LABELS[data.branch] || data.branch} story →`;
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
      if (currentBranch === 'all') {
        root.children?.forEach(collapse);
      } else {
        root.children?.forEach(collapse);
      }
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

