// ════════════════════════════════════════════════════════════════
// INFUSA CONTENT STUDIO - APPLICATION LOGIC
// ════════════════════════════════════════════════════════════════

// State
let allIdeas = [];
let filters = {
  platform: 'all',
  pillar: 'all',
  objective: 'all',
  format: 'all',
  time: 'all',
  search: ''
};
let favorites = [];
let customIdeas = [];
let weeklyPlan = [];
let activeNavTab = 'catalog';
let currentViewMode = 'grid';
let activeModalIdea = null;
let activeModalTab = 'concept';

// ── INITIALIZATION ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStoredData();
  setupEventListeners();
  renderCatalog();
  renderWeeklyPlanner();
  renderHookLab();
  updateHeaderCounts();
});

function loadStoredData() {
  // Load favorites
  try {
    favorites = JSON.parse(localStorage.getItem('infusa_favs') || '[]');
  } catch(e) { favorites = []; }

  // Load custom ideas
  try {
    customIdeas = JSON.parse(localStorage.getItem('infusa_custom_ideas') || '[]');
  } catch(e) { customIdeas = []; }

  // Combine database with user custom ideas
  allIdeas = [...customIdeas, ...INFUSA_IDEAS];

  // Load weekly plan or set default
  try {
    const storedPlan = localStorage.getItem('infusa_weekly_plan');
    if (storedPlan) {
      weeklyPlan = JSON.parse(storedPlan);
    } else {
      generateBalancedWeek(false);
    }
  } catch(e) {
    generateBalancedWeek(false);
  }
}

function setupEventListeners() {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchNavTab(tab.dataset.tab));
  });

  // Filter selects
  ['filterPlatform', 'filterPillar', 'filterObjective', 'filterFormat', 'filterTime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        const key = id.replace('filter', '').toLowerCase();
        filters[key] = e.target.value;
        renderCatalog();
      });
    }
  });

  // Search input
  const searchInput = document.getElementById('catalogSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filters.search = e.target.value.trim().toLowerCase();
      const clearBtn = document.getElementById('searchClearBtn');
      if (clearBtn) clearBtn.classList.toggle('visible', filters.search.length > 0);
      renderCatalog();
    });
  }

  // Keyboard escape for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSpotlight();
  });
}

// ── NAVIGATION & TABS ───────────────────────────────────────────
function switchNavTab(tabId) {
  activeNavTab = tabId;

  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `pane-${tabId}`);
  });

  if (tabId === 'catalog') {
    renderCatalog();
  } else if (tabId === 'planner') {
    renderWeeklyPlanner();
  } else if (tabId === 'hooks') {
    renderHookLab();
  } else if (tabId === 'favs') {
    renderFavorites();
  }
}

// ── CATALOG FILTERING & RENDERING ───────────────────────────────
function getFilteredIdeas() {
  return allIdeas.filter(idea => {
    if (activeNavTab === 'favs' && !favorites.includes(idea.id)) return false;

    if (filters.platform !== 'all') {
      if (filters.platform === 'instagram' && idea.platform !== 'instagram' && idea.platform !== 'both') return false;
      if (filters.platform === 'tiktok' && idea.platform !== 'tiktok' && idea.platform !== 'both') return false;
    }

    if (filters.pillar !== 'all' && idea.pillar !== filters.pillar) return false;
    if (filters.objective !== 'all' && idea.objective !== filters.objective) return false;
    if (filters.format !== 'all' && idea.format !== filters.format) return false;

    if (filters.time !== 'all') {
      if (filters.time === 'rapido' && !idea.time.includes('10') && !idea.time.includes('15') && !idea.time.includes('20')) return false;
      if (filters.time === 'medio' && !idea.time.includes('25') && !idea.time.includes('30')) return false;
      if (filters.time === 'elaborado' && !idea.time.includes('35') && !idea.time.includes('40') && !idea.time.includes('45')) return false;
    }

    if (filters.search) {
      const q = filters.search;
      const matchTitle = idea.title.toLowerCase().includes(q);
      const matchHook = idea.hook.toLowerCase().includes(q);
      const matchMsg = idea.message.toLowerCase().includes(q);
      const matchPillar = idea.pillarLabel.toLowerCase().includes(q);
      const matchRes = (idea.resources || []).some(r => r.toLowerCase().includes(q));
      if (!matchTitle && !matchHook && !matchMsg && !matchPillar && !matchRes) return false;
    }

    return true;
  });
}

