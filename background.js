/* DELTA Research Collector v0.5.0 • GPL-3.0-or-later. */
"use strict";
function allowedFetch(uri) {
  let u;
  try { u = new URL(uri); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const key = `${u.hostname}${u.pathname}`;
  return (u.hostname === 'arxiv.org' && u.pathname.startsWith('/search/')) ||
    key === 'www.ebi.ac.uk/europepmc/webservices/rest/search' ||
    (u.hostname === 'eutils.ncbi.nlm.nih.gov' && /^\/entrez\/eutils\/(esearch|efetch)\.fcgi$/.test(u.pathname)) ||
    (key === 'api.openalex.org/works' || (u.hostname==='api.openalex.org' && /^\/works\/doi:10\.\d{4,9}\/.+/.test(u.pathname))) ||
    (u.hostname === 'api.crossref.org' && (u.pathname === '/works' || /^\/works\/(?:doi\/)?10\.\d{4,9}\/[A-Za-z0-9%._;()/:+-]+$/i.test(u.pathname))) ||
    (u.hostname === 'api.datacite.org' && /^\/dois\/10\.\d{4,9}\/[A-Za-z0-9%._;()/:+-]+$/i.test(u.pathname)) ||
    key === 'api.semanticscholar.org/graph/v1/paper/search' ||
    (u.hostname === 'doaj.org' && u.pathname.startsWith('/api/search/articles/')) ||
    (u.hostname === 'search.scielo.org' && u.pathname === '/') ||
    (u.hostname === 'api.biorxiv.org' && /^\/details\/(biorxiv|medrxiv)\/\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}\/\d+$/.test(u.pathname));
}
function allowedPdf(uri) {
  let u;
  try { u = new URL(uri); } catch { return false; }
  return u.protocol === 'https:' && u.hostname === 'arxiv.org' && /^\/pdf\/[A-Za-z0-9.\-_/]+(?:\.pdf)?$/.test(u.pathname);
}

