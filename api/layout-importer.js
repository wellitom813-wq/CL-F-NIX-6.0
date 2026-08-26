const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ksfmcoukkuglqjtxrebu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_sxX321Q2mbCh8zXF7w9d8A_ZOaPp_yp';
const SOURCE_BASE = 'https://clashofclans-layouts.com/pt/plans';
const CVS = [12,13,14,15,16,17,18];
const MAX_PER_CV = 12;
const UA = 'Mozilla/5.0 (compatible; ClaFenixLayouts/1.0; +https://www.clafenix.com.br)';

function json(res,status,data){
  res.status(status).setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.end(JSON.stringify(data));
}

function decodeHtml(value=''){
  return String(value)
    .replace(/&amp;/g,'&')
    .replace(/&#38;/g,'&')
    .replace(/&quot;/g,'"')
    .replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>');
}

function stripTags(value=''){
  return decodeHtml(String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
}

function absoluteUrl(value,base){
  try{return new URL(decodeHtml(value),base).href;}catch{return '';}
}

function extractMeta(html,key){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    const prop=(tag.match(/\b(?:property|name)=["']([^"']+)["']/i)||[])[1]||'';
    if(prop.toLowerCase()!==key.toLowerCase())continue;
    const content=(tag.match(/\bcontent=["']([^"']+)["']/i)||[])[1]||'';
    if(content)return decodeHtml(content);
  }
  return '';
}

function extractTitle(html){
  return stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
}

function extractDetailLinks(html,cv,baseUrl){
  const found=[];
  const seen=new Set();
  const regex=new RegExp(`href=["']([^"']*\\/plans\\/th_${cv}\\/[a-z0-9_-]+_\\d+\\.html)["']`,'gi');
  let m;
  while((m=regex.exec(html))){
    const url=absoluteUrl(m[1],baseUrl);
    if(!url||seen.has(url))continue;
    seen.add(url);
    found.push(url);
    if(found.length>=MAX_PER_CV)break;
  }
  return found;
}

function extractClashLink(html){
  const match=html.match(/href=["'](https:\/\/link\.clashofclans\.com\/[^"']+)["']/i);
  return match?decodeHtml(match[1]):'';
}

async function fetchText(url){
  const response=await fetch(url,{
    headers:{'User-Agent':UA,'Accept':'text/html,application/xhtml+xml','Accept-Language':'pt-BR,pt;q=0.9,en;q=0.7'},
    redirect:'follow'
  });
  if(!response.ok)throw new Error(`Fonte respondeu ${response.status}`);
  return response.text();
}

async function mapLimit(items,limit,fn){
  const results=new Array(items.length);
  let cursor=0;
  async function worker(){
    while(true){
      const i=cursor++;
      if(i>=items.length)return;
      try{results[i]=await fn(items[i],i);}
      catch(error){results[i]={error:String(error?.message||error)};}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return results;
}

async function verifyUser(authHeader){
  if(!authHeader?.startsWith('Bearer '))return null;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{
    headers:{apikey:SUPABASE_ANON_KEY,Authorization:authHeader}
  });
  if(!response.ok)return null;
  return response.json();
}

function restHeaders(token,prefer=''){
  const headers={
    apikey:token===process.env.SUPABASE_SERVICE_ROLE_KEY?token:SUPABASE_ANON_KEY,
    Authorization:`Bearer ${token}`,
    'Content-Type':'application/json'
  };
  if(prefer)headers.Prefer=prefer;
  return headers;
}

async function rest(path,{token,method='GET',body,prefer}={}){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    method,
    headers:restHeaders(token,prefer),
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await response.text();
  const data=text?(()=>{try{return JSON.parse(text)}catch{return text}})():null;
  if(!response.ok){
    const message=typeof data==='object'?(data.message||data.error||JSON.stringify(data)):String(data||response.status);
    throw new Error(message);
  }
  return data;
}

async function scrapeCandidates(){
  const listingResults=await Promise.all(CVS.map(async cv=>{
    const listingUrl=`${SOURCE_BASE}/th_${cv}/`;
    const html=await fetchText(listingUrl);
    return {cv,links:extractDetailLinks(html,cv,listingUrl)};
  }));

  const jobs=listingResults.flatMap(x=>x.links.map(url=>({cv:x.cv,url})));
  const details=await mapLimit(jobs,14,async job=>{
    const html=await fetchText(job.url);
    const clashLink=extractClashLink(html);
    if(!clashLink)return null;

    const rawImage=extractMeta(html,'og:image')||extractMeta(html,'twitter:image');
    return {
      source:'clashofclans-layouts.com',
      source_url:job.url,
      source_title:extractTitle(html).slice(0,300),
      source_image_url:rawImage?absoluteUrl(rawImage,job.url):null,
      clash_link:clashLink,
      cv:job.cv,
      status:'pending',
      detected_at:new Date().toISOString()
    };
  });

  return details.filter(x=>x&&x.clash_link);
}

async function runScan(token){
  const now=new Date().toISOString();
  try{
    const candidates=await scrapeCandidates();
    const existingLayouts=await rest('layouts?select=link_layout&link_layout=not.is.null',{token});
    const existingCandidates=await rest('layout_import_candidates?select=source_url,clash_link',{token});

    const layoutLinks=new Set((existingLayouts||[]).map(x=>x.link_layout).filter(Boolean));
    const candidateSources=new Set((existingCandidates||[]).map(x=>x.source_url).filter(Boolean));
    const candidateLinks=new Set((existingCandidates||[]).map(x=>x.clash_link).filter(Boolean));

    const fresh=candidates.filter(x=>
      !layoutLinks.has(x.clash_link) &&
      !candidateSources.has(x.source_url) &&
      !candidateLinks.has(x.clash_link)
    );

    if(fresh.length){
      await rest('layout_import_candidates?on_conflict=source_url',{
        token,method:'POST',body:fresh,prefer:'resolution=ignore-duplicates,return=minimal'
      });
    }

    await rest('layout_import_state?id=eq.1',{
      token,method:'PATCH',
      body:{last_scan_at:now,last_scan_found:fresh.length,last_error:null},
      prefer:'return=minimal'
    });

    return {ok:true,scanned:candidates.length,newCandidates:fresh.length};
  }catch(error){
    try{
      await rest('layout_import_state?id=eq.1',{
        token,method:'PATCH',
        body:{last_scan_at:now,last_scan_found:0,last_error:String(error?.message||error).slice(0,500)},
        prefer:'return=minimal'
      });
    }catch{}
    throw error;
  }
}

function imageExtension(contentType,url){
  const type=(contentType||'').toLowerCase();
  if(type.includes('webp'))return 'webp';
  if(type.includes('png'))return 'png';
  if(type.includes('gif'))return 'gif';
  if(type.includes('jpeg')||type.includes('jpg'))return 'jpg';
  const ext=(String(url).match(/\.(webp|png|jpe?g|gif)(?:\?|$)/i)||[])[1];
  return ext?(ext.toLowerCase()==='jpeg'?'jpg':ext.toLowerCase()):'jpg';
}

async function copyImageToStorage(candidate,token){
  if(!candidate.source_image_url)return {url:null,path:null};
  try{
    const response=await fetch(candidate.source_image_url,{
      headers:{'User-Agent':UA,'Accept':'image/*'},
      redirect:'follow'
    });
    if(!response.ok)return {url:candidate.source_image_url,path:null};

    const type=response.headers.get('content-type')||'image/jpeg';
    if(!type.startsWith('image/'))return {url:candidate.source_image_url,path:null};

    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>8*1024*1024)return {url:candidate.source_image_url,path:null};

    const ext=imageExtension(type,candidate.source_image_url);
    const safeId=String(candidate.id).replace(/[^a-z0-9-]/gi,'').slice(0,40);
    const path=`importados/cv${candidate.cv}/${Date.now()}-${safeId}.${ext}`;

    const upload=await fetch(`${SUPABASE_URL}/storage/v1/object/layouts/${path}`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_ANON_KEY,
        Authorization:`Bearer ${token}`,
        'Content-Type':type,
        'x-upsert':'false'
      },
      body:bytes
    });

    if(!upload.ok)return {url:candidate.source_image_url,path:null};
    return {url:`${SUPABASE_URL}/storage/v1/object/public/layouts/${path}`,path};
  }catch{
    return {url:candidate.source_image_url,path:null};
  }
}

