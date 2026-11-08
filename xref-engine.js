/* DELTA Research Collector — universal DOI-first cross-reference engine v0.6.0.
 * GPL-3.0-or-later. No fuzzy auto-merging, no silent source replacements.
 */
(() => {
  "use strict";
  const clean = x => String(x ?? "").replace(/\s+/g, " ").trim();
  const doi = x => clean(x).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "").toLowerCase().replace(/[.,;]+$/, "");
  const validDoi = d => /^10\.\d{4,9}\/[^\s"'<>]+$/i.test(d) &&
    d.length<=255 && !/(?:google|scholar|crossref|abstract|resumo|detalhes)$/i.test(d);
  const canonical = x => clean(x).replace(/<[^>]*>/g," ").normalize("NFKD")
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
      doi:lookupDoi,original:prior,field_provenance:{},conflicts:[],suggested:{}};
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
      }else if(!missing&&hasCandidate&&
        canonical(Array.isArray(current)?current.join(";"):current)!==
        canonical(Array.isArray(candidate)?candidate.join(";"):candidate)){
        xref.suggested[key]=Array.isArray(candidate)?[...candidate]:clean(candidate);
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
      suggested:{},note:details}};
    return result;
  }
  async function enrichRecords(records,lookup,{maxLookups=40,onProgress=()=>{},isCancelled=()=>false}={}) {
    if(!Array.isArray(records))throw Error("Cross-reference: registros inválidos.");
    const budget=Math.max(0,Math.min(250,Number(maxLookups)||0));
    const output=new Array(records.length);
    const requests=new Map();
    let attempts=0;
    // Prefer completing records with missing metadata first; all input orders
    // are restored in the final array. No-DOI records are never fuzzy matched.
    const priorities=records.map((r,i)=>({i,
      missing:["year","date","journal"].filter(k=>!clean(r[k])).length+
        (!Array.isArray(r.authors)||!r.authors.length?1:0)}))
      .sort((a,b)=>b.missing-a.missing||a.i-b.i);
    const checks=[];
    for(const {i} of priorities) {
      const record=records[i],key=doi(record.doi);
      if(!validDoi(key)){output[i]=flagged(record,"missing_or_invalid_doi");continue;}
      if(!requests.has(key)){
        if(attempts>=budget){output[i]=flagged(record,"not_checked_budget");continue;}
        requests.set(key,null);attempts++;
      }
      checks.push({i,key});
    }
    const unique=[...new Set(checks.map(x=>x.key))];
    let completed=0;
    for(let cursor=0;cursor<unique.length;cursor+=2){
      if(isCancelled())break;
      const group=unique.slice(cursor,cursor+2);
      await Promise.all(group.map(async key=>{
        try{
          const data=await lookup(key);
          requests.set(key,{external:data||null,error:""});
        }catch(error){
          requests.set(key,{external:null,error:clean(error?.message||error).slice(0,160)});
        }
        completed++;
        onProgress({checked:completed,requested:unique.length,total:records.length});
      }));
      if(cursor+2<unique.length)await new Promise(resolve=>setTimeout(resolve,400));
    }
    const now=new Date().toISOString();
    for(const {i,key} of checks){
      const response=requests.get(key);
      if(!response||!response.hasOwnProperty("external")){
        output[i]=flagged(records[i],isCancelled()?"cancelled":"not_checked_budget");continue;
      }
      output[i]=response.error?flagged(records[i],"lookup_error",response.error):
        reconcile(records[i],response.external,now);
    }
    const summary={engine:"DELTA XRef v0.6.0",scope:"all_adapters",
      records:records.length,unique_doi_lookups:completed,budget,
      registry_match:0,conflict:0,not_found:0,missing_or_invalid_doi:0,
      not_checked_budget:0,lookup_error:0,cancelled:0,
      enriched_records:0,fields_filled:0};
    for(const x of output){
      const status=x.xref?.status||"unverified";
      summary[status]=(summary[status]||0)+1;
      const count=Object.keys(x.xref?.field_provenance||{}).length;
      if(count){summary.enriched_records++;summary.fields_filled+=count;}
    }
    return {records:output,summary};
  }
  globalThis.DELTA_XREF={doi,validDoi,similarity,crossref,datacite,reconcile,enrichRecords};
})();