// Session-only CAPES collection state, isolated by Chrome tab ID.
// Does not persist across browser restarts; contains bibliographic metadata only.
const CAPES_SESSION_PREFIX="delta_capes_run_tab_";
function capesSessionSender(sender){
  try{
    const u=new URL(sender.url||sender.tab?.url||"");
    const host=u.hostname;
    const trusted=host==="periodicos.capes.gov.br"||
      host==="www.periodicos.capes.gov.br"||
      /^www-periodicos-capes-gov-br\.ez\d+\.periodicos\.capes\.gov\.br$/.test(host);
    return trusted&&u.protocol==="https:"&&/\/acervo\/buscador\.html$/.test(u.pathname);
  }catch{return false;}
}
function capesRunValid(run,sender){
  if(!run||typeof run!=="object"||!Array.isArray(run.records)||run.records.length>2000||
    !Array.isArray(run.pages)||run.pages.length>200||
    !Number.isSafeInteger(run.currentPage)||run.currentPage<1||run.currentPage>200||
    !Number.isSafeInteger(run.max)||run.max<1||run.max>2000||
    !Number.isFinite(run.startedAt)||Date.now()-run.startedAt>1200000||
    Date.now()-run.startedAt< -60000)return false;
  try{
    const source=new URL(sender.url||sender.tab?.url);
    const base=new URL(run.baseUrl);
    return base.origin===source.origin&&
      /\/acervo\/buscador\.html$/.test(base.pathname)&&base.searchParams.has("q")&&
      JSON.stringify(run).length<6_000_000;
  }catch{return false;}
}
const LIB_KEY='delta_v03_library', HIST_KEY='delta_v03_history';
const MAX_ITEMS=12000, MAX_HIST=80;
const norm = (v)=>String(v||'').trim();
const normalizeDoi=(v)=>norm(v).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'').toLowerCase().replace(/[.,;]+$/,'');
const libraryKey=(r)=>{
  const doi=normalizeDoi(r.doi);
  return /^10\.\d{4,9}\//.test(doi)?`doi:${doi}`:`id:${norm(r.source).toLowerCase()}:${norm(r.identifier).toLowerCase()}`;
};
const merge=(a,b)=>{
  const r={...a,sources:[...new Set([...(a.sources||[a.source]),...(b.sources||[b.source])])].filter(Boolean)};
  for (const k of ['title','abstract','journal','pdf_url','article_url','year','date']) if(String(b[k]||'').length>String(r[k]||'').length)r[k]=b[k];
  if((b.authors?.length||0)>(r.authors?.length||0))r.authors=b.authors;
  if(!r.doi&&b.doi)r.doi=b.doi;
  const rank={unknown:0,no_open_copy_found:1,publisher_restricted:2,open:3};
  if((rank[b.access_status]||0)>(rank[r.access_status]||0))for(const k of ['access_status','access_evidence','access_url','access_checked_at'])r[k]=b[k]||'';
  // Preserve distinct original snapshots during DOI-based library merges.
  // No source's verification evidence may disappear simply because another
  // provider contributed a longer title, journal or author list.
  const entries=[...(Array.isArray(a.xref_audit)?a.xref_audit:(a.xref?[a.xref]:[])),
    ...(Array.isArray(b.xref_audit)?b.xref_audit:(b.xref?[b.xref]:[]))];
  const keys=new Set();
  r.xref_audit=entries.filter(e=>{
    if(!e||typeof e!=='object')return false;
    const key=JSON.stringify([e.checked_at,e.source,e.status,e.original?.title]);
    if(keys.has(key))return false;keys.add(key);return true;
  }).slice(-12);
  // A conflict is never replaced by an optimistic match without review.
  const chosen=a.xref?.status==='conflict'?a.xref:
    b.xref?.status==='conflict'?b.xref:
    (b.xref?.status==='registry_match'?b.xref:
     a.xref?.status==='registry_match'?a.xref:(b.xref||a.xref));
  if(chosen){r.xref=chosen;r.xref_status=chosen.status;r.xref_source=chosen.source||'';}
  return r;
};
// Sequential mutation queue prevents two tabs overwriting the library concurrently.
let storageQueue=Promise.resolve();
function enqueue(op){const job=storageQueue.then(op);storageQueue=job.catch(()=>{});return job;}
async function appendLibrary(records,run){
  if(!Array.isArray(records)||records.length>2000||!records.every(r=>r && typeof r==='object' && norm(r.title).length<4000))throw Error('Lote de biblioteca inválido');
  const data=await chrome.storage.local.get([LIB_KEY,HIST_KEY]);
  const map=new Map((data[LIB_KEY]||[]).map(r=>[libraryKey(r),r]));
  let added=0,merged=0,dropped=0;
  for(const r of records){
    const id=libraryKey(r);
    if(!norm(r.title)||(!norm(r.identifier)&&!norm(r.doi)))continue;
    if(map.has(id)){map.set(id,merge(map.get(id),r));merged++;}
    else if(map.size<MAX_ITEMS){map.set(id,{...r,sources:r.sources||[r.source]});added++;}
    else dropped++;
  }
  const hist=[...(data[HIST_KEY]||[])];
  hist.unshift({id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,source:run.source||'',url:run.url||'',
    date:new Date().toISOString(),received:records.length,added,merged,dropped,partial:!!run.partial,query:String(run.query||'').slice(0,2000),parameters:run.parameters||{},retrieval_mode:String(run.retrieval_mode||''),note:String(run.note||'').slice(0,500)});
  await chrome.storage.local.set({[LIB_KEY]:[...map.values()],[HIST_KEY]:hist.slice(0,MAX_HIST)});
  return {total:map.size,added,merged,dropped};
}
async function readLibrary(){const v=await chrome.storage.local.get([LIB_KEY,HIST_KEY]);return {records:v[LIB_KEY]||[],history:v[HIST_KEY]||[]};}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab || !message || typeof message !== 'object') return;
  if (["DELTA_CAPES_RUN_GET","DELTA_CAPES_RUN_SAVE","DELTA_CAPES_RUN_CLEAR"].includes(message.type)) {
    if(!capesSessionSender(sender)){reply({error:"CAPES: origem da sessão não autorizada."});return;}
    const key=CAPES_SESSION_PREFIX+sender.tab.id;
    (async()=>{
      if(message.type==="DELTA_CAPES_RUN_CLEAR"){
        await chrome.storage.session.remove(key);
        return {cleared:true};
      }
      if(message.type==="DELTA_CAPES_RUN_SAVE"){
        if(!capesRunValid(message.run,sender))throw Error("CAPES: sessão inválida ou expirada.");
        await chrome.storage.session.set({[key]:message.run});
        return {saved:true};
      }
      const data=await chrome.storage.session.get(key);
      const run=data[key];
      if(!run)return {run:null};
      if(!capesRunValid(run,sender)){
        await chrome.storage.session.remove(key);
        return {run:null,expired:true};
      }
      return {run};
    })().then(reply).catch(e=>reply({error:String(e.message||e)}));
    return true;
  }
  if (['DELTA_LIBRARY_ADD','DELTA_LIBRARY_GET','DELTA_LIBRARY_CLEAR'].includes(message.type)) {
    const run = async()=>{
      if(message.type==='DELTA_LIBRARY_ADD')return await appendLibrary(message.records,message.run||{});
      if(message.type==='DELTA_LIBRARY_GET')return await readLibrary();
      if(message.confirm==='APAGAR_BIBLIOTECA_LOCAL') {await chrome.storage.local.remove([LIB_KEY,HIST_KEY]);return {cleared:true};}
      throw Error('Confirmação inválida');
    };
    (message.type==='DELTA_LIBRARY_GET'?run():enqueue(run)).then(reply).catch(e=>reply({error:String(e.message||e)}));
    return true;
  }
  if (message.type === 'DELTA_FETCH') {
    if (!allowedFetch(message.url)) { reply({error:'Endereço de API não permitido'}); return; }
    (async () => {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 45000);
      try {
        const res = await fetch(message.url, {credentials:'omit',redirect:'follow',signal:ctrl.signal});
        const body = await res.text();
        if (body.length > 8_000_000) throw new Error('Resposta excessiva: reduza os registros por lote');
        reply({status:res.status,text:body,retryAfter:res.headers.get('Retry-After') || ''});
      } catch (e) { reply({error:String(e?.message || e)}); }
      finally { clearTimeout(timeout); }
    })();
    return true;
  }
  if (message.type === 'DELTA_PDF') {
    if (!allowedPdf(message.url)) { reply({error:'PDF não permitido'}); return; }
    const safe = String(message.identifier || 'paper').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,80);
    chrome.downloads.download({url:message.url,filename:`DELTA-Research-Collector/arxiv/${safe}.pdf`,conflictAction:'uniquify',saveAs:false},id => {
      const err=chrome.runtime.lastError?.message;
      reply(err? {error:err} : {downloadId:id});
    });
    return true;
  }
});
// Never navigate away from the active search tab.
chrome.action.onClicked.addListener(async tab => {
  if(!tab?.id)return;
  const send=()=>new Promise(resolve=>chrome.tabs.sendMessage(tab.id,{type:'DELTA_TOGGLE'},()=>resolve(!chrome.runtime.lastError)));
  if(await send())return;
  try {
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['collector-core.js','xref-engine.js','review-matrix.js','content.js']});
    if(await send())return;
    await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
      const id='delta-notice';document.getElementById(id)?.remove();
      const e=document.createElement('div');e.id=id;e.textContent='DELTA Collector: esta pagina nao possui coletor compativel.';
      Object.assign(e.style,{position:'fixed',right:'20px',bottom:'20px',zIndex:'2147483647',background:'#152d43',color:'white',padding:'12px',borderRadius:'10px',font:'13px system-ui'});
      document.documentElement.append(e);setTimeout(()=>e.remove(),6000);
    }});
  }catch(e){console.info('DELTA: pagina sem acesso de extensao',String(e));}
});