function renderCatalog() {
  const container = document.getElementById('cardsGrid');
  if (!container) return;

  const filtered = getFilteredIdeas();
  const countEl = document.getElementById('shownCount');
  if (countEl) countEl.textContent = filtered.length;

  renderActivePills();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-icon">☕</div>
        <h3>No encontramos ideas con estos filtros</h3>
        <p>Prueba ajustando los criterios de búsqueda o haz clic en "Limpiar filtros" para ver todo el catálogo.</p>
        <button class="btn-card-action btn-card-primary" onclick="resetFilters()" style="margin-top:14px;">
          ↺ Limpiar todos los filtros
        </button>
      </div>`;
    return;
  }

  container.className = `cards-grid ${currentViewMode === 'list' ? 'list-view' : ''}`;
  container.innerHTML = filtered.map(idea => renderIdeaCardHtml(idea)).join('');
}

function renderFavorites() {
  const container = document.getElementById('favsCardsGrid');
  if (!container) return;

  const favIdeas = allIdeas.filter(idea => favorites.includes(idea.id));
  if (favIdeas.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-icon">★</div>
        <h3>No tienes ideas en favoritos aún</h3>
        <p>Explora el catálogo y pulsa sobre la estrella ☆ en cualquier idea para guardarla aquí.</p>
        <button class="btn-card-action btn-card-primary" onclick="switchNavTab('catalog')" style="margin-top:14px;">
          Explorar catálogo
        </button>
      </div>`;
    return;
  }

  container.className = `cards-grid ${currentViewMode === 'list' ? 'list-view' : ''}`;
  container.innerHTML = favIdeas.map(idea => renderIdeaCardHtml(idea)).join('');
}

