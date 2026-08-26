(() => {
  const cfg = window.FENIX_SUPABASE || {};
  const configured = cfg.url && cfg.anonKey && !cfg.url.includes('COLE_') && !cfg.anonKey.includes('COLE_');
  const sb = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  const $ = id => document.getElementById(id);

  const DEFAULT_RESOURCES=[
    {icon:'⚔️',title:'Guerras organizadas',text:'Guerras organizadas diariamente.',enabled:true},{icon:'🎯',title:'Liga de Guerra',text:'Participação e organização para CWL.',enabled:true},
    {icon:'🎁',title:'Sorteios',text:'Sorteios e premiações exclusivas.',enabled:true},{icon:'🤝',title:'Doações rápidas',text:'Doações disponíveis 24 horas.',enabled:true},
    {icon:'📢',title:'Notícias oficiais',text:'Informações e avisos do Clã Fênix.',enabled:true},{icon:'📊',title:'Estatísticas',text:'Estatísticas e desempenho do clã.',enabled:true},
    {icon:'👑',title:'Liderança ativa',text:'Gestão organizada e presente.',enabled:true},{icon:'🎥',title:'Vídeos exclusivos',text:'Vídeos, estratégias e conteúdos.',enabled:true}
  ];
  const DEFAULT_VALUES=[{icon:'🔥',title:'Compromisso',enabled:true},{icon:'🤝',title:'Respeito',enabled:true},{icon:'⚔️',title:'Trabalho em equipe',enabled:true},{icon:'📈',title:'Evolução constante',enabled:true},{icon:'🛡️',title:'Lealdade ao Clã',enabled:true}];
  const DEFAULT_CONFIG={
    id:1,clan_name:'CLÃ FÊNIX',portal_label:'PORTAL OFICIAL',slogan:'Força • Honra • União',clan_tag:'#VJ8GGLR8',hero_eyebrow:'🔥 CLÃ FÊNIX',hero_title:'PORTAL OFICIAL',
    hero_intro:'Bem-vindo ao Clã Fênix, uma comunidade dedicada aos jogadores que buscam evolução, organização e competitividade no Clash of Clans.',hero_secondary:'Nossa missão é reunir jogadores comprometidos, fortalecer a equipe e conquistar vitórias através da estratégia, respeito e trabalho em equipe.',
    hero_background_url:'',family_background_url:'',
    link_clan_url:'https://link.clashofclans.com/pt?action=OpenClanProfile&tag=VJ8GGLR8',link_clan_label:'VER CLÃ',link_clan_text:'Acesse o nosso Clã diretamente no jogo.',link_clan_cta:'ACESSAR AGORA →',
    link_group_url:'https://chat.whatsapp.com/FJ7RJlbYxWT6wyPDNKk0GF',link_group_label:'GRUPO OFICIAL',link_group_text:'Entre no grupo oficial do Clã Fênix.',link_group_cta:'ENTRAR AGORA →',
    link_store_url:'https://store.supercell.com/pt/clashofclans',link_store_label:'LOJA OFICIAL',link_store_text:'Apoie o jogo acessando a loja oficial.',link_store_cta:'ACESSAR LOJA →',
    mission_icon:'🦅',mission_kicker:'⭐ NOSSA MISSÃO',mission_title:'Uma família forte, organizada e respeitada.',mission_text:'Construir uma família forte, organizada e respeitada, oferecendo um ambiente competitivo, divertido e acolhedor para todos os membros.',
    resources_kicker:'⚔️ O QUE VOCÊ ENCONTRA AQUI',resources_title:'Um portal feito para a Família Fênix',resources_subtitle:'Organização, conteúdo e ferramentas para acompanhar o clã em um só lugar.',resources:DEFAULT_RESOURCES,
    layouts_kicker:'🏰 ARSENAL DE BASES',layouts_title:'Layouts do Clã Fênix',layouts_subtitle:'Escolha seu Centro de Vila, encontre uma base e abra o link diretamente no Clash of Clans.',values_kicker:'🏆 NOSSOS VALORES',values_title:'O que mantém a Fênix de pé',values:DEFAULT_VALUES,
    family_kicker:'🚀 FAÇA PARTE DA FAMÍLIA FÊNIX',family_title:'Junte-se ao nosso exército.',family_text:'Junte-se ao nosso exército e evolua ao lado de jogadores dedicados. Aqui cada batalha fortalece nossa história e cada vitória nos aproxima da grandeza.',family_quote:'“Das cinzas renascemos mais fortes.”',family_cta:'ENTRAR NO CLÃ →',
    primary_color:'#b82c15',accent_color:'#df4b1d',background_color:'#080705',show_hero:true,show_quick_links:true,show_mission:true,show_resources:true,show_layouts:true,show_values:true,show_family:true
  };

  const loginPage=$('loginPage'),dashboard=$('dashboard'),listEl=$('layoutList'),emptyEl=$('emptyAdmin'),modal=$('layoutModal'),layoutForm=$('layoutForm'),toastEl=$('toast'),confirmModal=$('confirmModal');
  let layouts=[],deleteTarget=null,siteConfig={...DEFAULT_CONFIG},cmsReady=true;

  function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>toastEl.classList.remove('show'),2300);}
  function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function ph(cv){return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><rect width="100%" height="100%" fill="#0b0907"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#ff6a00" font-size="70" font-family="Arial" font-weight="700">CV${cv}</text><text x="50%" y="64%" dominant-baseline="middle" text-anchor="middle" fill="#d9d0ca" font-size="28" font-family="Arial">CLÃ FÊNIX</text></svg>`)}`;}
  function ensureConfigured(){if(sb)return true;$('loginMessage').textContent='Configure primeiro o arquivo supabase-config.js.';return false;}
  function value(id){return $(id)?.value?.trim()??'';} function checked(id){return !!$(id)?.checked;} function setValue(id,v){if($(id))$(id).value=v??'';} function setChecked(id,v){if($(id))$(id).checked=v!==false;}

  async function init(){if(!ensureConfigured())return;const {data:{session}}=await sb.auth.getSession();if(session)await showDashboard();else showLogin();sb.auth.onAuthStateChange(async(_event,session)=>session?await showDashboard():showLogin());}
  function showLogin(){loginPage.hidden=false;dashboard.hidden=true;}
  async function showDashboard(){loginPage.hidden=true;dashboard.hidden=false;await Promise.all([loadConfig(),loadLayouts(),loadImportCandidates()]);}
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!ensureConfigured())return;const msg=$('loginMessage');msg.textContent='Entrando...';const {error}=await sb.auth.signInWithPassword({email:value('loginEmail'),password:$('loginPassword').value});msg.textContent=error?'E-mail ou senha incorretos.':'';});
  $('btnLogout').addEventListener('click',async()=>{if(sb)await sb.auth.signOut();});

  // -------- Navegação do painel --------
  const titles={overview:'Visão geral',home:'Página inicial',links:'Links oficiais',content:'Missão e conteúdo',appearance:'Aparência',layouts:'Layouts'};
  function openView(name){document.querySelectorAll('[data-view-panel]').forEach(p=>{p.hidden=p.dataset.viewPanel!==name;p.classList.toggle('active',p.dataset.viewPanel===name);});document.querySelectorAll('.sidebar [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('pageTitle').textContent=titles[name]||'Painel';closeSidebar();window.scrollTo({top:0,behavior:'smooth'});}
  document.addEventListener('click',e=>{const btn=e.target.closest('[data-view]');if(btn&&!btn.closest('[data-view-panel] form')){const name=btn.dataset.view;if(titles[name])openView(name);}});
  const sidebarBackdrop=$('adminSidebarBackdrop');
  function closeSidebar(){
    $('sidebar').classList.remove('open');
    if(sidebarBackdrop){sidebarBackdrop.classList.remove('show');sidebarBackdrop.hidden=true;sidebarBackdrop.setAttribute('aria-hidden','true');}
  }
  function toggleSidebar(){
    const opening=!$('sidebar').classList.contains('open');
    $('sidebar').classList.toggle('open',opening);
    if(sidebarBackdrop){sidebarBackdrop.hidden=!opening;sidebarBackdrop.classList.toggle('show',opening);sidebarBackdrop.setAttribute('aria-hidden',opening?'false':'true');}
  }
  $('menuBtn').onclick=toggleSidebar;
  sidebarBackdrop?.addEventListener('click',closeSidebar);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSidebar();if(!modal.hidden)closeModal();if(!confirmModal.hidden){confirmModal.hidden=true;deleteTarget=null;}}});
  window.addEventListener('resize',()=>{if(window.innerWidth>760)closeSidebar();},{passive:true});

  // -------- Configuração do site --------
  async function loadConfig(){
    const {data,error}=await sb.from('site_config').select('*').eq('id',1).maybeSingle();
    if(error){console.warn(error);cmsReady=false;siteConfig={...DEFAULT_CONFIG};$('cmsNotice').hidden=false;$('mSiteStatus').textContent='!';fillConfigForms();return;}
    cmsReady=true;$('cmsNotice').hidden=true;$('mSiteStatus').textContent='✓';siteConfig={...DEFAULT_CONFIG,...(data||{})};
    if(!Array.isArray(siteConfig.resources))siteConfig.resources=[...DEFAULT_RESOURCES];if(!Array.isArray(siteConfig.values))siteConfig.values=[...DEFAULT_VALUES];fillConfigForms();
  }
  function fillConfigForms(){
    const c=siteConfig;
    setValue('cfgClanName',c.clan_name);setValue('cfgPortalLabel',c.portal_label);setValue('cfgSlogan',c.slogan);setValue('cfgClanTag',c.clan_tag);setValue('cfgHeroEyebrow',c.hero_eyebrow);setValue('cfgHeroTitle',c.hero_title);setValue('cfgHeroIntro',c.hero_intro);setValue('cfgHeroSecondary',c.hero_secondary);setValue('cfgLayoutsKicker',c.layouts_kicker);setValue('cfgLayoutsTitle',c.layouts_title);setValue('cfgLayoutsSubtitle',c.layouts_subtitle);
    setValue('cfgClanUrl',c.link_clan_url);setValue('cfgClanLabel',c.link_clan_label);setValue('cfgClanText',c.link_clan_text);setValue('cfgClanCta',c.link_clan_cta);setValue('cfgGroupUrl',c.link_group_url);setValue('cfgGroupLabel',c.link_group_label);setValue('cfgGroupText',c.link_group_text);setValue('cfgGroupCta',c.link_group_cta);setValue('cfgStoreUrl',c.link_store_url);setValue('cfgStoreLabel',c.link_store_label);setValue('cfgStoreText',c.link_store_text);setValue('cfgStoreCta',c.link_store_cta);
    setValue('cfgMissionIcon',c.mission_icon);setValue('cfgMissionKicker',c.mission_kicker);setValue('cfgMissionTitle',c.mission_title);setValue('cfgMissionText',c.mission_text);setValue('cfgResourcesKicker',c.resources_kicker);setValue('cfgResourcesTitle',c.resources_title);setValue('cfgResourcesSubtitle',c.resources_subtitle);setValue('cfgValuesKicker',c.values_kicker);setValue('cfgValuesTitle',c.values_title);setValue('cfgFamilyKicker',c.family_kicker);setValue('cfgFamilyTitle',c.family_title);setValue('cfgFamilyText',c.family_text);setValue('cfgFamilyQuote',c.family_quote);setValue('cfgFamilyCta',c.family_cta);renderResourceEditor();renderValuesEditor();
    c.primary_color=normalizeThemeColor('primary',c.primary_color||'#b82c15');
    c.accent_color=normalizeThemeColor('accent',c.accent_color||'#df4b1d');
    c.background_color=normalizeThemeColor('background',c.background_color||'#080705');
    setColor('Primary',c.primary_color);setColor('Accent',c.accent_color);setColor('Background',c.background_color);setChecked('showHero',c.show_hero);setChecked('showQuickLinks',c.show_quick_links);setChecked('showMission',c.show_mission);setChecked('showResources',c.show_resources);setChecked('showLayouts',c.show_layouts);setChecked('showValues',c.show_values);setChecked('showFamily',c.show_family);updateAssetPreviews();
  }
  async function saveConfig(patch,msg='Alterações salvas!'){
    if(!cmsReady){toast('A configuração do CMS não está disponível no Supabase.');return false;}
    const payload={...patch,updated_at:new Date().toISOString()};const {data,error}=await sb.from('site_config').update(payload).eq('id',1).select().single();if(error){console.error(error);toast(error.message||'Erro ao salvar.');return false;}siteConfig={...siteConfig,...data};toast(msg);return true;
  }
  function wireForm(id,collector,msg){$(id).addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;if(btn){btn.disabled=true;btn.textContent='Salvando...';}await saveConfig(collector(),msg);if(btn){btn.disabled=false;btn.textContent=btn.dataset.original||({homeForm:'Salvar alterações',linksForm:'Salvar links',contentForm:'Salvar conteúdo',appearanceForm:'Salvar aparência'}[id]||'Salvar');}});}
  wireForm('homeForm',()=>({clan_name:value('cfgClanName'),portal_label:value('cfgPortalLabel'),slogan:value('cfgSlogan'),clan_tag:value('cfgClanTag'),hero_eyebrow:value('cfgHeroEyebrow'),hero_title:value('cfgHeroTitle'),hero_intro:value('cfgHeroIntro'),hero_secondary:value('cfgHeroSecondary'),layouts_kicker:value('cfgLayoutsKicker'),layouts_title:value('cfgLayoutsTitle'),layouts_subtitle:value('cfgLayoutsSubtitle')}),'Página inicial atualizada!');
  wireForm('linksForm',()=>({link_clan_url:value('cfgClanUrl'),link_clan_label:value('cfgClanLabel'),link_clan_text:value('cfgClanText'),link_clan_cta:value('cfgClanCta'),link_group_url:value('cfgGroupUrl'),link_group_label:value('cfgGroupLabel'),link_group_text:value('cfgGroupText'),link_group_cta:value('cfgGroupCta'),link_store_url:value('cfgStoreUrl'),link_store_label:value('cfgStoreLabel'),link_store_text:value('cfgStoreText'),link_store_cta:value('cfgStoreCta')}),'Links atualizados!');

  function collectResources(){return [...$('resourceEditor').querySelectorAll('.repeat-row')].map(row=>({icon:row.querySelector('[data-field="icon"]').value.trim()||'🔥',title:row.querySelector('[data-field="title"]').value.trim(),text:row.querySelector('[data-field="text"]').value.trim(),enabled:row.querySelector('[data-field="enabled"]').checked}));}
  function collectValues(){return [...$('valuesEditor').querySelectorAll('.repeat-row')].map(row=>({icon:row.querySelector('[data-field="icon"]').value.trim()||'🔥',title:row.querySelector('[data-field="title"]').value.trim(),enabled:row.querySelector('[data-field="enabled"]').checked}));}
  wireForm('contentForm',()=>({mission_icon:value('cfgMissionIcon'),mission_kicker:value('cfgMissionKicker'),mission_title:value('cfgMissionTitle'),mission_text:value('cfgMissionText'),resources_kicker:value('cfgResourcesKicker'),resources_title:value('cfgResourcesTitle'),resources_subtitle:value('cfgResourcesSubtitle'),resources:collectResources(),values_kicker:value('cfgValuesKicker'),values_title:value('cfgValuesTitle'),values:collectValues(),family_kicker:value('cfgFamilyKicker'),family_title:value('cfgFamilyTitle'),family_text:value('cfgFamilyText'),family_quote:value('cfgFamilyQuote'),family_cta:value('cfgFamilyCta')}),'Conteúdo atualizado!');
  function renderResourceEditor(){const arr=siteConfig.resources||[];$('resourceEditor').innerHTML=arr.map((x,i)=>`<div class="repeat-row" data-index="${i}"><label>Ícone<input data-field="icon" value="${esc(x.icon||'')}"></label><label>Título<input data-field="title" value="${esc(x.title||'')}"></label><label>Descrição<input data-field="text" value="${esc(x.text||'')}"></label><label class="enabled-wrap" title="Mostrar"><input type="checkbox" data-field="enabled" ${x.enabled!==false?'checked':''}></label><div class="move-group"><button class="icon-btn" type="button" data-move-up="${i}">↑</button><button class="icon-btn" type="button" data-move-down="${i}">↓</button><button class="icon-btn delete" type="button" data-remove-resource="${i}">✕</button></div></div>`).join('');}
  function renderValuesEditor(){const arr=siteConfig.values||[];$('valuesEditor').innerHTML=arr.map((x,i)=>`<div class="repeat-row" data-index="${i}"><label>Ícone<input data-field="icon" value="${esc(x.icon||'')}"></label><label>Valor<input data-field="title" value="${esc(x.title||'')}"></label><label class="enabled-wrap" title="Mostrar"><input type="checkbox" data-field="enabled" ${x.enabled!==false?'checked':''}></label><div class="move-group"><button class="icon-btn" type="button" data-value-up="${i}">↑</button><button class="icon-btn" type="button" data-value-down="${i}">↓</button><button class="icon-btn delete" type="button" data-remove-value="${i}">✕</button></div></div>`).join('');}
  $('addResource').onclick=()=>{siteConfig.resources=collectResources();siteConfig.resources.push({icon:'🔥',title:'Novo card',text:'Descrição do card.',enabled:true});renderResourceEditor();};
  $('addValue').onclick=()=>{siteConfig.values=collectValues();siteConfig.values.push({icon:'🔥',title:'Novo valor',enabled:true});renderValuesEditor();};
  $('resourceEditor').addEventListener('click',e=>{let arr=collectResources();const rem=e.target.closest('[data-remove-resource]'),up=e.target.closest('[data-move-up]'),down=e.target.closest('[data-move-down]');if(rem){arr.splice(+rem.dataset.removeResource,1);}else if(up){const i=+up.dataset.moveUp;if(i>0)[arr[i-1],arr[i]]=[arr[i],arr[i-1]];}else if(down){const i=+down.dataset.moveDown;if(i<arr.length-1)[arr[i+1],arr[i]]=[arr[i],arr[i+1]];}else return;siteConfig.resources=arr;renderResourceEditor();});
  $('valuesEditor').addEventListener('click',e=>{let arr=collectValues();const rem=e.target.closest('[data-remove-value]'),up=e.target.closest('[data-value-up]'),down=e.target.closest('[data-value-down]');if(rem){arr.splice(+rem.dataset.removeValue,1);}else if(up){const i=+up.dataset.valueUp;if(i>0)[arr[i-1],arr[i]]=[arr[i],arr[i-1]];}else if(down){const i=+down.dataset.valueDown;if(i<arr.length-1)[arr[i+1],arr[i]]=[arr[i],arr[i+1]];}else return;siteConfig.values=arr;renderValuesEditor();});

  function normalizeThemeColor(kind,color){
    const raw=String(color||'').toLowerCase();
    if(kind==='primary' && ['#b77a18','#d83a1e'].includes(raw)) return '#b82c15';
    if(kind==='accent' && ['#f2c767','#f2ad22'].includes(raw)) return '#df4b1d';
    if(kind==='background' && ['#070706','#070605'].includes(raw)) return '#080705';
    return color;
  }
  function setColor(name,color){const kind=({Primary:'primary',Accent:'accent',Background:'background'})[name];const normalized=normalizeThemeColor(kind,color);const c=/^#[0-9a-f]{6}$/i.test(normalized)?normalized:'#000000';setValue(`cfg${name}Color`,c);setValue(`cfg${name}ColorText`,c);}
  ['Primary','Accent','Background'].forEach(name=>{const picker=$(`cfg${name}Color`),textInput=$(`cfg${name}ColorText`);picker.addEventListener('input',()=>textInput.value=picker.value);textInput.addEventListener('input',()=>{if(/^#[0-9a-f]{6}$/i.test(textInput.value))picker.value=textInput.value;});});
  function adminAssetUrl(url){if(!url)return '';return String(url).startsWith('assets/')?`../${url}`:url;}
  function updateAssetPreviews(){const heroBg=adminAssetUrl(siteConfig.hero_background_url),familyBg=adminAssetUrl(siteConfig.family_background_url);$('heroBgPreview').style.backgroundImage=heroBg?`url("${heroBg}")`:'';$('familyBgPreview').style.backgroundImage=familyBg?`url("${familyBg}")`:'';}
  function previewBackground(input,targetId){input?.addEventListener('change',()=>{const f=input.files[0];if(!f)return;const url=URL.createObjectURL(f);$(targetId).style.backgroundImage=`url("${url}")`;});}
  previewBackground($('cfgHeroBgFile'),'heroBgPreview');previewBackground($('cfgFamilyBgFile'),'familyBgPreview');
  async function uploadSiteAsset(file,prefix){if(!file)return null;if(file.size>8*1024*1024)throw new Error('A imagem deve ter no máximo 8 MB.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`${prefix}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;const {error}=await sb.storage.from('site-assets').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;const {data}=sb.storage.from('site-assets').getPublicUrl(path);return data.publicUrl;}
  $('appearanceForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!cmsReady){toast('A configuração do CMS não está disponível no Supabase.');return;}const btn=e.submitter;btn.disabled=true;btn.textContent='Enviando...';
    try{
      let hero_background_url=siteConfig.hero_background_url,family_background_url=siteConfig.family_background_url;
      const heroFile=$('cfgHeroBgFile').files[0],familyFile=$('cfgFamilyBgFile').files[0];
      if(heroFile)hero_background_url=await uploadSiteAsset(heroFile,'hero-bg');
      if(familyFile)family_background_url=await uploadSiteAsset(familyFile,'family-bg');
      const ok=await saveConfig({hero_background_url,family_background_url,primary_color:value('cfgPrimaryColorText'),accent_color:value('cfgAccentColorText'),background_color:value('cfgBackgroundColorText'),show_hero:checked('showHero'),show_quick_links:checked('showQuickLinks'),show_mission:checked('showMission'),show_resources:checked('showResources'),show_layouts:checked('showLayouts'),show_values:checked('showValues'),show_family:checked('showFamily')},'Aparência atualizada!');
      if(ok){$('cfgHeroBgFile').value='';$('cfgFamilyBgFile').value='';updateAssetPreviews();}
    }catch(err){console.error(err);toast(err.message||'Erro ao enviar imagem.');}finally{btn.disabled=false;btn.textContent='Salvar aparência';}
  });


  // -------- Importação automática de layouts --------
  let importCandidates=[];

  function formatDateTime(value){
    if(!value)return '—';
    try{return new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
    catch{return '—';}
  }

  async function currentAccessToken(){
    const {data:{session}}=await sb.auth.getSession();
    return session?.access_token||'';
  }

  async function importerRequest(action,payload={}){
    const token=await currentAccessToken();
    if(!token)throw new Error('Sessão expirada. Entre novamente.');
    const response=await fetch('../api/layout-importer',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({action,...payload})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Falha no importador.');
    return data;
  }

  async function loadImportCandidates(){
    const list=$('importList');
    const empty=$('emptyImport');
    if(!list||!empty||!sb)return;

    const [{data,error},{data:state}] = await Promise.all([
      sb.from('layout_import_candidates')
        .select('*')
        .eq('status','pending')
        .order('detected_at',{ascending:false})
        .limit(120),
      sb.from('layout_import_state')
        .select('*')
        .eq('id',1)
        .maybeSingle()
    ]);

    if(error){
      console.warn('Importador ainda não configurado:',error);
      importCandidates=[];
      list.innerHTML='';
      empty.hidden=false;
      $('importPendingCount').textContent='0';
      $('importStatus').textContent='Configurar SQL';
      $('btnApproveAll').hidden=true;
      return;
    }

    importCandidates=data||[];
    $('importPendingCount').textContent=importCandidates.length;
    $('importLastScan').textContent=formatDateTime(state?.last_scan_at);
    $('importLastFound').textContent=state?.last_scan_found??0;
    $('importStatus').textContent=state?.last_error?'Atenção':'Pronto';
    $('btnApproveAll').hidden=importCandidates.length===0;

    empty.hidden=importCandidates.length!==0;
    list.innerHTML=importCandidates.map(item=>`
      <article class="import-card" data-import-id="${esc(item.id)}">
        <img class="import-thumb" src="${esc(item.source_image_url||ph(item.cv))}" onerror="this.src='${ph(item.cv)}'" alt="Layout CV${item.cv}">
        <div class="import-info">
          <div class="import-meta"><span class="pill">CV${item.cv}</span><span class="pill">NOVO</span></div>
          <h3>Layout CV${item.cv}</h3>
          <small>${esc(item.source_title||'Layout encontrado automaticamente')}</small>
          <a class="import-source" href="${esc(item.source_url)}" target="_blank" rel="noopener">Ver página de origem ↗</a>
        </div>
        <div class="import-card-actions">
          <button class="small-btn" type="button" data-import-approve="${esc(item.id)}">＋ Adicionar</button>
          <button class="small-btn delete" type="button" data-import-ignore="${esc(item.id)}">Ignorar</button>
        </div>
      </article>
    `).join('');
  }

  async function scanLayouts(){
    const btn=$('btnScanLayouts');
    const panel=btn?.closest('.import-panel');
    if(!btn)return;
    btn.disabled=true;
    btn.textContent='Verificando...';
    panel?.classList.add('import-progress');
    $('importStatus').textContent='Buscando';
    try{
      const result=await importerRequest('scan');
      toast(`${result.newCandidates||0} novo(s) layout(s) encontrado(s).`);
      await loadImportCandidates();
    }catch(err){
      console.error(err);
      toast(err.message||'Erro ao verificar layouts.');
      $('importStatus').textContent='Erro';
    }finally{
      btn.disabled=false;
      btn.textContent='↻ Verificar agora';
      panel?.classList.remove('import-progress');
    }
  }

  async function approveImportedLayout(id,{quiet=false}={}){
    const card=document.querySelector(`[data-import-id="${CSS.escape(String(id))}"]`);
    card?.classList.add('import-progress');
    try{
      const result=await importerRequest('approve',{id});
      if(!quiet)toast(result.duplicate?'Esse layout já estava cadastrado.':'Layout adicionado!');
      return true;
    }catch(err){
      console.error(err);
      if(!quiet)toast(err.message||'Erro ao adicionar layout.');
      return false;
    }finally{
      card?.classList.remove('import-progress');
    }
  }

  async function approveAllImported(){
    const btn=$('btnApproveAll');
    if(!btn||!importCandidates.length)return;
    const pending=[...importCandidates];
    btn.disabled=true;
    $('btnScanLayouts').disabled=true;
    let ok=0;
    try{
      for(let i=0;i<pending.length;i++){
        btn.textContent=`Adicionando ${i+1}/${pending.length}...`;
        if(await approveImportedLayout(pending[i].id,{quiet:true}))ok++;
      }
      toast(`${ok} layout(s) processado(s).`);
      await Promise.all([loadImportCandidates(),loadLayouts()]);
    }finally{
      btn.disabled=false;
      $('btnScanLayouts').disabled=false;
      btn.textContent='＋ Adicionar todos';
    }
  }

  $('btnScanLayouts')?.addEventListener('click',scanLayouts);
  $('btnApproveAll')?.addEventListener('click',approveAllImported);

  $('importList')?.addEventListener('click',async e=>{
    const approve=e.target.closest('[data-import-approve]');
    if(approve){
      approve.disabled=true;
      const ok=await approveImportedLayout(approve.dataset.importApprove);
      if(ok)await Promise.all([loadImportCandidates(),loadLayouts()]);
      approve.disabled=false;
      return;
    }

    const ignore=e.target.closest('[data-import-ignore]');
    if(ignore){
      ignore.disabled=true;
      const {error}=await sb.from('layout_import_candidates')
        .update({status:'ignored',reviewed_at:new Date().toISOString()})
        .eq('id',ignore.dataset.importIgnore);
      if(error)toast('Erro ao ignorar layout.');
      else{toast('Layout ignorado.');await loadImportCandidates();}
      ignore.disabled=false;
    }
  });

  // -------- Layouts --------
  async function loadLayouts(){listEl.innerHTML='<div style="color:#8e8782;padding:20px">Carregando layouts...</div>';const {data,error}=await sb.from('layouts').select('*').order('ordem',{ascending:true}).order('criado_em',{ascending:false});if(error){listEl.innerHTML='';emptyEl.hidden=false;toast('Erro ao carregar layouts.');console.error(error);return;}layouts=data||[];renderLayouts();}
  function filteredLayouts(){const q=value('adminSearch').toLowerCase(),cv=$('adminCvFilter').value;return layouts.filter(x=>(cv==='todos'||String(x.cv)===cv)&&(!q||`CV${x.cv} ${x.descricao||''}`.toLowerCase().includes(q)));}
  function syncAdminCvFilter(){
    const select=$('adminCvFilter');
    if(!select)return;
    const atual=select.value||'todos';
    const cvs=new Set([12,13,14,15,16,17,18]);
    layouts.forEach(x=>{const n=Number(x.cv);if(Number.isInteger(n)&&n>0)cvs.add(n);});
    const ordered=[...cvs].sort((a,b)=>a-b);
    select.innerHTML='<option value="todos">Todos os CVs</option>'+ordered.map(cv=>`<option value="${cv}">CV${cv}</option>`).join('');
    select.value=[...select.options].some(o=>o.value===atual)?atual:'todos';
  }
  function renderCvCounters(){
    const grid=$('cvCountGrid');
    const totalCvEl=$('cvWithLayouts');
    if(!grid||!totalCvEl)return;

    const counts=new Map();
    const cvs=new Set([12,13,14,15,16,17,18]);

    layouts.forEach(item=>{
      const cv=Number(item.cv);
      if(!Number.isInteger(cv)||cv<1)return;
      cvs.add(cv);
      counts.set(cv,(counts.get(cv)||0)+1);
    });

    const ordered=[...cvs].sort((a,b)=>a-b);
    const cvsWithLayouts=ordered.filter(cv=>(counts.get(cv)||0)>0).length;
    totalCvEl.textContent=cvsWithLayouts;

    grid.innerHTML=ordered.map(cv=>{
      const count=counts.get(cv)||0;
      return `<article class="cv-count-card ${count?'has-layouts':'zero'}">
        <span class="cv-name">CV${cv}</span>
        <strong>${count}</strong>
        <small>${count===1?'layout cadastrado':'layouts cadastrados'}</small>
      </article>`;
    }).join('');
  }

  function updateMetrics(){const total=layouts.length,active=layouts.filter(x=>x.ativo).length,hidden=layouts.filter(x=>!x.ativo).length,featured=layouts.filter(x=>x.destaque).length;['mTotal','lmTotal'].forEach(id=>$(id).textContent=total);['mActive','lmActive'].forEach(id=>$(id).textContent=active);$('lmHidden').textContent=hidden;['mFeatured','lmFeatured'].forEach(id=>$(id).textContent=featured);renderCvCounters();}
  function renderLayouts(){const data=filteredLayouts();syncAdminCvFilter();updateMetrics();emptyEl.hidden=data.length!==0;listEl.innerHTML=data.map(x=>`<article class="admin-layout"><img class="admin-thumb" src="${esc(x.imagem_url||ph(x.cv))}" onerror="this.src='${ph(x.cv)}'" alt="Layout CV${x.cv}"><div class="admin-info"><h3>Layout CV${x.cv}</h3><div class="meta"><span class="pill">CV${x.cv}</span><span class="pill ${x.ativo?'active':'hidden'}">${x.ativo?'Ativo':'Oculto'}</span>${x.destaque?'<span class="pill featured">⭐ Destaque</span>':''}</div></div><div class="admin-actions"><button class="small-btn" data-toggle="${x.id}">${x.ativo?'Ocultar':'Ativar'}</button><button class="small-btn" data-edit="${x.id}">Editar</button><button class="small-btn delete" data-delete="${x.id}">Excluir</button></div></article>`).join('');}
  function openModal(item=null){layoutForm.reset();$('layoutId').value=item?.id||'';$('currentImageUrl').value=item?.imagem_url||'';$('currentImagePath').value=item?.imagem_path||'';$('modalTitle').textContent=item?'Editar layout':'Adicionar layout';$('layoutCv').value=String(item?.cv||12);$('layoutOrder').value=item?.ordem??0;setValue('layoutDescription',item?.descricao||'');setValue('layoutLink',item?.link_layout||'');$('layoutActive').checked=item?.ativo??true;$('layoutFeatured').checked=item?.destaque??false;setPreview(item?.imagem_url||'',item?.cv||12);modal.hidden=false;}
  function closeModal(){modal.hidden=true;$('layoutImage').value='';}
  function setPreview(url,cv){$('imagePreview').innerHTML=url?`<img src="${esc(url)}" alt="Prévia">`:`<span>🖼️</span><small>Prévia da imagem • CV${cv}</small>`;}
  $('btnNewTop').onclick=()=>openModal();$('btnNewSidebar').onclick=()=>{openView('layouts');openModal();};$('btnCloseModal').onclick=closeModal;$('btnCancel').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});confirmModal.addEventListener('click',e=>{if(e.target===confirmModal){confirmModal.hidden=true;deleteTarget=null;}});$('adminSearch').oninput=renderLayouts;$('adminCvFilter').onchange=renderLayouts;$('layoutCv').onchange=e=>{if(!$('currentImageUrl').value&&!$('layoutImage').files[0])setPreview('',e.target.value);};$('layoutImage').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>setPreview(r.result,$('layoutCv').value);r.readAsDataURL(f);};
  listEl.addEventListener('click',async e=>{const edit=e.target.closest('[data-edit]');if(edit){const item=layouts.find(x=>String(x.id)===edit.dataset.edit);if(item)openModal(item);return;}const tog=e.target.closest('[data-toggle]');if(tog){const item=layouts.find(x=>String(x.id)===tog.dataset.toggle);if(!item)return;const {error}=await sb.from('layouts').update({ativo:!item.ativo,atualizado_em:new Date().toISOString()}).eq('id',item.id);if(error)toast('Erro ao alterar status.');else{toast(item.ativo?'Layout ocultado.':'Layout ativado.');await loadLayouts();}return;}const del=e.target.closest('[data-delete]');if(del){deleteTarget=layouts.find(x=>String(x.id)===del.dataset.delete)||null;if(deleteTarget)confirmModal.hidden=false;}});
  $('cancelDelete').onclick=()=>{confirmModal.hidden=true;deleteTarget=null;};$('confirmDelete').onclick=async()=>{if(!deleteTarget)return;const target=deleteTarget;const {error}=await sb.from('layouts').delete().eq('id',target.id);if(error){toast('Erro ao excluir layout.');return;}if(target.imagem_path)await sb.storage.from('layouts').remove([target.imagem_path]);confirmModal.hidden=true;deleteTarget=null;toast('Layout excluído.');await loadLayouts();};
  async function uploadLayoutImage(file,cv){if(!file)return null;if(file.size>8*1024*1024)throw new Error('A imagem deve ter no máximo 8 MB.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');const path=`cv${cv}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;const {error}=await sb.storage.from('layouts').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;const {data}=sb.storage.from('layouts').getPublicUrl(path);return {url:data.publicUrl,path};}
  layoutForm.addEventListener('submit',async e=>{e.preventDefault();const saveBtn=$('btnSave');saveBtn.disabled=true;saveBtn.textContent='Salvando...';const id=$('layoutId').value,current=id?layouts.find(x=>String(x.id)===id):null,file=$('layoutImage').files[0];try{let imagem_url=$('currentImageUrl').value||null,imagem_path=$('currentImagePath').value||null;if(file){const uploaded=await uploadLayoutImage(file,$('layoutCv').value);imagem_url=uploaded.url;imagem_path=uploaded.path;}const cvNumero=Number($('layoutCv').value);if(!Number.isInteger(cvNumero)||cvNumero<1)throw new Error('Informe um Centro de Vila válido.');const payload={nome:current?.nome||`Layout CV${cvNumero}`,cv:cvNumero,tipo:'',descricao:value('layoutDescription')||null,link_layout:value('layoutLink'),imagem_url,imagem_path,ativo:$('layoutActive').checked,destaque:$('layoutFeatured').checked,ordem:Number($('layoutOrder').value||0),atualizado_em:new Date().toISOString()};const result=id?await sb.from('layouts').update(payload).eq('id',id):await sb.from('layouts').insert(payload);if(result.error)throw result.error;if(file&&current?.imagem_path&&current.imagem_path!==imagem_path)await sb.storage.from('layouts').remove([current.imagem_path]);toast(id?'Layout atualizado!':'Layout adicionado!');closeModal();await loadLayouts();}catch(err){console.error(err);toast(err.message||'Erro ao salvar layout.');}finally{saveBtn.disabled=false;saveBtn.textContent='Salvar layout';}});

  init();
})();
