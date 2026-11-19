/* VILLA BASIS — catálogo público
   Mantém a leitura do Supabase e os campos atuais da tabela layouts.
   Não altera nem grava dados no banco. */
const $ = (id) => document.getElementById(id);

let allLayouts = [];
let activeCv = null;

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeExternalUrl(value, fallback = "") {
  if (!value || typeof value !== "string") return fallback;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCv(value) {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim().toUpperCase();
  const match = raw.match(/(?:CV|TH)?\s*(\d{1,3})/);
  if (!match) return raw;
  const number = Number(match[1]);
  return Number.isInteger(number) && number > 0 ? `CV${number}` : raw;
}

function getSupabaseClient() {
  const cfg = window.FENIX_SUPABASE || window.SUPABASE_CONFIG || window.supabaseConfig || {};
  const url = cfg.url || window.SUPABASE_URL;
  const key = cfg.anonKey || cfg.key || window.SUPABASE_ANON_KEY || window.SUPABASE_PUBLISHABLE_KEY;
  if (!window.supabase || !url || !key) return null;
  try {
    return window.supabase.createClient(url, key);
  } catch (error) {
    console.warn("Supabase não pôde ser inicializado:", error);
    return null;
  }
}

function setupMenu() {
  const toggle = $("menuToggle");
  const nav = $("mainNav");
  const backdrop = $("menuBackdrop");
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove("open");
    toggle.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    document.body.classList.remove("menu-open");
    backdrop?.classList.remove("show");
    backdrop?.setAttribute("aria-hidden", "true");
  };

  toggle.addEventListener("click", () => {
    const opening = !nav.classList.contains("open");
    nav.classList.toggle("open", opening);
    toggle.classList.toggle("active", opening);
    toggle.setAttribute("aria-expanded", String(opening));
    toggle.setAttribute("aria-label", opening ? "Fechar menu" : "Abrir menu");
    document.body.classList.toggle("menu-open", opening);
    backdrop?.classList.toggle("show", opening);
    backdrop?.setAttribute("aria-hidden", String(!opening));
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 650) close();
  }, { passive: true });
}

function setupBackToTop() {
  const button = $("backToTop");
  if (!button) return;
  const sync = () => button.classList.toggle("show", window.scrollY > 450);
  window.addEventListener("scroll", sync, { passive: true });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  sync();
}