function renderIdeaCardHtml(idea) {
  return `
    <article class="idea-card" data-id="${idea.id}">
      <div class="card-top">
        <div class="card-badges-row">
          ${idea.isCustom ? '<span class="badge badge-custom">💡 Tuya</span>' : ''}
          <span class="badge badge-pillar-${idea.pillar}">${idea.pillarLabel}</span>
          <span class="badge badge-format">${formatBadgeLabel(idea.format)}</span>
          ${renderPlatformBadge(idea.platform)}
          <span class="badge badge-time">⏱️ ${idea.time}</span>
        </div>
        <button class="card-btn-fav ${favorites.includes(idea.id) ? 'is-fav' : ''}" 
                onclick="toggleFavorite(${idea.id}, event)" 
                title="${favorites.includes(idea.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
          ${favorites.includes(idea.id) ? '★' : '☆'}
        </button>
      </div>

      <div class="card-content">
        <h3 class="card-title">${escapeHtml(idea.title)}</h3>
        
        <div class="card-hook-box">
          "${escapeHtml(idea.hook)}"
        </div>

        <div class="card-meta-field">
          <div class="card-meta-label">Mensaje clave</div>
          <div class="card-meta-val">${escapeHtml(idea.message)}</div>
        </div>

        <div class="card-meta-field">
          <div class="card-meta-label">Recursos necesarios</div>
          <div class="card-resources-list">
            ${(idea.resources || []).map(r => `<span class="resource-pill">${escapeHtml(r)}</span>`).join('')}
          </div>
        </div>

        <div class="card-cta-preview">
          <strong>CTA:</strong> ${escapeHtml(idea.cta)}
        </div>
      </div>

      <div class="card-actions-bar">
        <div class="card-actions-left">
          <button class="btn-card-action btn-card-primary" onclick="openSpotlight(${idea.id})" title="Ver ficha completa con guión y adaptación">
            👁️ Ficha completa
          </button>
        </div>
        <div class="card-actions-right">
          <button class="btn-card-action" onclick="quickAssignToPlanner(${idea.id})" title="Asignar al Planificador Semanal">
            📅 +Semana
          </button>
          <button class="btn-card-action" onclick="copyIdeaWhatsApp(${idea.id})" title="Copiar formato WhatsApp">
            💬 WhatsApp
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderActivePills() {
  const container = document.getElementById('activePillsContainer');
  if (!container) return;

  const pills = [];

  if (filters.search) {
    pills.push({ label: `Búsqueda: "${filters.search}"`, key: 'search' });
  }
  if (filters.platform !== 'all') {
    const map = { instagram: '📷 Instagram', tiktok: '🎵 TikTok' };
    pills.push({ label: map[filters.platform] || filters.platform, key: 'platform' });
  }
  if (filters.pillar !== 'all') {
    pills.push({ label: PILLARS_CONFIG[filters.pillar]?.label || filters.pillar, key: 'pillar' });
  }
  if (filters.objective !== 'all') {
    pills.push({ label: OBJECTIVES_CONFIG[filters.objective]?.label || filters.objective, key: 'objective' });
  }
  if (filters.format !== 'all') {
    pills.push({ label: formatBadgeLabel(filters.format), key: 'format' });
  }
  if (filters.time !== 'all') {
    const map = { rapido: '⚡ Rápido (<15m)', medio: '⏱️ Medio (~30m)', elaborado: '🎬 Elaborado (45m+)' };
    pills.push({ label: map[filters.time] || filters.time, key: 'time' });
  }

  if (pills.length === 0) {
    container.innerHTML = '<span style="font-size:12px;color:var(--text-light);">Todos los filtros activos</span>';
    return;
  }

  container.innerHTML = pills.map(p => `
    <span class="active-pill">
      ${escapeHtml(p.label)}
      <span class="active-pill-remove" onclick="removeFilter('${p.key}')">&times;</span>
    </span>
  `).join('');
}

function removeFilter(key) {
  if (key === 'search') {
    filters.search = '';
    const input = document.getElementById('catalogSearch');
    if (input) input.value = '';
    const clearBtn = document.getElementById('searchClearBtn');
    if (clearBtn) clearBtn.classList.remove('visible');
  } else {
    filters[key] = 'all';
    const sel = document.getElementById(`filter${key.charAt(0).toUpperCase() + key.slice(1)}`);
    if (sel) sel.value = 'all';
  }
  renderCatalog();
}

function resetFilters() {
  filters = { platform: 'all', pillar: 'all', objective: 'all', format: 'all', time: 'all', search: '' };
  ['filterPlatform', 'filterPillar', 'filterObjective', 'filterFormat', 'filterTime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  const input = document.getElementById('catalogSearch');
  if (input) input.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.classList.remove('visible');
  renderCatalog();
  showToast('Filtros restablecidos ✓');
}

function clearSearch() {
  removeFilter('search');
}

function setViewMode(mode) {
  currentViewMode = mode;
  document.getElementById('btnViewGrid')?.classList.toggle('active', mode === 'grid');
  document.getElementById('btnViewList')?.classList.toggle('active', mode === 'list');
  renderCatalog();
}

function formatBadgeLabel(fmt) {
  const map = { reel: '🎬 Reel', carrusel: '📑 Carrusel', post: '📌 Post', story: '📱 Story', tiktok: '🎵 TikTok' };
  return map[fmt] || fmt;
}

function renderPlatformBadge(p) {
  if (p === 'instagram') return '<span class="badge badge-platform-ig">📷 Instagram</span>';
  if (p === 'tiktok') return '<span class="badge badge-platform-tk">🎵 TikTok</span>';
  return '<span class="badge badge-platform-both">📷+🎵 Ambas</span>';
}

// ── FAVORITES ───────────────────────────────────────────────────
function toggleFavorite(id, event) {
  if (event) event.stopPropagation();
  if (favorites.includes(id)) {
    favorites = favorites.filter(favId => favId !== id);
    showToast('Idea quitada de favoritos');
  } else {
    favorites.push(id);
    showToast('¡Guardada en favoritos! ★');
  }
  localStorage.setItem('infusa_favs', JSON.stringify(favorites));
  updateHeaderCounts();
  renderCatalog();

  // If modal is open for this idea, update button
  if (activeModalIdea && activeModalIdea.id === id) {
    const favBtn = document.getElementById('modalBtnFav');
    if (favBtn) {
      favBtn.innerHTML = favorites.includes(id) ? '★ En favoritos' : '☆ Guardar en favoritos';
    }
  }
}

function updateHeaderCounts() {
  const favCountEl = document.getElementById('favCountHeader');
  if (favCountEl) favCountEl.textContent = `(${favorites.length})`;
  const tabFavCount = document.getElementById('tabFavCount');
  if (tabFavCount) tabFavCount.textContent = favorites.length;
  const totalCountEl = document.getElementById('statTotalCount');
  if (totalCountEl) totalCountEl.textContent = allIdeas.length;
}

// ── SPOTLIGHT MODAL (DETALLE COMPLETO) ──────────────────────────
function openSpotlight(id) {
  const idea = allIdeas.find(i => i.id === id);
  if (!idea) return;

  activeModalIdea = idea;
  activeModalTab = 'concept';

  renderModalContent();
  document.getElementById('spotlightModal').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSpotlight(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('spotlightModal').classList.remove('visible');
  document.body.style.overflow = '';
  activeModalIdea = null;
}

function setModalTab(tabKey) {
  activeModalTab = tabKey;
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mtab === tabKey);
  });
  renderModalTabBody();
}

function renderModalContent() {
  const idea = activeModalIdea;
  if (!idea) return;

  document.getElementById('modalTitleHeader').textContent = idea.pillarLabel;
  document.getElementById('modalHeroTitle').textContent = idea.title;
  document.getElementById('modalHookText').textContent = `"${idea.hook}"`;

  // Render Badges
  const badgesBox = document.getElementById('modalBadgesBox');
  badgesBox.innerHTML = `
    ${idea.isCustom ? '<span class="badge badge-custom">💡 Creada por ti</span>' : ''}
    <span class="badge badge-pillar-${idea.pillar}">${idea.pillarLabel}</span>
    <span class="badge badge-format">${formatBadgeLabel(idea.format)}</span>
    ${renderPlatformBadge(idea.platform)}
    <span class="badge" style="background:var(--accent-glow);color:var(--accent);">🎯 ${idea.objectiveLabel}</span>
    <span class="badge badge-time">⏱️ ${idea.time}</span>
  `;

  // Update Favorite button
  const favBtn = document.getElementById('modalBtnFav');
  if (favBtn) {
    favBtn.innerHTML = favorites.includes(idea.id) ? '★ En favoritos' : '☆ Guardar en favoritos';
  }

  // Set default tab
  setModalTab('concept');
}

function renderModalTabBody() {
  const idea = activeModalIdea;
  const container = document.getElementById('modalTabContentContainer');
  if (!idea || !container) return;

  if (activeModalTab === 'concept') {
    container.innerHTML = `
      <div class="modal-section-card">
        <h4>💡 Mensaje Clave & Propuesta de Valor</h4>
        <p>${escapeHtml(idea.message)}</p>
      </div>

      <div class="modal-section-card">
        <h4>📝 Descripción Creativa</h4>
        <p>${escapeHtml(idea.description)}</p>
      </div>

      <div class="modal-section-card">
        <h4>📦 Recursos Necesarios</h4>
        <div class="card-resources-list" style="margin-top:8px;">
          ${(idea.resources || []).map(r => `<span class="resource-pill" style="font-size:12px;padding:4px 10px;">${escapeHtml(r)}</span>`).join('')}
        </div>
      </div>

      <div class="modal-section-card">
        <h4>📣 Llamado a la Acción (CTA) Sugerido</h4>
        <p style="font-weight:600;color:var(--accent);font-style:italic;">"${escapeHtml(idea.cta)}"</p>
      </div>
    `;
  } else if (activeModalTab === 'script') {
    const steps = idea.scriptSteps || [];
    container.innerHTML = `
      <div class="modal-section-card">
        <h4>🎬 Estructura / Storyboard Paso a Paso</h4>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
          Diseñado para que la persona que graba o diseña no pierda tiempo pensando el orden ni los cortes:
        </p>
        <div class="script-steps-list">
          ${steps.map((s, idx) => `
            <div class="script-step-row">
              <div class="script-step-num">${s.step || `Paso ${idx+1}`}</div>
              <div class="script-step-content">
                <p>${escapeHtml(s.desc)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (activeModalTab === 'adaptation') {
    container.innerHTML = `
      <div class="platform-compare-grid">
        <div class="platform-box ig">
          <h5>📷 Cómo adaptarlo a Instagram</h5>
          <p>${escapeHtml(idea.igTips || 'Cuida la estética visual y luz natural. Agrega portada limpia que invite a guardar.')}</p>
        </div>
        <div class="platform-box tk">
          <h5>🎵 Cómo adaptarlo a TikTok</h5>
          <p>${escapeHtml(idea.tiktokTips || 'Apertura rápida en los primeros 2 segundos con texto dinámico y voz natural.')}</p>
        </div>
      </div>
      <div class="modal-section-card" style="margin-top:16px;">
        <h4>☕ Filosofía Infusa en este post</h4>
        <p>Recuerda mantener el tono de la marca: <em>"Buen café. Sin complicarte."</em> y <em>"Café que fluye contigo."</em>. Evita sonar pretencioso o demasiado técnico. El objetivo es que cualquier persona sienta que el café de especialidad es para ella.</p>
      </div>
    `;
  } else if (activeModalTab === 'caption') {
    container.innerHTML = `
      <div class="modal-section-card">
        <h4>💬 Copy / Caption Listo para Usar</h4>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">
          Copia y pega directamente en Instagram o adapta la primera línea para la descripción de TikTok:
        </p>
        <div class="caption-box" id="captionTextContent">${escapeHtml(idea.suggestedCaption || '')}</div>
        <button class="btn-card-action btn-card-primary" onclick="copyCaptionText()" style="margin-top:12px;">
          📋 Copiar Caption al Portapapeles
        </button>
      </div>
    `;
  }
}

function copyCaptionText() {
  if (!activeModalIdea) return;
  copyText(activeModalIdea.suggestedCaption || '', 'Caption copiado con hashtags ✓');
}

// ── TAB 2: PLANIFICADOR SEMANAL (4 POSTS) ───────────────────────
function renderWeeklyPlanner() {
  const container = document.getElementById('plannerSlotsGrid');
  if (!container) return;

  container.innerHTML = weeklyPlan.map((slot, index) => {
    const idea = slot.idea;
    return `
      <div class="planner-slot-card">
        <div class="slot-header">
          <div class="slot-day-info">
            <span class="slot-day-name">${slot.day}</span>
            <span class="slot-day-focus">${slot.focus}</span>
          </div>
          <select class="slot-status-select" onchange="changeSlotStatus(${index}, this.value)">
            <option value="pending" ${slot.status === 'pending' ? 'selected' : ''}>⚪ Por producir</option>
            <option value="in_progress" ${slot.status === 'in_progress' ? 'selected' : ''}>🟡 En grabación/diseño</option>
            <option value="done" ${slot.status === 'done' ? 'selected' : ''}>🟢 Listo</option>
          </select>
        </div>

        <div class="slot-body">
          ${idea ? `
            <div class="slot-assigned-content">
              <div class="card-badges-row">
                <span class="badge badge-pillar-${idea.pillar}">${idea.pillarLabel}</span>
                <span class="badge badge-format">${formatBadgeLabel(idea.format)}</span>
                ${renderPlatformBadge(idea.platform)}
              </div>
              <h4 class="slot-title">${escapeHtml(idea.title)}</h4>
              <div class="slot-hook">"${escapeHtml(idea.hook)}"</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:auto;">
                <strong>Recursos:</strong> ${(idea.resources || []).slice(0, 3).join(', ')}
              </div>
            </div>
          ` : `
            <div class="slot-empty-state">
              <p>Sin idea asignada</p>
              <button class="btn-slot-action" onclick="replaceSlotRandom(${index})" style="margin-top:8px;">
                + Asignar aleatoria
              </button>
            </div>
          `}
        </div>

        <div class="slot-footer">
          ${idea ? `
            <button class="btn-slot-action" onclick="openSpotlight(${idea.id})">👁️ Guión</button>
            <button class="btn-slot-action" onclick="copyIdeaWhatsApp(${idea.id})">💬 WhatsApp</button>
            <button class="btn-slot-action" onclick="replaceSlotRandom(${index})" title="Cambiar por otra idea de este pilar">🔄 Cambiar</button>
          ` : `
            <button class="btn-slot-action" onclick="replaceSlotRandom(${index})">🎲 Elegir idea</button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function generateBalancedWeek(notify = true) {
  // Balanced 4-day strategy:
  // 1: Educación / Principiantes
  // 2: Lifestyle / Momentos Infusa
  // 3: Tendencia / Humor / TikTok
  // 4: Comunidad / Debate
  const daysConfig = [
    { day: "Día 1 · Martes", focus: "Educación & Principiantes", targetPillar: "educacion" },
    { day: "Día 2 · Jueves", focus: "Momento Lifestyle / Oficina", targetPillar: "lifestyle" },
    { day: "Día 3 · Sábado", focus: "Tendencia & Humor (TikTok/Reel)", targetPillar: "tendencias" },
    { day: "Día 4 · Domingo", focus: "Comunidad & Interacción", targetPillar: "comunidad" }
  ];

  const usedIds = new Set();
  const newPlan = [];

  daysConfig.forEach(cfg => {
    let pool = allIdeas.filter(i => i.pillar === cfg.targetPillar && !usedIds.has(i.id));
    if (pool.length === 0) pool = allIdeas.filter(i => !usedIds.has(i.id));

    const selected = pool[Math.floor(Math.random() * pool.length)] || allIdeas[0];
    if (selected) usedIds.add(selected.id);

    newPlan.push({
      day: cfg.day,
      focus: cfg.focus,
      targetPillar: cfg.targetPillar,
      status: "pending",
      idea: selected
    });
  });

  weeklyPlan = newPlan;
  localStorage.setItem('infusa_weekly_plan', JSON.stringify(weeklyPlan));
  renderWeeklyPlanner();

  if (notify) showToast('¡Parrilla semanal generada con 4 publicaciones balanceadas! ☕📅');
}

function replaceSlotRandom(index) {
  const slot = weeklyPlan[index];
  if (!slot) return;

  const currentId = slot.idea ? slot.idea.id : null;
  let pool = allIdeas.filter(i => i.pillar === slot.targetPillar && i.id !== currentId);
  if (pool.length === 0) pool = allIdeas.filter(i => i.id !== currentId);

  const selected = pool[Math.floor(Math.random() * pool.length)];
  if (selected) {
    weeklyPlan[index].idea = selected;
    localStorage.setItem('infusa_weekly_plan', JSON.stringify(weeklyPlan));
    renderWeeklyPlanner();
    showToast(`Idea para ${slot.day} actualizada ✓`);
  }
}

function changeSlotStatus(index, newStatus) {
  if (weeklyPlan[index]) {
    weeklyPlan[index].status = newStatus;
    localStorage.setItem('infusa_weekly_plan', JSON.stringify(weeklyPlan));
  }
}

function quickAssignToPlanner(ideaId) {
  const idea = allIdeas.find(i => i.id === ideaId);
  if (!idea) return;

  // Find best matching slot or first slot
  let targetSlotIndex = weeklyPlan.findIndex(s => s.targetPillar === idea.pillar);
  if (targetSlotIndex === -1) targetSlotIndex = 0;

  weeklyPlan[targetSlotIndex].idea = idea;
  localStorage.setItem('infusa_weekly_plan', JSON.stringify(weeklyPlan));
  renderWeeklyPlanner();
  showToast(`Asignada a ${weeklyPlan[targetSlotIndex].day} ✓`);
}

function copyWeeklyPlanWhatsApp() {
  if (weeklyPlan.length === 0) {
    showToast('No hay publicaciones en el plan semanal');
    return;
  }

  let text = `*☕ INFUSA · PLAN SEMANAL DE CONTENIDO (4 POSTS)*\n`;
  text += `_"Buen café. Sin complicarte."_\n\n`;

  weeklyPlan.forEach(slot => {
    const i = slot.idea;
    const statusMap = { pending: '⚪ Por producir', in_progress: '🟡 En grabación', done: '🟢 Listo' };
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 *${slot.day.toUpperCase()}* (${slot.focus})\n`;
    text += `Estado: ${statusMap[slot.status] || slot.status}\n\n`;

    if (i) {
      text += `📌 *Título:* ${i.title}\n`;
      text += `📂 *Pilar:* ${i.pillarLabel} | *Formato:* ${formatBadgeLabel(i.format)}\n`;
      text += `🪝 *Hook / Apertura:* "${i.hook}"\n`;
      text += `💡 *Mensaje Clave:* ${i.message}\n`;
      text += `📦 *Recursos necesarios:* ${(i.resources || []).join(', ')}\n`;
      text += `📣 *CTA:* ${i.cta}\n\n`;
    } else {
      text += `(Sin idea asignada)\n\n`;
    }
  });

  text += `☕ Preparado con Infusa Content Studio`;

  copyText(text, '¡Plan semanal copiado para WhatsApp! 💬✓');
}

function exportWeeklyPlanTxt() {
  let text = `=================================================\n`;
  text += `INFUSA CONTENT STUDIO - PLAN SEMANAL (4 PUBLICACIONES)\n`;
  text += `Filosofía: "Buen café. Sin complicarte."\n`;
  text += `=================================================\n\n`;

  weeklyPlan.forEach(slot => {
    const i = slot.idea;
    text += `-------------------------------------------------\n`;
    text += `${slot.day.toUpperCase()} - ${slot.focus}\n`;
    text += `-------------------------------------------------\n`;
    if (i) {
      text += `Título: ${i.title}\n`;
      text += `Pilar: ${i.pillarLabel}\n`;
      text += `Formato: ${i.format}\n`;
      text += `Plataforma: ${i.platform}\n`;
      text += `Gancho: "${i.hook}"\n`;
      text += `Mensaje: ${i.message}\n`;
      text += `Guión / Descripción: ${i.description}\n`;
      text += `Recursos: ${(i.resources || []).join(', ')}\n`;
      text += `Tiempo estimado: ${i.time}\n`;
      text += `CTA: ${i.cta}\n\n`;
      text += `CAPTION SUGERIDO:\n${i.suggestedCaption}\n\n`;
    } else {
      text += `(Sin idea)\n\n`;
    }
  });

  downloadFile(`plan-semanal-infusa-${new Date().toISOString().split('T')[0]}.txt`, text, 'text/plain');
  showToast('Plan semanal descargado ✓');
}

// ── TAB 3: HOOK LAB ─────────────────────────────────────────────
function renderHookLab() {
  const container = document.getElementById('hookCategoriesContainer');
  if (!container || !HOOK_LAB) return;

  container.innerHTML = HOOK_LAB.map(cat => `
    <div class="hook-category-section">
      <h3 class="hook-category-title">${cat.categoryLabel}</h3>
      <p class="hook-category-desc">${cat.description}</p>

      <div class="hook-items-grid">
        ${cat.hooks.map(h => `
          <div class="hook-item-card">
            <div class="hook-item-text">"${escapeHtml(h.text)}"</div>
            <div class="hook-item-footer">
              <span class="hook-item-angle">${escapeHtml(h.angle)} · ${escapeHtml(h.format)}</span>
              <button class="btn-copy-hook" onclick="copyHookText('${escapeJsString(h.text)}')">
                📋 Copiar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function generateInteractiveHooks() {
  const angle = document.getElementById('hookGenAngle').value;
  const format = document.getElementById('hookGenFormat').value;
  const tone = document.getElementById('hookGenTone').value;

  const resultsBox = document.getElementById('generatedHooksBox');
  if (!resultsBox) return;

  const templates = {
    principiante: [
      "El 90% de las personas cree que el café de especialidad es complicado. Este filtro demuestra lo contrario.",
      "Si quieres dejar el café amargo y aprender a tomar buen café en 30 segundos, mira esto.",
      "No necesitas ser barista ni comprar una máquina de $500. Solo necesitas tu taza y agua caliente."
    ],
    oficina: [
      "El café de la oficina sabe a lunes a las 8am. Pero hoy traje la solución secreta en mi mochila.",
      "Cuando todos van por el café recalentado de la cafetera comunitaria y tú sacas tu Infusa.",
      "Home office a las 3:30 PM: tu energía en 2% y una taza de Infusa lista en 2 minutos."
    ],
    mitos: [
      "Si usas agua hirviendo directamente de la tetera, estás quemando tu café. Haz esto en su lugar.",
      "\"El café bueno tiene que ser amargo\". Falso. Y este filtro te va a enseñar por qué.",
      "La razón por la que tu café de casa sabe aguado y cómo solucionarlo sin gastar en máquinas."
    ],
    sensorial: [
      "El sonido del agua caliente filtrándose lentamente... tu pausa de paz del día. ☕🎧",
      "Mañanas lentas: café humeante, silencio y cero complicaciones.",
      "Así se ve preparar café de especialidad cuando solo buscas disfrutar sin prisas."
    ],
    practicidad: [
      "Café de especialidad en 2 minutos. Sin máquinas. Sin ensuciar nada. Solo agrega agua caliente.",
      "Lo que cabe en tu bolsillo y te salva el día en la oficina, la universidad o de viaje.",
      "Buen café. Sin complicarte. Esta es la forma más fácil de empezar tu día."
    ]
  };

  const selectedList = templates[angle] || templates.practicidad;

  resultsBox.innerHTML = `
    <div class="generated-hook-results">
      <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:6px;">
        ✦ 3 Ganchos generados para tono "${tone}" y formato "${format}":
      </div>
      ${selectedList.map(text => `
        <div class="generated-hook-card">
          <div class="generated-hook-text">"${escapeHtml(text)}"</div>
          <button class="btn-copy-hook" onclick="copyHookText('${escapeJsString(text)}')">
            📋 Copiar gancho
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function copyHookText(text) {
  copyText(text, '¡Gancho copiado al portapapeles! 🪝✓');
}

// ── TAB 4: CREADOR DE IDEAS PROPIAS ─────────────────────────────
function handleCreateIdeaSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('newIdeaTitle').value.trim();
  const pillar = document.getElementById('newIdeaPillar').value;
  const format = document.getElementById('newIdeaFormat').value;
  const platform = document.getElementById('newIdeaPlatform').value;
  const objective = document.getElementById('newIdeaObjective').value;
  const hook = document.getElementById('newIdeaHook').value.trim();
  const message = document.getElementById('newIdeaMessage').value.trim();
  const description = document.getElementById('newIdeaDesc').value.trim();
  const resourcesRaw = document.getElementById('newIdeaResources').value.trim();
  const cta = document.getElementById('newIdeaCta').value.trim();
  const time = document.getElementById('newIdeaTime').value || '25 min';

  if (!title || !hook || !message) {
    showToast('Por favor completa al menos título, gancho y mensaje clave');
    return;
  }

  const resources = resourcesRaw ? resourcesRaw.split(',').map(r => r.trim()).filter(Boolean) : ["Filtro Infusa", "Taza", "Agua caliente"];

  const newIdea = {
    id: Date.now(),
    isCustom: true,
    title: title,
    pillar: pillar,
    pillarLabel: PILLARS_CONFIG[pillar]?.label || pillar,
    objective: objective,
    objectiveLabel: OBJECTIVES_CONFIG[objective]?.label || objective,
    format: format,
    platform: platform,
    time: time,
    hook: hook,
    message: message,
    description: description || message,
    resources: resources,
    cta: cta || "Pide tu pack Infusa por mensaje directo ☕",
    igTips: "Cuida la estética visual en tonos café y luz natural. Agrega portada limpia.",
    tiktokTips: "Comienza con hook rápido en los primeros 2 segundos y texto en pantalla.",
    scriptSteps: [
      { step: "Toma 1 (Hook)", desc: `Comenzar con: "${hook}"` },
      { step: "Toma 2 (Desarrollo)", desc: message },
      { step: "Toma 3 (Solución Infusa)", desc: "Preparación con filtro drip bag individual y agua caliente." },
      { step: "Toma 4 (CTA)", desc: cta || "Buen café. Sin complicarte." }
    ],
    suggestedCaption: `${hook}\n\n${message}\n\n${cta}\n\n—\n☕ Infusa · Buen café. Sin complicarte.\n#Infusa #CafeDeEspecialidad #CafeFiltrante`
  };

  customIdeas.unshift(newIdea);
  localStorage.setItem('infusa_custom_ideas', JSON.stringify(customIdeas));
  allIdeas = [...customIdeas, ...INFUSA_IDEAS];

  // Reset form
  e.target.reset();

  showToast('¡Idea propia guardada con éxito en tu catálogo! 💡✓');
  switchNavTab('catalog');
}

// ── EXPORT TOOLS ────────────────────────────────────────────────
function copyIdeaWhatsApp(id) {
  const idea = allIdeas.find(i => i.id === id);
  if (!idea) return;

  const text = `
*☕ INFUSA · FICHA DE CONTENIDO*
──────────────────────
📌 *${idea.title}*

📂 *Pilar:* ${idea.pillarLabel}
🎬 *Formato:* ${formatBadgeLabel(idea.format)}
📱 *Plataforma:* ${idea.platform === 'both' ? 'Instagram + TikTok' : idea.platform.toUpperCase()}
⏱️ *Tiempo estimado:* ${idea.time}

🪝 *HOOK (Apertura):*
"${idea.hook}"

💡 *Mensaje clave:*
${idea.message}

📦 *Recursos necesarios:*
${(idea.resources || []).map(r => `• ${r}`).join('\n')}

📣 *Llamado a la acción (CTA):*
${idea.cta}

──────────────────────
☕ _Infusa · Buen café. Sin complicarte._
`.trim();

  copyText(text, 'Idea formateada para WhatsApp copiada ✓');
}

function copyIdeaFull(id) {
  const idea = allIdeas.find(i => i.id === id);
  if (!idea) return;

  const text = `
=== INFUSA CONTENT STUDIO ===
Título: ${idea.title}
Pilar: ${idea.pillarLabel}
Objetivo: ${idea.objectiveLabel}
Formato: ${idea.format}
Plataforma: ${idea.platform}
Tiempo: ${idea.time}

HOOK:
"${idea.hook}"

MENSAJE CLAVE:
${idea.message}

DESCRIPCIÓN:
${idea.description}

RECURSOS:
${(idea.resources || []).join(', ')}

CTA:
${idea.cta}

CAPTION SUGERIDO:
${idea.suggestedCaption}
`.trim();

  copyText(text, 'Ficha completa copiada al portapapeles ✓');
}

function exportCatalogTxt() {
  const filtered = getFilteredIdeas();
  if (filtered.length === 0) {
    showToast('No hay ideas para exportar');
    return;
  }

  let text = `========================================================\n`;
  text += `INFUSA CONTENT STUDIO - CATÁLOGO DE IDEAS DE CONTENIDO\n`;
  text += `Fecha: ${new Date().toLocaleDateString('es-MX')}\n`;
  text += `Total de ideas exportadas: ${filtered.length}\n`;
  text += `Filosofía: "Buen café. Sin complicarte." · "Café que fluye contigo."\n`;
  text += `========================================================\n\n`;

  filtered.forEach((i, idx) => {
    text += `[IDEA ${idx + 1}] ${i.title.toUpperCase()}\n`;
    text += `Pilar: ${i.pillarLabel} | Formato: ${i.format} | Plataforma: ${i.platform}\n`;
    text += `Objetivo: ${i.objectiveLabel} | Tiempo estimado: ${i.time}\n`;
    text += `Gancho: "${i.hook}"\n`;
    text += `Mensaje: ${i.message}\n`;
    text += `Descripción: ${i.description}\n`;
    text += `Recursos: ${(i.resources || []).join(', ')}\n`;
    text += `CTA: ${i.cta}\n`;
    text += `--------------------------------------------------------\n\n`;
  });

  downloadFile(`infusa-catalogo-${new Date().toISOString().split('T')[0]}.txt`, text, 'text/plain');
  showToast(`${filtered.length} ideas exportadas a TXT ✓`);
}

function exportCatalogCsv() {
  const filtered = getFilteredIdeas();
  if (filtered.length === 0) {
    showToast('No hay ideas para exportar');
    return;
  }

  const headers = ["ID", "Titulo", "Pilar", "Formato", "Plataforma", "Objetivo", "Tiempo", "Gancho", "Mensaje", "Recursos", "CTA"];
  const rows = filtered.map(i => [
    i.id,
    `"${(i.title || '').replace(/"/g, '""')}"`,
    `"${(i.pillarLabel || '').replace(/"/g, '""')}"`,
    `"${(i.format || '').replace(/"/g, '""')}"`,
    `"${(i.platform || '').replace(/"/g, '""')}"`,
    `"${(i.objectiveLabel || '').replace(/"/g, '""')}"`,
    `"${(i.time || '').replace(/"/g, '""')}"`,
    `"${(i.hook || '').replace(/"/g, '""')}"`,
    `"${(i.message || '').replace(/"/g, '""')}"`,
    `"${(i.resources || []).join('; ').replace(/"/g, '""')}"`,
    `"${(i.cta || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(`infusa-catalogo-${new Date().toISOString().split('T')[0]}.csv`, csvContent, 'text/csv;charset=utf-8');
  showToast(`${filtered.length} ideas exportadas a CSV (compatible con Notion y Excel) ✓`);
}

// ── INSPIRATION (RANDOM PICKER) ─────────────────────────────────
function inspireMe() {
  const pool = getFilteredIdeas();
  if (pool.length === 0) {
    showToast('No hay ideas disponibles con los filtros actuales');
    return;
  }
  const random = pool[Math.floor(Math.random() * pool.length)];
  openSpotlight(random.id);
  showToast('✦ ¡Idea seleccionada para inspirarte!');
}

// ── UTILITIES ───────────────────────────────────────────────────
function copyText(str, successMessage) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(str).then(() => {
      showToast(successMessage);
    }).catch(() => fallbackCopy(str, successMessage));
  } else {
    fallbackCopy(str, successMessage);
  }
}

function fallbackCopy(str, successMessage) {
  const ta = document.createElement('textarea');
  ta.value = str;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMessage);
  } catch(e) {
    showToast('Error al copiar. Selecciona el texto manualmente.');
  }
  document.body.removeChild(ta);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => el.classList.remove('visible'), 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
