const $ = (id) => document.getElementById(id);

const DEFAULT_STORE_URL = "https://store.supercell.com/pt/clashofclans";
const DEFAULT_CLAN_URL = "https://link.clashofclans.com/pt?action=OpenClanProfile&tag=VJ8GGLR8";
const DEFAULT_GROUP_URL = "https://chat.whatsapp.com/FJ7RJlbYxWT6wyPDNKk0GF";
let allLayouts = [];
let activeCv = null;

function text(id, value) {
  const node = $(id);
  if (node && value !== undefined && value !== null && String(value).trim() !== "") node.textContent = value;
}

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
    if (!["http:", "https:"].includes(url.protocol)) return fallback;
    return url.href;
  } catch {
    return fallback;
  }
}

function safeStoreUrl(value) {
  if (!value || /share\.google/i.test(value)) return DEFAULT_STORE_URL;
  return safeExternalUrl(value, DEFAULT_STORE_URL);
}

function setLink(id, href) {
  const node = $(id);
  if (node && href) node.href = href;
}

function normalizeCv(value) {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim().toUpperCase();
  const match = raw.match(/(?:CV|TH)?\s*(\d{1,3})/);
  if (!match) return raw;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? `CV${n}` : raw;
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

  let lastFocused = null;
  const links = [...nav.querySelectorAll("a")];

  const close = ({ restoreFocus = false } = {}) => {
    nav.classList.remove("open");
    toggle.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    document.body.classList.remove("menu-open");
    if (backdrop) {
      backdrop.classList.remove("show");
      backdrop.setAttribute("aria-hidden", "true");
    }
    if (restoreFocus && lastFocused && document.contains(lastFocused)) {
      lastFocused.focus({ preventScroll: true });
    }
  };

  const open = () => {
    lastFocused = document.activeElement;
    nav.classList.add("open");
    toggle.classList.add("active");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    document.body.classList.add("menu-open");
    if (backdrop) {
      backdrop.classList.add("show");
      backdrop.setAttribute("aria-hidden", "false");
    }
    requestAnimationFrame(() => links[0]?.focus({ preventScroll: true }));
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    nav.classList.contains("open") ? close() : open();
  });
  links.forEach((link) => link.addEventListener("click", () => close()));
  document.querySelector(".brand")?.addEventListener("click", () => close());
  backdrop?.addEventListener("click", () => close({ restoreFocus: true }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) close({ restoreFocus: true });
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 780 && nav.classList.contains("open")) close();
  }, { passive: true });
}

