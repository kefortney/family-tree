(function () {
  const BRANCH_COLORS = {
    fortney: '#1d3a6c',
    sodergren: '#2d6e5e',
    mulhearn: '#3a5c2d',
    andersen: '#7a2b3a',
    unknown: '#8b6b52',
  };

  const cyEl = document.getElementById('cy');
  const statsEl = document.getElementById('graph-stats');
  const selectionEl = document.getElementById('selection-json');

  const branchFilterEl = document.getElementById('branch-filter');
  const searchEl = document.getElementById('node-search');
  const layoutEl = document.getElementById('layout-select');
  const layoutBtn = document.getElementById('btn-layout');
  const resetBtn = document.getElementById('btn-reset');

  let cy;
  const YEAR_SPACING = 14;
  const ROW_SPACING = 88;
  const PARTNER_OFFSET = 36;
  const UNKNOWN_YEAR_SPACING = 160;

  function branchClass(branch) {
    return branch && BRANCH_COLORS[branch] ? branch : 'unknown';
  }

  function compactName(name) {
    if (!name) return '';
    const normalized = name.replace(/\s*\([^)]*\)/g, '').trim();
    const parts = normalized.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).join(' ') || normalized;
  }

  function yearLabel(person) {
    if (!person.birth && !person.death) return '';
    const birth = person.birth || '?';
    const death = person.death || '';
    return `\n${birth}${death ? `-${death}` : ''}`;
  }

  function unionBranch(union, personById) {
    for (const partnerId of union.partners || []) {
      const person = personById.get(partnerId);
      if (person?.branch) return person.branch;
    }
    return 'unknown';
  }

  function makeElements(graph) {
    const elements = [];
    const personById = new Map(graph.persons.map((p) => [p.id, p]));
    const childrenWithUnion = new Set((graph.childrenOfUnion || []).map((edge) => edge.childId));

    graph.persons.forEach((p) => {
      const b = branchClass(p.branch);
      elements.push({
        data: {
          id: p.id,
          label: `${compactName(p.name || p.id)}${yearLabel(p)}`,
          fullLabel: p.name || p.id,
          branch: p.branch || 'unknown',
          kind: 'person',
          raw: p,
        },
        classes: `person branch-${b}`,
      });
    });

    graph.unions.forEach((u) => {
      const b = branchClass(unionBranch(u, personById));
      elements.push({
        data: {
          id: u.id,
          branch: b,
          kind: 'union',
          label: u.displaySpouseName || u.relationshipType || 'union',
          raw: u,
        },
        classes: `union branch-${b}`,
      });

      (u.partners || []).forEach((partnerId) => {
        if (!personById.has(partnerId)) return;
        elements.push({
          data: {
            id: `pu_${u.id}_${partnerId}`,
            source: partnerId,
            target: u.id,
            rel: 'partner',
            raw: { unionId: u.id, partnerId },
          },
          classes: 'edge-partner',
        });
      });
    });

    (graph.childrenOfUnion || []).forEach((e) => {
      elements.push({
        data: {
          id: `uc_${e.unionId}_${e.childId}`,
          source: e.unionId,
          target: e.childId,
          rel: 'child',
          raw: e,
        },
        classes: 'edge-child',
      });
    });

    graph.parentChild.forEach((e) => {
      if (childrenWithUnion.has(e.childId)) return;
      elements.push({
        data: {
          id: `pc_${e.parentId}_${e.childId}`,
          source: e.parentId,
          target: e.childId,
          rel: 'parent',
          raw: e,
        },
        classes: 'edge-parent',
      });
    });

    return elements;
  }

  function findRoots() {
    if (!cy) return [];
    return cy.nodes('.person').filter((node) => {
      const incoming = node.incomers('edge.edge-child, edge.edge-parent');
      return incoming.length === 0;
    });
  }

  function personYear(node) {
    const raw = node.data('raw') || {};
    const birth = Number(raw.birth);
    if (Number.isFinite(birth)) return birth;
    const death = Number(raw.death);
    if (Number.isFinite(death)) return death - 70;
    return null;
  }

  function median(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  function familyTargets(node) {
    return node.outgoers('edge.edge-partner, edge.edge-child, edge.edge-parent').targets();
  }

  function computeFamilyPositions() {
    if (!cy) {
      return {
        name: 'breadthfirst',
        fit: true,
        directed: true,
        circle: false,
        animate: false,
        padding: 40,
        spacingFactor: 1.2,
        nodeDimensionsIncludeLabels: true,
      };
    }

    const visibleNodes = cy.nodes(':visible');
    const visiblePeople = cy.nodes('.person:visible');
    const peopleWithYears = visiblePeople
      .map((node) => ({ id: node.id(), year: personYear(node) }))
      .filter((entry) => entry.year !== null);

    const years = peopleWithYears.map((entry) => entry.year);
    const minYear = years.length ? Math.min(...years) : 1800;
    const maxYear = years.length ? Math.max(...years) : minYear + 1;
    const defaultYear = median(years) || minYear;

    const inferredYearById = new Map();

    visiblePeople.forEach((node) => {
      const explicitYear = personYear(node);
      if (explicitYear !== null) {
        inferredYearById.set(node.id(), explicitYear);
        return;
      }

      const neighborYears = node
        .connectedEdges(':visible')
        .connectedNodes('.person:visible')
        .map((neighbor) => personYear(neighbor))
        .filter((year) => year !== null);

      inferredYearById.set(node.id(), median(neighborYears) || defaultYear);
    });

    const roots = findRoots()
      .filter(':visible')
      .sort((a, b) => {
        const yearDiff = (inferredYearById.get(a.id()) || defaultYear) - (inferredYearById.get(b.id()) || defaultYear);
        if (yearDiff !== 0) return yearDiff;
        return (a.data('fullLabel') || a.id()).localeCompare(b.data('fullLabel') || b.id());
      });

    const positioned = new Set();
    const yById = new Map();
    let rowCursor = 0;

    function sortTargets(collection) {
      return collection.sort((a, b) => {
        const yearDiff = (inferredYearById.get(a.id()) || defaultYear) - (inferredYearById.get(b.id()) || defaultYear);
        if (yearDiff !== 0) return yearDiff;
        return (a.data('fullLabel') || a.id()).localeCompare(b.data('fullLabel') || b.id());
      });
    }

    function assignY(node) {
      if (positioned.has(node.id())) return yById.get(node.id());
      positioned.add(node.id());

      const children = sortTargets(familyTargets(node).filter(':visible'));
      if (children.length === 0) {
        const y = rowCursor * ROW_SPACING;
        rowCursor += 1;
        yById.set(node.id(), y);
        return y;
      }

      const childYs = children.map((child) => assignY(child));
      const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
      yById.set(node.id(), y);
      return y;
    }

    roots.forEach((root) => assignY(root));

    sortTargets(visibleNodes.filter((node) => !positioned.has(node.id()))).forEach((node) => assignY(node));

    const xById = new Map();

    visiblePeople.forEach((node) => {
      const year = inferredYearById.get(node.id()) || defaultYear;
      xById.set(node.id(), (year - minYear) * YEAR_SPACING);
    });

    cy.nodes('.union:visible').forEach((node) => {
      const raw = node.data('raw') || {};
      const partnerXs = (raw.partners || [])
        .map((partnerId) => xById.get(partnerId))
        .filter((value) => Number.isFinite(value));
      const partnerYs = (raw.partners || [])
        .map((partnerId) => yById.get(partnerId))
        .filter((value) => Number.isFinite(value));

      const childYs = node
        .outgoers('edge.edge-child')
        .targets()
        .map((child) => yById.get(child.id()))
        .filter((value) => Number.isFinite(value));

      const unionX = partnerXs.length
        ? (Math.min(...partnerXs) + Math.max(...partnerXs)) / 2 + PARTNER_OFFSET
        : (defaultYear - minYear) * YEAR_SPACING;
      const unionYValues = partnerYs.concat(childYs);
      const unionY = unionYValues.length
        ? (Math.min(...unionYValues) + Math.max(...unionYValues)) / 2
        : rowCursor * ROW_SPACING;

      xById.set(node.id(), unionX);
      yById.set(node.id(), unionY);
    });

    const nodesByX = new Map();
    visibleNodes.forEach((node) => {
      const x = xById.get(node.id()) || ((defaultYear - minYear) * YEAR_SPACING);
      const bucket = Math.round(x / 24);
      if (!nodesByX.has(bucket)) nodesByX.set(bucket, []);
      nodesByX.get(bucket).push(node);
    });

    nodesByX.forEach((nodes) => {
      nodes.sort((a, b) => (yById.get(a.id()) || 0) - (yById.get(b.id()) || 0));
      let prevY = -Infinity;
      nodes.forEach((node) => {
        const minGap = node.hasClass('union') ? ROW_SPACING * 0.55 : ROW_SPACING * 0.85;
        const currentY = yById.get(node.id()) || 0;
        const nextY = currentY <= prevY + minGap ? prevY + minGap : currentY;
        yById.set(node.id(), nextY);
        prevY = nextY;
      });
    });

    return {
      name: 'preset',
      fit: true,
      animate: true,
      padding: 80,
      positions(node) {
        const baseX = xById.get(node.id());
        const baseY = yById.get(node.id());
        const fallbackIndex = visibleNodes.indexOf(node);
        return {
          x: Number.isFinite(baseX) ? baseX : (maxYear - minYear + 1) * UNKNOWN_YEAR_SPACING,
          y: Number.isFinite(baseY) ? baseY : fallbackIndex * ROW_SPACING,
        };
      },
    };
  }

  function layoutOptions(name) {
    if (name === 'family') return computeFamilyPositions();

    const roots = findRoots();

    const options = {
      family: {
        name: 'breadthfirst',
        fit: true,
        directed: true,
        circle: false,
        animate: true,
        padding: 40,
        spacingFactor: 1.35,
        nodeDimensionsIncludeLabels: true,
        roots,
      },
      cose: {
        name: 'cose',
        animate: true,
        fit: true,
        padding: 30,
        randomize: false,
      },
      breadthfirst: {
        name: 'breadthfirst',
        fit: true,
        directed: true,
        circle: false,
        animate: true,
        padding: 20,
        spacingFactor: 1.1,
        nodeDimensionsIncludeLabels: true,
        roots,
      },
      concentric: {
        name: 'concentric',
        fit: true,
        padding: 20,
        minNodeSpacing: 40,
      },
    };

    return options[name] || options.family;
  }

  function runLayout(name) {
    if (!cy) return;
    cy.layout(layoutOptions(name)).run();
  }

  function updateStats() {
    const personCount = cy.nodes('.person:visible').length;
    const unionCount = cy.nodes('.union:visible').length;
    const edgeCount = cy.edges(':visible').length;
    statsEl.textContent = `Visible: ${personCount} people, ${unionCount} family units, ${edgeCount} links`;
  }

  function applyBranchFilter() {
    const branch = branchFilterEl.value;

    cy.nodes('.person').forEach((n) => {
      const show = branch === 'all' || n.data('branch') === branch;
      n.style('display', show ? 'element' : 'none');
    });

    cy.nodes('.union').forEach((n) => {
      const show = branch === 'all' || n.data('branch') === branch;
      n.style('display', show ? 'element' : 'none');
    });

    cy.edges().forEach((e) => {
      const srcVisible = e.source().style('display') !== 'none';
      const tgtVisible = e.target().style('display') !== 'none';
      e.style('display', srcVisible && tgtVisible ? 'element' : 'none');
    });

    runLayout(layoutEl.value);
    updateStats();
  }

  function applySearch() {
    const q = (searchEl.value || '').trim().toLowerCase();
    cy.nodes('.person').removeClass('match');

    if (!q) return;

    const matches = cy.nodes('.person').filter((n) => {
      const id = (n.id() || '').toLowerCase();
      const label = (n.data('fullLabel') || '').toLowerCase();
      return id.includes(q) || label.includes(q);
    });

    matches.addClass('match');
    if (matches.length > 0) {
      cy.animate({
        fit: { eles: matches, padding: 80 },
        duration: 350,
      });
    }
  }

  function bindEvents() {
    branchFilterEl.addEventListener('change', applyBranchFilter);
    searchEl.addEventListener('input', applySearch);
    layoutBtn.addEventListener('click', () => runLayout(layoutEl.value));

    resetBtn.addEventListener('click', () => {
      branchFilterEl.value = 'all';
      searchEl.value = '';
      cy.nodes('.person').removeClass('match');
      cy.nodes().style('display', 'element');
      cy.edges().style('display', 'element');
      updateStats();
      runLayout(layoutEl.value);
    });

    cy.on('tap', 'node, edge', (evt) => {
      const data = evt.target.data('raw') || evt.target.data();
      selectionEl.textContent = JSON.stringify(data, null, 2);
    });
  }

  async function init() {
    const response = await fetch('data/family_graph.json');
    if (!response.ok) throw new Error('Could not load data/family_graph.json');
    const graph = await response.json();

    cy = cytoscape({
      container: cyEl,
      elements: makeElements(graph),
      style: [
        {
          selector: 'node.person',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#f7f3ea',
            'border-width': 1.6,
            'border-color': '#5c3d2e',
            'label': 'data(label)',
            'font-size': '9px',
            'text-wrap': 'wrap',
            'text-max-width': 76,
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'width': 16,
            'height': 16,
          },
        },
        {
          selector: 'node.union',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#a8a29a',
            'border-width': 0,
            'width': 26,
            'height': 6,
            'label': '',
          },
        },
        {
          selector: '.branch-fortney',
          style: { 'border-color': BRANCH_COLORS.fortney, 'background-color': '#e8edf5' },
        },
        {
          selector: '.branch-sodergren',
          style: { 'border-color': BRANCH_COLORS.sodergren, 'background-color': '#e6f0ee' },
        },
        {
          selector: '.branch-mulhearn',
          style: { 'border-color': BRANCH_COLORS.mulhearn, 'background-color': '#e8f0e5' },
        },
        {
          selector: '.branch-andersen',
          style: { 'border-color': BRANCH_COLORS.andersen, 'background-color': '#f0e6e8' },
        },
        {
          selector: '.branch-unknown',
          style: { 'border-color': BRANCH_COLORS.unknown, 'background-color': '#f7f5f0' },
        },
        {
          selector: 'edge.edge-partner',
          style: {
            'curve-style': 'straight',
            'line-color': '#bdb7ad',
            'width': 1.6,
          },
        },
        {
          selector: 'edge.edge-child',
          style: {
            'curve-style': 'taxi',
            'taxi-direction': 'vertical',
            'taxi-turn': '40%',
            'line-color': '#8b6b52',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#8b6b52',
            'width': 1.35,
          },
        },
        {
          selector: 'edge.edge-parent',
          style: {
            'curve-style': 'taxi',
            'taxi-direction': 'vertical',
            'taxi-turn': '35%',
            'line-color': '#c3b29c',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#c3b29c',
            'line-style': 'dotted',
            'width': 1.1,
          },
        },
        {
          selector: '.match',
          style: {
            'border-width': 3,
            'border-color': '#b8962e',
            'width': 20,
            'height': 20,
          },
        },
      ],
      layout: layoutOptions(layoutEl.value),
    });

    // Apply the family preset layout after cy is created.
    runLayout(layoutEl.value);

    updateStats();
    bindEvents();
    selectionEl.textContent = JSON.stringify(graph.meta, null, 2);
  }

  init().catch((err) => {
    statsEl.textContent = 'Error loading graph data';
    selectionEl.textContent = err.message;
  });
})();