function renderLayouts() {
  const grid = $("layoutsGrid");
  const status = $("layoutsStatus");
  if (!grid || !status) return;

  if (!activeCv) {
    grid.hidden = true;
    status.hidden = false;
    status.innerHTML = `<div class="empty-state"><span>🏰</span><strong>Escolha um Centro de Vila.</strong><p>Selecione um dos CVs acima para visualizar os layouts disponíveis.</p></div>`;
    return;
  }

  const filtered = allLayouts.filter((item) => item.cv === activeCv);
  if (!filtered.length) {
    grid.hidden = true;
    status.hidden = false;
    status.innerHTML = `<div class="empty-state"><span>🛡️</span><strong>Ainda não há layouts de ${htmlEscape(activeCv)} cadastrados.</strong><p>Novas bases adicionadas pelo painel aparecerão aqui automaticamente.</p></div>`;
    return;
  }

  status.hidden = false;
  status.innerHTML = `
    <div class="layout-status-bar">
      <div class="layout-status-icon">🛡️</div>
      <div class="layout-status-copy">
        <strong>${htmlEscape(activeCv)} • Catálogo de Bases</strong>
        <span>Visualize a imagem ou abra o layout diretamente no Clash of Clans.</span>
      </div>
      <div class="layout-status-count"><b>${filtered.length}</b><small>${filtered.length === 1 ? "layout disponível" : "layouts disponíveis"}</small></div>
    </div>`;

  grid.hidden = false;
  grid.innerHTML = filtered.map((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    const name = item.name || `Base ${number}`;
    const image = safeExternalUrl(item.image, "");
    const link = safeExternalUrl(item.link, "");

    const imageArea = image
      ? `<button class="layout-thumb layout-thumb-button" type="button" data-layout-image="${htmlEscape(image)}" data-layout-name="${htmlEscape(name)}" aria-label="Ampliar imagem de ${htmlEscape(name)}">
          <span class="layout-number">${number}</span>
          <img src="${htmlEscape(image)}" alt="${htmlEscape(name)}" loading="lazy" onerror="this.closest('.layout-thumb-button')?.setAttribute('disabled','')">
          <span class="layout-zoom-hint" aria-hidden="true">⌕</span>
        </button>`
      : `<div class="layout-thumb"><span class="layout-number">${number}</span><span>${htmlEscape(item.cv)}</span></div>`;

    const visualize = image
      ? `<button class="btn btn-visualize" type="button" data-layout-image="${htmlEscape(image)}" data-layout-name="${htmlEscape(name)}">◉ Visualizar</button>`
      : `<span class="btn btn-secondary" aria-disabled="true">Sem imagem</span>`;

    const open = link
      ? `<a class="btn btn-primary" href="${htmlEscape(link)}" target="_blank" rel="noopener noreferrer">↗ Abrir no Clash</a>`
      : `<span class="btn btn-secondary" aria-disabled="true">Link em breve</span>`;

    return `<article class="layout-card">
      ${imageArea}
      <div class="layout-body">
        <div class="layout-meta">
          <span class="layout-badge">${htmlEscape(item.cv)}</span>
          ${item.featured ? `<span class="layout-badge">⭐ DESTAQUE</span>` : ""}
        </div>
        <div class="layout-title-row"><h3>${htmlEscape(name)}</h3></div>
        <p>${htmlEscape(item.description || "Layout selecionado para a comunidade de Clash of Clans.")}</p>
        <div class="layout-actions">${visualize}${open}</div>
      </div>
    </article>`;
  }).join("");
}

function syncPublicCvFilters() {
  const filters = $("layoutFilters");
  if (!filters) return;
  const cvs = new Set([12, 13, 14, 15, 16, 17, 18]);
  allLayouts.forEach((item) => {
    const match = String(item.cv || "").match(/^CV(\d+)$/);
    const number = match ? Number(match[1]) : 0;
    if (Number.isInteger(number) && number > 0) cvs.add(number);
  });
  filters.innerHTML = [...cvs].sort((a, b) => a - b).map((cv) =>
    `<button class="filter-btn${activeCv === `CV${cv}` ? " active" : ""}" type="button" data-cv="CV${cv}" aria-pressed="${activeCv === `CV${cv}`}">CV${cv}</button>`
  ).join("");
}

function setupLayoutFilters() {
  const filters = $("layoutFilters");
  if (!filters) return;
  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cv]");
    if (!button) return;
    activeCv = button.dataset.cv;
    syncPublicCvFilters();
    renderLayouts();
    if (window.innerWidth <= 650) {
      window.setTimeout(() => $("layoutsStatus")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  });
}

function setupLayoutImageViewer() {
  const grid = $("layoutsGrid");
  if (!grid) return;

  const viewer = document.createElement("div");
  viewer.className = "layout-image-viewer";
  viewer.hidden = true;
  viewer.setAttribute("aria-hidden", "true");
  viewer.innerHTML = `
    <div class="layout-image-viewer-backdrop" data-close-viewer></div>
    <div class="layout-image-viewer-dialog" role="dialog" aria-modal="true" aria-label="Visualização ampliada do layout">
      <button class="layout-image-viewer-close" type="button" aria-label="Fechar imagem">×</button>
      <img class="layout-image-viewer-img" alt="">
      <div class="layout-image-viewer-caption"></div>
    </div>`;
  document.body.appendChild(viewer);

  const image = viewer.querySelector(".layout-image-viewer-img");
  const caption = viewer.querySelector(".layout-image-viewer-caption");
  const closeButton = viewer.querySelector(".layout-image-viewer-close");
  let lastTrigger = null;

  const close = () => {
    if (viewer.hidden) return;
    viewer.classList.remove("show");
    viewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-viewer-open");
    window.setTimeout(() => {
      viewer.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      caption.textContent = "";
    }, 180);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  };

  const open = (button) => {
    const src = safeExternalUrl(button.dataset.layoutImage, "");
    if (!src) return;
    lastTrigger = button;
    image.src = src;
    image.alt = button.dataset.layoutName || "Layout";
    caption.textContent = button.dataset.layoutName || "Layout";
    viewer.hidden = false;
    viewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-viewer-open");
    requestAnimationFrame(() => {
      viewer.classList.add("show");
      closeButton.focus({ preventScroll: true });
    });
  };

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout-image]");
    if (button && !button.disabled) open(button);
  });
  closeButton.addEventListener("click", close);
  viewer.querySelector("[data-close-viewer]").addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !viewer.hidden) close();
  });
}

