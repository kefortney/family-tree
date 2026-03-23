/* ============================================================
   Fortney Family Tree — D3 v7 Collapsible Tree Visualization
   ============================================================ */

(function () {
  const BRANCH_COLORS = {
    fortney:  { stroke: '#1d3a6c', fill: '#e8edf5', text: '#1d3a6c' },
    sodergren:{ stroke: '#2d6e5e', fill: '#e6f0ee', text: '#2d6e5e' },
    mulhearn: { stroke: '#3a5c2d', fill: '#e8f0e5', text: '#3a5c2d' },
    anderson: { stroke: '#7a2b3a', fill: '#f0e6e8', text: '#7a2b3a' },
    root:     { stroke: '#b8962e', fill: '#faf6ef', text: '#2c1a10' },
    branch:   { stroke: '#5c3d2e', fill: '#f0e9da', text: '#2c1a10' },
  };

  const BRANCH_LABELS = {
    fortney:   'Fortney / Forthun',
    sodergren: 'Södergren',
    mulhearn:  'Mulhearn / O\'Brien',
    anderson:  'Anderson',
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

  // ── Init ───────────────────────────────────────────────────

  function init() {
    if (!container) return;

    // Clear the "Loading…" placeholder immediately
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

    // Prevent detail panel from being closed when clicking SVG background
    svg.on('click', () => detailPanel?.classList.remove('visible'));

    g = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    fetch('data/family.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        treeData = data;
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

    root     = d3.hierarchy(treeData);
    root.x0  = (height - MARGIN.top - MARGIN.bottom) / 2;
    root.y0  = 0;

    if (branchFilter === 'all') {
      // Collapse everything to branch level
      root.children.forEach(collapse);
    } else {
      root.children.forEach(child => {
        if (child.data.id === branchFilter + '_branch') {
          expandAll(child);
        } else {
          collapse(child);
        }
      });
    }

    update(root);

    // Sync radio buttons
    document.querySelectorAll('.branch-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.branch === branchFilter);
    });
  }

  // Expose for inline onclick in index.html
  window.filterBranchTree = buildTree;

  // ── D3 update ──────────────────────────────────────────────

  // Fixed vertical gap between nodes (px) — large enough to fit label + dates line
  const NODE_SPACING_Y = 46;
  // Fixed horizontal distance between depth levels (px)
  const NODE_SPACING_X = 210;

  function update(source) {
    // Use nodeSize so each node always has enough vertical room for its label.
    // The tree width (horizontal) auto-fits the container.
    const layout = d3.tree().nodeSize([NODE_SPACING_Y, NODE_SPACING_X]);
    layout(root);

    // Compute the vertical extent of all visible nodes and resize SVG accordingly.
    const nodes   = root.descendants();
    const links   = root.links();
    const xExtent = d3.extent(nodes, d => d.x);   // x = vertical axis in this horizontal tree
    const yExtent = d3.extent(nodes, d => d.y);   // y = horizontal axis
    const treeH   = Math.max(xExtent[1] - xExtent[0] + MARGIN.top + MARGIN.bottom + 40, 400);
    const treeW   = yExtent[1] + MARGIN.left + MARGIN.right + 200; // +200 for right-side labels

    svg.attr('height', treeH).attr('width', Math.max(treeW, width));

    // On the initial render, shift g so the topmost node sits within the visible area.
    // On toggle renders, leave the transform alone to preserve the user's scroll position.
    if (source === root) {
      g.attr('transform', `translate(${MARGIN.left},${MARGIN.top - xExtent[0]})`);
    }

    // ── Links ──────────────────────────────────────────────
    const link      = g.selectAll('path.link').data(links, d => d.target.id);
    const linkEnter = link.enter().append('path').attr('class', 'link')
      .attr('d', () => {
        const o = { x: source.x0, y: source.y0 };
        return diagonal({ source: o, target: o });
      });

    link.merge(linkEnter)
      .transition().duration(350)
      .attr('d', diagonal)
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

    // ── Nodes ──────────────────────────────────────────────
    const node      = g.selectAll('g.node').data(nodes, d => d.id || (d.id = ++nodeId));
    const nodeEnter = node.enter().append('g')
      .attr('class', d => `node branch-${d.data.branch || 'root'} type-${d.data.type || 'person'}`)
      .attr('transform', `translate(${source.y0},${source.x0})`)
      .style('cursor', 'pointer')
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
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodeUpdate.select('circle')
      .attr('r',      d => (d.data.type === 'branch' || d.data.type === 'root') ? BRANCH_RADIUS : NODE_RADIUS)
      .attr('fill',   d => colorFor(d).fill)
      .attr('stroke', d => colorFor(d).stroke);

    nodeUpdate.select('text.collapse-indicator')
      .style('fill', d => colorFor(d).stroke)
      .text(d => d._children ? '▶' : d.children ? '▼' : '');

    // Label — rebuild tspans inside .each() to avoid accumulation on re-render
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

        // Clear previous tspans to prevent duplication
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

    let dates = '';
    if (data.birth || data.death) {
      if (data.birth) dates += `b. ${data.birth}`;
      if (data.birthplace) dates += ` · ${data.birthplace}`;
      if (data.death) dates += `\nd. ${data.death}`;
      if (data.deathplace) dates += ` · ${data.deathplace}`;
    }

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
      root.descendants().forEach(d => {
        if (d._children) { d.children = d._children; d._children = null; }
      });
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
