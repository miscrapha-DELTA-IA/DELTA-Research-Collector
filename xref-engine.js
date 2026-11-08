/* DELTA Research Collector — universal DOI-first cross-reference engine v0.6.1.
 * GPL-3.0-or-later. No fuzzy auto-merging, no silent source replacements.
 */
(() => {
  "use strict";
  const clean = x => String(x ?? "").replace(/\s+/g, " ").trim();
  const doi = x => clean(x).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "").toLowerCase().replace(/[.,;]+$/, "");
  const validDoi = d => /^10\.\d{4,9}\/[^\s"'<>]+$/i.test(d) &&
    d.length<=255 && !/(?:google|scholar|crossref|abstract|resumo|detalhes)$/i.test(d);
  // HTML entities in publisher metadata are presentation, not contradictions.
  // Match normalizations never overwrite the source spelling.
  const decodeEntities = x => clean(x).replace(/&(?:amp|quot|apos|nbsp|lt|gt|#(?:x[0-9a-f]+|[0-9]+));/gi, entity=>{
    const match=entity.match(/^&#(x[0-9a-f]+|[0-9]+);$/i);
    if(match){const cp=match[1][0].toLowerCase()==="x"?
      parseInt(match[1].slice(1),16):parseInt(match[1],10);
      return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):" ";}
    return ({amp:"&",quot:'"',apos:"'",nbsp:" ",lt:"<",gt:">"})[entity.slice(1,-1).toLowerCase()]||entity;
  });
  const canonical = x => decodeEntities(x).replace(/<[^>]*>/g," ").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
  function similarity(a,b) {
    const x=canonical(a),y=canonical(b);
    if(!x||!y)return 0;
    if(x===y)return 1;
    const xa=x.split(" "),ya=y.split(" ");
    if(xa.length<3||ya.length<3)return 0;
    // Strict pairwise token Dice, insensitive to harmless punctuation and order.
    const count=new Map();
    for(const t of xa)count.set(t,(count.get(t)||0)+1);
    let overlap=0;
    for(const t of ya)if(count.get(t)>0){count.set(t,count.get(t)-1);overlap++;}
    const dice=2*overlap/(xa.length+ya.length);
    const prefix=xa.slice(0,3).join(" ")===ya.slice(0,3).join(" ");
    return Math.min(1,dice+(prefix?0.025:0));
  }
  const yearOf=x => {
    const m=clean(x).match(/\b(?:19|20)\d{2}\b/);
    return m?Number(m[0]):null;
  };
  function crossref(payload) {
    const x=payload?.message;
    if(!x||typeof x!=="object"||!x.DOI)return null;
    const dateParts=x.published?.["date-parts"]?.[0]||
      x["published-online"]?.["date-parts"]?.[0]||
      x.issued?.["date-parts"]?.[0]||[];
    const authors=Array.isArray(x.author)?x.author.map(a=>clean([a.given,a.family].filter(Boolean).join(" "))).filter(Boolean):[];
    return {source:"Crossref",doi:doi(x.DOI),title:clean(x.title?.[0]),authors,
      year:String(dateParts[0]||""),date:dateParts.length===3?
        dateParts.map((v,i)=>i?String(v).padStart(2,"0"):String(v)).join("-"):"",
      journal:clean(x["container-title"]?.[0]),
      metadata_url:"https://api.crossref.org/works/"+encodeURI(doi(x.DOI))};
  }
  function datacite(payload) {
    const x=payload?.data?.attributes;
    if(!x||!x.doi)return null;
    const authors=Array.isArray(x.creators)?x.creators
      .map(a=>clean(a.name||[a.givenName,a.familyName].filter(Boolean).join(" "))).filter(Boolean):[];
    return {source:"DataCite",doi:doi(x.doi),title:clean(x.titles?.[0]?.title),authors,
      year:clean(x.publicationYear),date:clean(x.dates?.find(d=>d.dateType==="Issued")?.date||""),
      journal:clean(x.container?.title||""),metadata_url:"https://api.datacite.org/dois/"+encodeURI(doi(x.doi))};
  }
  // Surnames are a cautious conflict signal, not an assertion of equivalence.
  function surnames(authors){
    return (Array.isArray(authors)?authors:[]).map(a=>{
      const v=canonical(a).split(" ").filter(Boolean);
      if(!v.length)return "";
      const tokens=v[0]&&a.includes(",")?[v[0]]:v;
      return tokens[tokens.length-1];
    }).filter(x=>x.length>1);
  }
  const sourceFields = r => ({
    title:clean(r.title),doi:clean(r.doi),year:clean(r.year),date:clean(r.date),
    journal:clean(r.journal),authors:Array.isArray(r.authors)?[...r.authors]:[],
    abstract:clean(r.abstract)
  });
  function reconcile(original, external, checkedAt=new Date().toISOString()) {
    const base={...original};
    const prior=sourceFields(original);
    const lookupDoi=doi(prior.doi);
    const xref={version:1,status:"unverified",checked_at:checkedAt,
      source:external?.source||"",metadata_url:external?.metadata_url||"",
      doi:lookupDoi,original:prior,field_provenance:{},conflicts:[],suggested:{},cosmetic_differences:[],review_differences:[]};
    if(!validDoi(lookupDoi)){xref.status="missing_or_invalid_doi";base.xref=xref;base.xref_status=xref.status;base.xref_source="";return base;}
    if(!external){xref.status="not_found";base.xref=xref;base.xref_status=xref.status;base.xref_source="";return base;}
    if(doi(external.doi)!==lookupDoi){
      xref.status="conflict";xref.conflicts.push("doi_mismatch");base.xref=xref;base.xref_status=xref.status;base.xref_source=xref.source;return base;
    }
    const titleScore=similarity(prior.title,external.title);
    xref.title_similarity=Number(titleScore.toFixed(3));
    if(titleScore<0.92)xref.conflicts.push("title_mismatch");
    const y1=yearOf(prior.year),y2=yearOf(external.year);
    if(y1&&y2&&Math.abs(y1-y2)>1)xref.conflicts.push("publication_year_mismatch");
    else if(y1&&y2&&y1!==y2)xref.review_differences.push("publication_year_online_vs_print");
    const a1=surnames(prior.authors),a2=surnames(external.authors);
    if(a1.length&&a2.length&&!a1.some(a=>a2.includes(a)))xref.conflicts.push("author_mismatch");
    if(xref.conflicts.length){xref.status="conflict";base.xref=xref;base.xref_status=xref.status;base.xref_source=xref.source;return base;}
    xref.status="registry_match"; // One registrar is not independent multi-source confirmation.
    // Only missing, limited fields may be filled. Never replace a source value.
    for(const key of ["year","date","journal","authors"]){
      const current=original[key],candidate=external[key];
      const missing=Array.isArray(current)?!current.length:!clean(current);
      const hasCandidate=Array.isArray(candidate)?candidate.length>0:!!clean(candidate);
      if(missing&&hasCandidate){
        base[key]=Array.isArray(candidate)?[...candidate]:clean(candidate);
        xref.field_provenance[key]={source:external.source,url:external.metadata_url,
          checked_at:checkedAt,action:"filled_originally_empty"};
      }else if(!missing&&hasCandidate){
        const asText=x=>Array.isArray(x)?x.join(";"):clean(x);
        if(canonical(asText(current))!==canonical(asText(candidate))){
          xref.suggested[key]=Array.isArray(candidate)?[...candidate]:clean(candidate);
        }else if(asText(current)!==asText(candidate)){
          xref.cosmetic_differences.push(key);
        }
      }
    }
    // Abstracts in registries may have copyright/reuse restrictions.
    // Do not inject abstract HTML or assume search-result snippets are abstracts.
    xref.abstract_policy="not_auto_copied";
    base.xref=xref;base.xref_status=xref.status;base.xref_source=xref.source;return base;
  }
  function flagged(record,status,details=""){
    const result={...record,xref_status:status,xref_source:"",xref:{version:1,status,
      doi:doi(record.doi),checked_at:null,source:"",metadata_url:"",
      original:sourceFields(record),field_provenance:{},conflicts:[],
      suggested:{},cosmetic_differences:[],review_differences:[],note:details}};
    return result;
  }
  const verifiedBefore = (r,key) => {
    const status=r.xref?.status||r.xref_status||"";
    return ["registry_match","conflict"].includes(status)&&
      doi(r.xref?.doi||r.xref?.original?.doi)===key;
  };
  // cache: Map<DOI,{external:metadata|null, cached_at:ISO,expires_at:ms}>
  // Each cache hit costs zero network requests and can serve multiple records.
  async function enrichRecords(records,lookup,{maxLookups=30,cache=new Map(),
    preserveVerified=true,onProgress=()=>{},isCancelled=()=>false}={}) {
    if(!Array.isArray(records))throw Error("Cross-reference: registros inválidos.");
    if(typeof lookup!=="function")throw Error("Cross-reference: lookup obrigatório.");
    const budget=Math.max(0,Math.min(250,Number(maxLookups)||0));
    const output=new Array(records.length);
    const requests=new Map(),planned=new Set();
    let networkPlanned=0,cacheHits=0,alreadyVerified=0;
    const priorities=records.map((r,i)=>({i,
      pending:r.xref_status==="not_checked_budget"||!r.xref_status?2:
        r.xref_status==="lookup_error"?0:1,
      missing:["year","date","journal"].filter(k=>!clean(r[k])).length+
        (!Array.isArray(r.authors)||!r.authors.length?1:0)}))
      .sort((a,b)=>b.pending-a.pending||b.missing-a.missing||a.i-b.i);
    const checks=[];
    for(const {i} of priorities){
      const record=records[i],key=doi(record.doi);
      if(!validDoi(key)){output[i]=flagged(record,"missing_or_invalid_doi");continue;}
      if(preserveVerified&&verifiedBefore(record,key)){
        output[i]={...record};alreadyVerified++;continue;
      }
      if(!planned.has(key)){
        const entry=cache instanceof Map?cache.get(key):null;
        if(entry&&Object.hasOwn(entry,"external")&&
           Number(entry.expires_at)>Date.now()){
          requests.set(key,{external:entry.external,error:"",cacheHit:true});
          cacheHits++;
        }else if(networkPlanned<budget){
          requests.set(key,null);networkPlanned++;
        }else{output[i]=flagged(record,"not_checked_budget");continue;}
        planned.add(key);
      }
      checks.push({i,key});
    }
    const unique=[...new Set(checks.map(x=>x.key))]
      .filter(key=>requests.get(key)===null);
    let completed=0;
    for(let cursor=0;cursor<unique.length;cursor+=2){
      if(isCancelled())break;
      await Promise.all(unique.slice(cursor,cursor+2).map(async key=>{
        try{
          const data=await lookup(key);
          requests.set(key,{external:data||null,error:"",cacheHit:false});
        }catch(error){
          requests.set(key,{external:null,error:clean(error?.message||error).slice(0,160),
            cacheHit:false});
        }
        completed++;
        onProgress({checked:completed,requested:unique.length,total:records.length,
          cacheHits,alreadyVerified});
      }));
      if(cursor+2<unique.length)await new Promise(resolve=>setTimeout(resolve,400));
    }
    const now=new Date().toISOString();
    for(const {i,key} of checks){
      const response=requests.get(key);
      if(!response||!Object.hasOwn(response,"external")){
        output[i]=flagged(records[i],isCancelled()?"cancelled":"not_checked_budget");continue;
      }
      output[i]=response.error?flagged(records[i],"lookup_error",response.error):
        reconcile(records[i],response.external,now);
      if(response.cacheHit&&output[i].xref)output[i].xref.cache_hit=true;
    }
    const summary={engine:"DELTA XRef v0.6.1",scope:"all_adapters",
      records:records.length,unique_doi_lookups:completed,budget,
      cache_hits:cacheHits,already_verified:alreadyVerified,
      registry_match:0,conflict:0,not_found:0,missing_or_invalid_doi:0,
      not_checked_budget:0,lookup_error:0,cancelled:0,
      enriched_records:0,fields_filled:0,cosmetic_differences:0,
      review_differences:0};
    for(const r of output){
      const status=r.xref?.status||"unverified";
      summary[status]=(summary[status]||0)+1;
      const prov=r.xref?.field_provenance||{};
      if(Object.keys(prov).length){summary.enriched_records++;summary.fields_filled+=Object.keys(prov).length;}
      summary.cosmetic_differences+=(r.xref?.cosmetic_differences||[]).length;
      summary.review_differences+=(r.xref?.review_differences||[]).length;
    }
    summary.remaining=summary.not_checked_budget+summary.lookup_error+summary.cancelled;
    return {records:output,summary};
  }
  // Explicit human-reviewed discovery only. Never assign candidate DOI to a
  // record automatically or add candidates to the search's captured set.
  function candidateReview(record,payload) {
    const list=payload?.message?.items;
    if(!Array.isArray(list))throw Error("Crossref: lista de candidatos inválida.");
    const candidates=list.slice(0,5).map(item=>{
      const candidate=crossref({message:item});
      if(!candidate||!validDoi(candidate.doi))return null;
      const score=similarity(record.title,candidate.title);
      const ry=yearOf(record.year),cy=yearOf(candidate.year);
      const authorOverlap=surnames(record.authors).some(a=>surnames(candidate.authors).includes(a));
      return {doi:candidate.doi,title:candidate.title,
        year:candidate.year,journal:candidate.journal,authors:candidate.authors,
        source:"Crossref",metadata_url:candidate.metadata_url,
        title_similarity:Number(score.toFixed(3)),
        year_compatible:ry&&cy?Math.abs(ry-cy)<=1:null,
        author_overlap:authorOverlap,
        identity:"UNVERIFIED_CANDIDATE_DO_NOT_AUTO_ASSIGN"};
    }).filter(Boolean).sort((a,b)=>b.title_similarity-a.title_similarity);
    return {original:{source:record.source,identifier:record.identifier,
      title:record.title,year:record.year,authors:record.authors,doi:record.doi},
      candidates,review_required:true,auto_assigned:false};
  }
  globalThis.DELTA_XREF={doi,validDoi,similarity,canonical,crossref,datacite,reconcile,enrichRecords,candidateReview};
})();