function setupBackToTop() {
  const btn = $("backToTop");
  if (!btn) return;
  const sync = () => btn.classList.toggle("show", window.scrollY > 550);
  window.addEventListener("scroll", sync, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  sync();
}

function renderResources(resources) {
  const grid = $("resourcesGrid");
  if (!grid || !Array.isArray(resources)) return;
  const enabled = resources.filter((item) => item && item.enabled !== false);
  if (!enabled.length) return;
  grid.innerHTML = enabled.map((item) => `
    <article class="feature-card">
      <span>${htmlEscape(item.icon || "🔥")}</span>
      <h3>${htmlEscape(item.title || "Clã Fênix")}</h3>
      <p>${htmlEscape(item.text || "")}</p>
    </article>
  `).join("");
}

function renderValues(values) {
  const grid = $("valuesGrid");
  if (!grid || !Array.isArray(values)) return;
  const enabled = values.filter((item) => item && item.enabled !== false);
  if (!enabled.length) return;
  grid.innerHTML = enabled.map((item) => `
    <div class="value-pill"><span>${htmlEscape(item.icon || "🔥")}</span>${htmlEscape(item.title || "")}</div>
  `).join("");
}

function applySiteConfig(cfg) {
  if (!cfg) return;

  const clanName = cfg.clan_name || "CLÃ FÊNIX";
  const tag = cfg.clan_tag || "#VJ8GGLR8";
  text("brandName", clanName);
  text("footerClanName", clanName);
  text("brandTag", tag);
  text("footerTag", tag);
  text("portalLabel", cfg.portal_label);
  text("heroEyebrow", cfg.hero_eyebrow);

  if (cfg.hero_title && String(cfg.hero_title).trim()) {
    const parts = String(cfg.hero_title).trim().split(/\s+/);
    if (parts.length > 1) {
      text("heroTitle", parts.slice(0, -1).join(" "));
      text("heroTitleEm", parts.at(-1));
    } else {
      text("heroTitle", parts[0]);
      text("heroTitleEm", "OFICIAL");
    }
  }

  text("heroIntro", cfg.hero_intro);
  text("heroSecondary", cfg.hero_secondary);
  text("heroSlogan", cfg.slogan);
  text("missionIcon", cfg.mission_icon);
  text("missionKicker", cfg.mission_kicker);
  text("missionTitle", cfg.mission_title);
  text("missionText", cfg.mission_text);

  text("resourcesKicker", cfg.resources_kicker);
  text("resourcesTitle", cfg.resources_title);
  text("resourcesSubtitle", cfg.resources_subtitle);
  renderResources(cfg.resources);

  text("layoutsKicker", cfg.layouts_kicker);
  text("layoutsTitle", cfg.layouts_title);
  text("layoutsSubtitle", cfg.layouts_subtitle);

  text("valuesKicker", cfg.values_kicker);
  text("valuesTitle", cfg.values_title);
  renderValues(cfg.values);

  text("familyKicker", cfg.family_kicker);
  text("familyTitle", cfg.family_title);
  text("familyText", cfg.family_text);
  text("familyQuote", cfg.family_quote);
  text("familyCta", cfg.family_cta);

  const clanUrl = safeExternalUrl(cfg.link_clan_url, DEFAULT_CLAN_URL);
  const groupUrl = safeExternalUrl(cfg.link_group_url, DEFAULT_GROUP_URL);
  const storeUrl = safeStoreUrl(cfg.link_store_url);
  setLink("heroClanLink", clanUrl);
  setLink("familyCta", clanUrl);
  setLink("clanCard", clanUrl);
  setLink("groupCard", groupUrl);
  setLink("storeCard", storeUrl);

  text("clanCardLabel", cfg.link_clan_label);
  text("clanCardText", cfg.link_clan_text);
  text("clanCardCta", cfg.link_clan_cta);
  text("groupCardLabel", cfg.link_group_label);
  text("groupCardText", cfg.link_group_text);
  text("groupCardCta", cfg.link_group_cta);
  text("storeCardLabel", cfg.link_store_label);
  text("storeCardText", cfg.link_store_text);
  text("storeCardCta", cfg.link_store_cta);


  const heroBg = safeExternalUrl(cfg.hero_background_url, "");
  const familyBg = safeExternalUrl(cfg.family_background_url, "");
  if (heroBg) $("inicio")?.style.setProperty("--hero-image", `url("${heroBg.replaceAll('"', '%22')}")`);
  if (familyBg) $("recruitmentCard")?.style.setProperty("--family-image", `url("${familyBg.replaceAll('"', '%22')}")`);

  let primary = /^#[0-9a-f]{6}$/i.test(cfg.primary_color || "") ? cfg.primary_color : null;
  let accent = /^#[0-9a-f]{6}$/i.test(cfg.accent_color || "") ? cfg.accent_color : null;
  let bg = /^#[0-9a-f]{6}$/i.test(cfg.background_color || "") ? cfg.background_color : null;

  // Mantém o tema clássico vermelho como padrão e reconverte o tema dourado anterior.
  if (["#b77a18","#d83a1e"].includes(String(primary).toLowerCase())) primary = "#b82c15";
  if (["#f2c767","#f2ad22"].includes(String(accent).toLowerCase())) accent = "#df4b1d";
  if (["#070706","#070605"].includes(String(bg).toLowerCase())) bg = "#080705";

  if (primary) {
    document.documentElement.style.setProperty("--primary", primary);
    document.documentElement.style.setProperty("--primary-2", "#df4b1d");
    document.documentElement.style.setProperty("--line", "rgba(223,75,29,.18)");
    document.documentElement.style.setProperty("--line-strong", "rgba(223,75,29,.36)");
    document.documentElement.style.setProperty("--glow", "rgba(223,75,29,.22)");
  }
  if (accent) document.documentElement.style.setProperty("--accent", accent);
  if (bg) {
    document.documentElement.style.setProperty("--bg", bg);
    document.documentElement.style.setProperty("--bg-2", "#0c0807");
  }
  document.documentElement.style.setProperty("--accent-2", "#f05a2b");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", "#8d2016");

  const visibilityMap = [
    ["show_hero", "inicio"],
    ["show_quick_links", "atalhos"],
    ["show_mission", "missao"],
    ["show_resources", "recursos"],
    ["show_layouts", "layouts"],
    ["show_values", "valores"],
    ["show_family", "recrutamento"]
  ];
  visibilityMap.forEach(([field, id]) => {
    const section = $(id);
    if (section) section.hidden = cfg[field] === false;
  });
}

function renderLayouts() {
  const grid = $("layoutsGrid");
  const status = $("layoutsStatus");
  if (!grid || !status) return;

  if (!activeCv) {
    grid.hidden = true;
    status.hidden = false;
    status.innerHTML = `
      <div class="empty-state">
        <span>🏰</span>
        <strong>Escolha um Centro de Vila.</strong>
        <p>Toque em uma das galerias acima para visualizar somente os layouts daquele CV.</p>
      </div>`;
    return;
  }

  const filtered = allLayouts.filter((item) => item.cv === activeCv);
  if (!filtered.length) {
    grid.hidden = true;
    status.hidden = false;
    status.innerHTML = `
      <div class="empty-state">
        <span>🛡️</span>
        <strong>Ainda não há layouts de ${htmlEscape(activeCv)} cadastrados.</strong>
        <p>Quando novas bases forem adicionadas pelo painel, elas aparecerão aqui automaticamente.</p>
      </div>`;
    return;
  }

  status.hidden = false;
  status.innerHTML = `
    <div class="layout-status-bar">
      <div class="layout-status-icon">🛡️</div>
      <div class="layout-status-copy">
        <strong>${htmlEscape(activeCv)} • Arsenal de Bases</strong>
        <span>Escolha sua base, amplie a imagem e abra direto no Clash of Clans.</span>
      </div>
      <div class="layout-status-count"><b>${filtered.length}</b><small>${filtered.length === 1 ? "layout disponível" : "layouts disponíveis"}</small></div>
    </div>`;

  grid.hidden = false;
  grid.innerHTML = filtered.map((item, index) => {
    const number = String(index + 1).padStart(2, "0");
    const imageButton = item.image ? `
      <button class="layout-thumb layout-thumb-button" type="button" data-layout-image="${htmlEscape(item.image)}" data-layout-name="${htmlEscape(item.name)}" aria-label="Ampliar imagem de ${htmlEscape(item.name)}">
        <span class="layout-number">${number}</span>
        <img src="${htmlEscape(item.image)}" alt="${htmlEscape(item.name)}" loading="lazy" decoding="async" fetchpriority="low" onerror="this.closest('.layout-thumb-button')?.setAttribute('disabled','')">
        <span class="layout-zoom-hint" aria-hidden="true">⌕</span>
      </button>` : `
      <div class="layout-thumb"><span class="layout-number">${number}</span><span>${htmlEscape(item.cv || "BASE")}</span></div>`;

    const safeLink = safeExternalUrl(item.link, "");
    const visualize = item.image
      ? `<button class="btn btn-visualize" type="button" data-layout-image="${htmlEscape(item.image)}" data-layout-name="${htmlEscape(item.name)}">◉ Visualizar</button>`
      : `<span class="btn btn-secondary" aria-disabled="true">Sem imagem</span>`;
    const open = safeLink
      ? `<a class="btn btn-primary" href="${htmlEscape(safeLink)}" target="_blank" rel="noopener">↗ Abrir no Clash</a>`
      : `<span class="btn btn-secondary" aria-disabled="true">Link em breve</span>`;

    return `
      <article class="layout-card">
        ${imageButton}
        <div class="layout-body">
          <div class="layout-meta">
            <span class="layout-badge">${htmlEscape(item.cv)}</span>
            ${item.featured ? `<span class="layout-badge">⭐ DESTAQUE</span>` : ""}
          </div>
          <div class="layout-title-row"><h3>${htmlEscape(item.name || `Base ${number}`)}</h3></div>
          <p>${htmlEscape(item.description || "Layout selecionado para a Família Fênix.")}</p>
          <div class="layout-actions">${visualize}${open}</div>
        </div>
      </article>`;
  }).join("");
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

  const closeViewer = () => {
    if (viewer.hidden) return;
    viewer.classList.remove("show");
    viewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-viewer-open");
    setTimeout(() => {
      viewer.hidden = true;
      image.removeAttribute("src");
      image.alt = "";
      caption.textContent = "";
    }, 180);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  };

  const openViewer = (button) => {
    const src = safeExternalUrl(button.dataset.layoutImage, "");
    if (!src) return;
    const name = button.dataset.layoutName || "Layout";
    lastTrigger = button;
    image.src = src;
    image.alt = name;
    caption.textContent = name;
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
    if (!button || button.disabled) return;
    openViewer(button);
  });
  closeButton.addEventListener("click", closeViewer);
  viewer.querySelector("[data-close-viewer]").addEventListener("click", closeViewer);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !viewer.hidden) closeViewer(); });
}