async function approveCandidate(id,token,forceDuplicate=false){
  const rows=await rest(`layout_import_candidates?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,{token});
  const candidate=rows?.[0];
  if(!candidate)throw new Error('Layout pendente não encontrado.');

  const duplicates=await rest(`layouts?link_layout=eq.${encodeURIComponent(candidate.clash_link)}&select=id,cv,nome,link_layout&limit=1`,{token});
  if(duplicates?.length&&!forceDuplicate){
    return {ok:true,duplicate:true,needsConfirmation:true,duplicateLayout:duplicates[0]};
  }

  const image=await copyImageToStorage(candidate,token);
  const payload={
    nome:`Layout CV${candidate.cv}`,
    cv:candidate.cv,
    tipo:'',
    descricao:null,
    link_layout:candidate.clash_link,
    imagem_url:image.url,
    imagem_path:image.path,
    ativo:true,
    destaque:false,
    ordem:0,
    atualizado_em:new Date().toISOString()
  };

  await rest('layouts',{
    token,method:'POST',body:payload,prefer:'return=minimal'
  });

  await rest(`layout_import_candidates?id=eq.${encodeURIComponent(id)}`,{
    token,method:'PATCH',
    body:{status:'approved',reviewed_at:new Date().toISOString()},
    prefer:'return=minimal'
  });

  return {ok:true,duplicate:!!duplicates?.length,forcedDuplicate:!!duplicates?.length&&!!forceDuplicate};
}

module.exports = async function handler(req,res){
  try{
    if(req.method==='GET' && req.query?.cron==='1'){
      const cronSecret=process.env.CRON_SECRET;
      const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
      if(!cronSecret||!serviceKey)return json(res,503,{error:'Cron ainda não configurado.'});
      if(req.headers.authorization!==`Bearer ${cronSecret}`)return json(res,401,{error:'Não autorizado.'});
      return json(res,200,await runScan(serviceKey));
    }

    if(req.method!=='POST')return json(res,405,{error:'Método não permitido.'});

    const authHeader=req.headers.authorization||'';
    const user=await verifyUser(authHeader);
    if(!user)return json(res,401,{error:'Sessão de administrador inválida.'});
    const token=authHeader.replace(/^Bearer\s+/i,'');

    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const action=body.action;

    if(action==='scan')return json(res,200,await runScan(token));
    if(action==='approve'){
      if(!body.id)return json(res,400,{error:'ID do layout ausente.'});
      return json(res,200,await approveCandidate(body.id,token,body.forceDuplicate===true));
    }

    return json(res,400,{error:'Ação inválida.'});
  }catch(error){
    console.error(error);
    return json(res,500,{error:String(error?.message||error)});
  }
};