async function loadCmsAndLayouts() {
  const sb = getSupabaseClient();
  if (!sb) {
    allLayouts = [];
    syncPublicCvFilters();
    renderLayouts();
    return;
  }

  /* Mantém a consulta de configuração para compatibilidade com o CMS atual.
     A identidade pública Villa Basis não é sobrescrita pelos campos antigos do clã. */
  try {
    const { error: configError } = await sb
      .from("site_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (configError) console.warn("Configuração do site não pôde ser consultada:", configError);
  } catch (error) {
    console.warn("CMS não pôde ser consultado:", error);
  }

  try {
    const { data, error } = await sb
      .from("layouts")
      .select("id,nome,cv,tipo,descricao,imagem_url,link_layout,destaque,ordem,criado_em")
      .eq("ativo", true)
      .order("destaque", { ascending: false })
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: false });

    if (error) throw error;

    allLayouts = (data || []).map((row) => ({
      ...row,
      cv: normalizeCv(row.cv),
      name: row.nome || `Layout ${normalizeCv(row.cv) || "Base"}`,
      image: row.imagem_url || "",
      link: row.link_layout || "",
      description: row.descricao || "Layout selecionado para a comunidade de Clash of Clans.",
      featured: row.destaque === true
    })).filter((item) => /^CV\d+$/.test(item.cv));

    syncPublicCvFilters();
    renderLayouts();
  } catch (error) {
    console.error("Erro ao carregar layouts:", error);
    const status = $("layoutsStatus");
    if (status) {
      status.hidden = false;
      status.innerHTML = `<div class="empty-state"><span>⚠️</span><strong>Não foi possível carregar o catálogo.</strong><p>Verifique a conexão e tente novamente em instantes.</p></div>`;
    }
    syncPublicCvFilters();
    renderLayouts();
  }
}

function setCurrentYear() {
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();
}

let publicRefreshPromise = null;
let publicLastRefreshAt = 0;
const PUBLIC_REFRESH_INTERVAL_MS = 45000;

function refreshPublicContent({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - publicLastRefreshAt < 2500) return publicRefreshPromise || Promise.resolve();
  if (publicRefreshPromise) return publicRefreshPromise;
  publicLastRefreshAt = now;
  publicRefreshPromise = Promise.resolve(loadCmsAndLayouts())
    .catch((error) => console.warn("Atualização automática não pôde ser concluída:", error))
    .finally(() => { publicRefreshPromise = null; });
  return publicRefreshPromise;
}

function setupAutomaticPublicRefresh() {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshPublicContent({ force: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshPublicContent({ force: true });
  });
  window.addEventListener("online", () => refreshPublicContent({ force: true }));
  window.setInterval(() => {
    if (!document.hidden) refreshPublicContent();
  }, PUBLIC_REFRESH_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  setupBackToTop();
  setupLayoutFilters();
  setupLayoutImageViewer();
  setCurrentYear();
  syncPublicCvFilters();
  setupAutomaticPublicRefresh();
  refreshPublicContent({ force: true });
});