function syncPublicCvFilters() {
  const filters = $("layoutFilters");
  if (!filters) return;
  const cvs = new Set([12, 13, 14, 15, 16, 17, 18]);
  allLayouts.forEach((item) => {
    const match = String(item.cv || "").match(/^CV(\d+)$/);
    const n = match ? Number(match[1]) : 0;
    if (Number.isInteger(n) && n > 0) cvs.add(n);
  });
  const ordered = [...cvs].sort((a, b) => a - b);
  filters.innerHTML = ordered.map((cv) => `<button class="filter-btn${activeCv === `CV${cv}` ? " active" : ""}" type="button" data-cv="CV${cv}">CV${cv}</button>`).join("");
}

function setupLayoutFilters() {
  const filters = $("layoutFilters");
  if (!filters) return;
  filters.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cv]");
    if (!btn) return;
    activeCv = btn.dataset.cv;
    filters.querySelectorAll(".filter-btn").forEach((node) => node.classList.toggle("active", node === btn));
    renderLayouts();
    if (window.innerWidth <= 780) setTimeout(() => $("layoutsStatus")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  });
}

async function loadCmsAndLayouts() {
  const sb = getSupabaseClient();
  if (!sb) {
    syncPublicCvFilters();
    renderLayouts();
    return;
  }

  try {
    const { data: configData, error: configError } = await sb.from("site_config").select("*").eq("id", 1).maybeSingle();
    if (!configError && configData) applySiteConfig(configData);
  } catch (error) {
    console.warn("CMS não pôde ser carregado:", error);
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
      description: row.descricao || "Layout selecionado pelo Clã Fênix.",
      featured: row.destaque === true
    })).filter((item) => /^CV\d+$/.test(item.cv));

    syncPublicCvFilters();
    renderLayouts();
  } catch (error) {
    console.error("Erro ao carregar layouts:", error);
    syncPublicCvFilters();
    renderLayouts();
  }
}


function setupPremiumReveal() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.premium-panel,.quick-card,.clan-family-card,.feature-card,.layout-card,.value-pill,.section-heading');
  targets.forEach((node, index) => {
    node.classList.add('premium-reveal');
    node.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 45}ms`);
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('premium-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  targets.forEach((node) => observer.observe(node));
}

function setCurrentYear() {
  text("year", new Date().getFullYear());
}

// Mantém o conteúdo público sincronizado sem exigir F5/Atualizar manualmente.
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
  // Ao voltar para uma página restaurada pelo navegador (cache de navegação), busca os dados atuais.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshPublicContent({ force: true });
  });

  // Ao voltar para a aba/site depois de usar o painel ou outro app, sincroniza novamente.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshPublicContent({ force: true });
  });

  // Se a internet cair e voltar, busca novamente as informações do Supabase.
  window.addEventListener("online", () => refreshPublicContent({ force: true }));

  // Enquanto a página estiver aberta e visível, verifica mudanças periodicamente.
  window.setInterval(() => {
    if (!document.hidden) refreshPublicContent();
  }, PUBLIC_REFRESH_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  setupMenu();
  setupBackToTop();
  setupLayoutFilters();
  setupLayoutImageViewer();
  syncPublicCvFilters();
  setCurrentYear();
  setupAutomaticPublicRefresh();
  setupPremiumReveal();
  refreshPublicContent({ force: true });
});
