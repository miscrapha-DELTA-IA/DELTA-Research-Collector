/* DELTA Research Collector • visual review matrix • GPL-3.0-or-later */
(() => {
  'use strict';
  const STATES = ['pending', 'include', 'exclude', 'maybe'];
  const ACCESS = ['open', 'publisher_restricted', 'no_open_copy_found', 'unknown'];

  function auditCoverage({source = '', retrieval_mode = '', collected = 0, requested_limit = null,
      reported_total = null, expected_total = null, truncated = false, cancelled = false,
      failed = false, filters = {}, query = ''} = {}) {
    const valid = v => v !== '' && v != null && Number.isSafeInteger(Number(v)) && Number(v) >= 0;
    const manual = valid(expected_total) ? Number(expected_total) : null;
    const providerTotal = valid(reported_total) ? Number(reported_total) : null;
    const expected = manual ?? providerTotal;
    const count = Math.max(0, Number(collected) || 0);
    let count_status = 'not_verified';
    if (expected !== null) count_status = count < expected ? 'below_reported' : count > expected ? 'above_reported' : 'count_match_only';
    if (failed || cancelled || truncated) count_status = 'partial_or_interrupted';
    const capture_mode = String(retrieval_mode || 'provider_adapter');
    const sourceId = String(source).toLowerCase();
    const unableToReplicate = ['ieee', 'biorxiv', 'medrxiv', 'doaj'].includes(sourceId) || capture_mode === 'visible_page_only';
    const evidence = [];
    if (unableToReplicate) evidence.push('A estratégia ou paginação da plataforma pode não ter sido reproduzida integralmente.');
    if (failed) evidence.push('Houve falha durante a coleta.');
    if (cancelled) evidence.push('Coleta cancelada.');
    if (truncated) evidence.push('Limite de coleta, paginação ou varredura atingido.');
    if (expected !== null && count < expected) evidence.push('Menos registros que o total informado/retornado.');
    if (manual !== null && providerTotal !== null && manual !== providerTotal) evidence.push('Total exibido e total da API divergentes.');
    if (!String(query || '').trim()) evidence.push('Expressão de busca não recuperada da URL.');
    const partial = failed || cancelled || truncated || (expected !== null && count < expected) || capture_mode === 'visible_page_only';
    return {
      expected_total: expected, expected_total_source: manual !== null ? 'informado_pelo_usuario' : providerTotal !== null ? 'informado_pela_api' : 'indisponivel',
      reported_total: providerTotal, user_reported_total: manual,
      exported_count: count, count_status,
      coverage_percent: expected !== null && expected > 0 ? Number((count / expected * 100).toFixed(2)) : null,
      partial: Boolean(partial),
      query_fidelity: unableToReplicate ? 'not_equivalent_to_site_search' : 'not_independently_verified',
      captured_filter_keys: Object.keys(filters && typeof filters === 'object' ? filters : {}),
      exact_set_equivalence: 'not_verified',
      warnings: evidence,
      note: 'Concordância de contagens NÃO comprova identidade dos registros, dos filtros ou da ordenação. Valide na fonte original.'
    };
  }

  function asText(v) { return v == null ? '' : String(v); }
  function esc(s) { return asText(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function cleanRecord(r) {
    const x = r && typeof r === 'object' ? r : {};
    return {
      source: asText(x.source), identifier: asText(x.identifier), title: asText(x.title),
      authors: Array.isArray(x.authors) ? x.authors.map(asText).join('; ') : asText(x.authors),
      year: asText(x.year), doi: asText(x.doi), journal: asText(x.journal),
      abstract: asText(x.abstract), article_url: asText(x.article_url), access_url: asText(x.access_url),
      pdf_url: asText(x.pdf_url), access_status: ACCESS.includes(x.access_status) ? x.access_status : 'unknown',
      access_evidence: asText(x.access_evidence), search_query: asText(x.search_query), collected_at: asText(x.collected_at)
    };
  }
  function reviewHtml(records, metadata = {}) {
    if (!Array.isArray(records)) throw new TypeError('A matriz requer um array de registros.');
    if (records.length > 12000) throw new RangeError('Matriz limitada a 12.000 registros; divida a biblioteca.');
    const rows = records.map(cleanRecord);
    const meta = {
      source: asText(metadata.source || 'Biblioteca DELTA'),
      search_query: asText(metadata.search_query),
      original_search_url: asText(metadata.original_search_url),
      exported_at: asText(metadata.exported_at || new Date().toISOString()),
      retrieval_mode: asText(metadata.retrieval_mode),
      audit: metadata.audit || {},
      collector_note: asText(metadata.collector_note)
    };
    const payload = JSON.stringify({rows, meta}).replace(/[<>&\u2028\u2029]/g, c => ({'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'}[c]));
    const start = String.raw`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DELTA — Matriz de revisão</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#172e43;background:#f3f7fa;font-size:14px;color-scheme:light}
*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}button{cursor:pointer}a{color:#076b83;text-underline-offset:2px}
header{background:linear-gradient(115deg,#08243d,#0b4660);color:#fff;padding:30px max(18px,calc((100vw - 1440px)/2)) 26px;position:relative;overflow:hidden}header:after{content:'';position:absolute;width:470px;height:470px;border:1px solid #ffffff20;border-radius:50%;right:-90px;top:-260px;pointer-events:none}
.brand{font-size:12px;letter-spacing:.18em;font-weight:800;color:#61e3df}.brand span{font-size:18px;letter-spacing:0;margin-right:8px}.header-row{display:flex;align-items:end;justify-content:space-between;gap:15px;flex-wrap:wrap}h1{font-size:clamp(25px,3vw,37px);margin:8px 0 6px;letter-spacing:-.04em}.sub{color:#bdd3df;margin:0;max-width:900px;overflow-wrap:anywhere;line-height:1.6}.pill{display:inline-block;border:1px solid #ffffff40;background:#ffffff14;border-radius:99px;padding:6px 10px;font-size:12px}
main{max-width:1480px;margin:0 auto;padding:24px 20px 50px}.kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:18px}.kpi{border:1px solid #dce7ee;border-radius:14px;padding:15px;background:white;box-shadow:0 3px 16px #1d4b5d0a}.kpi b{display:block;font-size:26px;color:#0c3d57;font-variant-numeric:tabular-nums}.kpi small{color:#58738a;font-weight:600}.bar{height:4px;background:#dbe5ec;border-radius:4px;margin-top:10px}.bar i{display:block;height:100%;background:#00aeb2;border-radius:4px}
.section{border:1px solid #dce7ee;border-radius:15px;background:white;margin:16px 0;box-shadow:0 3px 18px #193c4a09}.section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:18px 20px;border-bottom:1px solid #e6edf1}.section-head h2{font-size:16px;margin:0}.section-head p{margin:5px 0 0;color:#677d8e;font-size:12px}.body{padding:18px 20px}.audit{border-left:4px solid #cf8127;background:#fff8ed;padding:12px 14px;border-radius:8px;line-height:1.5}.audit.ok{border-left-color:#059c9d;background:#edfafa}.audit strong{display:block;margin-bottom:3px}.audit small{color:#4d6879}.audit ul{margin:7px 0 0;padding-left:19px}.meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.meta-grid div{overflow-wrap:anywhere}.label{font-size:11px;color:#718898;text-transform:uppercase;letter-spacing:.07em;font-weight:700}.value{margin-top:4px;font-size:13px;line-height:1.5}
.toolbar{display:grid;grid-template-columns:minmax(240px,2fr) repeat(3,minmax(130px,1fr)) auto;gap:9px}.field{display:flex;flex-direction:column;gap:5px}.field label{font-weight:700;color:#617a8d;font-size:11px}input[type=search],select,input[type=text],textarea{border:1px solid #cfdee7;border-radius:9px;padding:10px;background:#fff;color:#12334b;min-width:0;width:100%}input:focus,select:focus,textarea:focus{outline:2px solid #1eb0bb55;border-color:#1c95a9}.btn{background:#0c536b;color:#fff;border:1px solid #0b536b;border-radius:9px;padding:10px 12px;font-weight:700;font-size:12px}.btn:hover{background:#0b7285}.btn.secondary{background:#fff;color:#0b536b}.btn.pale{background:#ebf5f8;color:#0b536b;border-color:#d4e8ed}.actions{display:flex;flex-wrap:wrap;gap:8px}.muted{color:#667f8e;font-size:12px}.small{font-size:11px}.legend{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.table-wrap{overflow:auto;max-height:min(66vh,850px)}table{border-collapse:collapse;width:100%;min-width:1080px}th{position:sticky;top:0;background:#eaf1f5;text-align:left;color:#466476;font-size:11px;letter-spacing:.06em;text-transform:uppercase;padding:12px;z-index:2}td{vertical-align:top;border-top:1px solid #e8eef1;padding:14px 12px;font-size:12px}tbody tr:nth-child(even){background:#fbfdfe}tbody tr:hover{background:#f0fafb}.title{font-weight:760;font-size:13px;line-height:1.45;margin-bottom:5px;color:#14374d}.source{color:#537184;font-size:11px}.abstract{max-width:590px;line-height:1.6;color:#3e5a69;white-space:normal}.abstract summary{cursor:pointer;color:#0b7187;font-weight:650}.badge{display:inline-block;border-radius:7px;padding:5px 8px;font-size:11px;font-weight:780;white-space:nowrap}.b-open{background:#e2f8ef;color:#117a51}.b-restrict{background:#ffebeb;color:#aa2e3b}.b-missing{background:#fff4dd;color:#91601b}.b-unknown{background:#eef2f7;color:#536779}.b-pending{background:#edf2f7;color:#5e7081}.b-include{background:#e2f8ef;color:#117a51}.b-exclude{background:#ffe9ec;color:#ab3443}.b-maybe{background:#fff0da;color:#946026}.review-select{min-width:130px}.notes{width:190px!important;min-height:62px;resize:vertical;font-size:12px}.reason{width:170px!important}.link{display:block;white-space:nowrap;margin-top:4px;font-size:11px}.pages{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;padding:14px 19px}.empty{padding:34px;text-align:center;color:#738899}.help{font-size:12px;color:#5e7485;line-height:1.65;margin:0}.status-message{font-size:12px;color:#0c7b80;margin-top:8px}
@media(max-width:1050px){.kpis{grid-template-columns:repeat(3,1fr)}.toolbar{grid-template-columns:1fr 1fr}.meta-grid{grid-template-columns:1fr}}@media(max-width:640px){header{padding:25px 18px}.kpis{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}.body{padding:14px}.section-head{padding:14px}main{padding:14px}}
@media print{header{background:white!important;color:black!important}.sub,.brand{color:#333!important}.no-print,.toolbar,.actions,.pages{display:none!important}.section{box-shadow:none}.table-wrap{max-height:none;overflow:visible}th{position:static}table{min-width:0}td{overflow-wrap:anywhere}}
</style></head><body><header><div class="header-row"><div><div class="brand"><span>△</span> DELTA RESEARCH COLLECTOR</div><h1>Matriz de revisão científica</h1><p class="sub">Uma visão organizada para leitura manual, triagem e rastreabilidade — sem envio de dados a servidores.</p></div><span class="pill" id="stamp"></span></div></header><main>
<section class="kpis" id="kpis"></section>
<section class="section"><div class="section-head"><div><h2>Integridade da coleta</h2><p>Comparação de contagens, não uma certificação de equivalência entre resultados.</p></div><span class="pill" style="background:#0d5964;color:white" id="audit-state"></span></div><div class="body"><div id="audit-box" class="audit"></div><div class="meta-grid" style="margin-top:16px" id="meta-grid"></div></div></section>
<section class="section"><div class="section-head"><div><h2>Triagem manual</h2><p>As decisões ficam nesta página até você exportá-las. Salve o JSON de decisões para retomar depois.</p></div><div class="legend no-print"><button class="btn secondary" id="save-csv">Exportar matriz anotada CSV</button><button class="btn" id="save-json">Salvar decisões JSON</button><label class="btn pale" for="restore">Retomar decisões</label><input type="file" id="restore" accept=".json,application/json" hidden></div></div>
<div class="body no-print"><div class="toolbar"><div class="field"><label for="search">PESQUISAR NOS REGISTROS</label><input type="search" id="search" placeholder="Título, autor, DOI, resumo…" autocomplete="off"></div><div class="field"><label for="source">FONTE</label><select id="source"><option value="">Todas</option></select></div><div class="field"><label for="access">ACESSO</label><select id="access"><option value="">Todos</option><option value="open">Aberto identificado</option><option value="publisher_restricted">Restrito na editora</option><option value="no_open_copy_found">Sem cópia OA localizada</option><option value="unknown">Não verificado</option></select></div><div class="field"><label for="decision">DECISÃO</label><select id="decision"><option value="">Todas</option><option value="pending">Pendente</option><option value="include">Incluir</option><option value="exclude">Excluir</option><option value="maybe">Dúvida</option></select></div><div class="field"><label for="sort">ORDENAR</label><select id="sort"><option value="original">Ordem original</option><option value="year-desc">Ano ↓</option><option value="year-asc">Ano ↑</option><option value="title">Título A-Z</option></select></div></div><div class="actions" style="margin-top:11px"><label class="muted"><input type="checkbox" id="missing-doi"> Apenas sem DOI</label><label class="muted"><input type="checkbox" id="missing-abstract"> Apenas sem resumo</label><button class="btn pale" id="clear-filters">Limpar filtros</button><span class="muted" id="result-counter"></span></div></div>
<div class="table-wrap"><table><thead><tr><th style="width:48px">#</th><th style="width:29%">Artigo & leitura</th><th>Fonte / ano</th><th>Acesso</th><th style="width:170px">Triagem</th><th style="width:175px">Motivo</th><th style="width:190px">Notas</th></tr></thead><tbody id="rows"></tbody></table><div class="empty" id="empty" hidden>Nenhum registro corresponde aos filtros.</div></div><div class="pages no-print"><span class="muted" id="pageinfo"></span><div class="actions"><button class="btn secondary" id="prev">← Anterior</button><button class="btn secondary" id="next">Próxima →</button></div></div>
</section><section class="section"><div class="body"><p class="help"><strong>Como utilizar:</strong> marque <em>Incluir</em>, <em>Excluir</em> ou <em>Dúvida</em>, registre a justificativa e exporte CSV para Excel ou JSON para continuar esta triagem depois. Arquivos HTML isolados podem não preservar alterações ao fechar: faça a exportação antes de sair. A identificação de acesso aberto não substitui verificação do texto completo. Os dados de busca e a auditoria acompanham as exportações.</p><p class="status-message" role="status" aria-live="polite" id="message"></p></div></section>
</main><script type="application/json" id="delta-data">`;
    const finish = String.raw`</script><script>
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('delta-data').textContent);
  const rows = data.rows, meta = data.meta, audit = meta.audit || {};
  const $ = id => document.getElementById(id);
  const decisions = Object.create(null);
  const accessText = {open:'Aberto',publisher_restricted:'Restrito',no_open_copy_found:'Sem OA localizada',unknown:'Desconhecido'};
  const decisionText = {pending:'Pendente',include:'Incluir',exclude:'Excluir',maybe:'Dúvida'};
  const statuses = ['pending','include','exclude','maybe'];
  const stableKey = (r,i) => (r.doi ? 'doi:' + r.doi.toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//i,'') : 'id:' + r.source + ':' + (r.identifier||i));
  const keys = rows.map(stableKey);
  const cell = (text,tag='span',cls='') => { const el=document.createElement(tag); el.textContent=text == null ? '' : String(text); if(cls)el.className=cls; return el; };
  const link = (url,label) => {try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return null;const a=cell(label,'a','link');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}};
  function displayMeta(){
    $('stamp').textContent=meta.exported_at ? 'Exportado em ' + new Date(meta.exported_at).toLocaleString('pt-BR') : 'Relatório offline';
    const known=audit.expected_total !== null && audit.expected_total !== undefined;
    const partial=Boolean(audit.partial);
    const status=partial?'PARCIAL':known&&audit.count_status==='count_match_only'?'CONTAGEM CONFERE':'NÃO VERIFICADO';
    $('audit-state').textContent=status;
    $('audit-box').className='audit'+(!partial&&known&&audit.count_status==='count_match_only'?' ok':'');
    const label=known ? ('Coletados '+rows.length+' de '+audit.expected_total+' · cobertura numérica '+audit.coverage_percent+'%') : ('Coletados '+rows.length+' registros · total original não verificado');
    $('audit-box').append(cell(label,'strong'));
    $('audit-box').append(cell(audit.note || 'A equivalência entre filtros, ordem e conjunto de artigos precisa de verificação humana.','small'));
    if(audit.warnings&&audit.warnings.length){const ul=document.createElement('ul');for(const w of audit.warnings)ul.append(cell(w,'li'));$('audit-box').append(ul);}
    const display=[['Origem',meta.source],['Método',meta.retrieval_mode||'Não informado'],['Expressão recuperada',meta.search_query||'Não identificada'],['URL da pesquisa',meta.original_search_url||'Não disponível'],['Evidência de filtros',audit.query_fidelity||'Não verificada']];
    for(const [k,v] of display){const box=document.createElement('div');box.append(cell(k,'div','label'));const item=cell(v,'div','value');box.append(item);$('meta-grid').append(box);}
    const sources=[...new Set(rows.map(r=>r.source).filter(Boolean))].sort();
    for(const s of sources){const opt=cell(s,'option');opt.value=s;$('source').append(opt);}
  }
  function summary(){
    const counts=[['Registros',rows.length],['Acesso aberto',rows.filter(r=>r.access_status==='open').length],['Restritos na editora',rows.filter(r=>r.access_status==='publisher_restricted').length],['DOI ausente',rows.filter(r=>!r.doi).length],['Triados',Object.values(decisions).filter(d=>d.status&&d.status!=='pending').length]];
    $('kpis').replaceChildren(...counts.map(([name,n])=>{const b=document.createElement('div');b.className='kpi';b.append(cell(n.toLocaleString('pt-BR'),'b'));b.append(cell(name,'small'));const base=document.createElement('div');base.className='bar';const fill=document.createElement('i');fill.style.width=(rows.length?Math.min(100,n/rows.length*100):0)+'%';base.append(fill);b.append(base);return b;}));
  }
  let page=0;const PAGE=35;
  function matches(r,i){
    const q=$('search').value.trim().toLocaleLowerCase();
    const d=decisions[keys[i]]||{status:'pending'};
    return (!q||[r.title,r.authors,r.abstract,r.doi,r.journal,r.source].join(' ').toLocaleLowerCase().includes(q))&&
      (!$('source').value||r.source===$('source').value)&&(!$('access').value||r.access_status===$('access').value)&&
      (!$('decision').value||d.status===$('decision').value)&&(!$('missing-doi').checked||!r.doi)&&
      (!$('missing-abstract').checked||!r.abstract);
  }
  function render(){
    let subset=rows.map((r,i)=>i).filter(i=>matches(rows[i],i));
    const sort=$('sort').value;
    if(sort!=='original')subset.sort((a,b)=>sort==='title'?rows[a].title.localeCompare(rows[b].title):sort==='year-asc'?Number(rows[a].year||0)-Number(rows[b].year||0):Number(rows[b].year||0)-Number(rows[a].year||0));
    const totalPages=Math.max(1,Math.ceil(subset.length/PAGE));page=Math.max(0,Math.min(page,totalPages-1));
    const slice=subset.slice(page*PAGE,(page+1)*PAGE);const tbody=$('rows');tbody.replaceChildren();
    for(const i of slice){
      const r=rows[i],d=decisions[keys[i]]||{status:'pending',reason:'',notes:''};
      const tr=document.createElement('tr');tr.append(cell(i+1,'td'));
      const c1=document.createElement('td');c1.append(cell(r.title||'(sem título)','div','title'));
      c1.append(cell(r.authors||'Autores não disponíveis','div','source'));
      if(r.journal)c1.append(cell(r.journal,'div','source'));
      if(r.abstract){const detail=document.createElement('details');const sum=cell('Ler resumo','summary');detail.append(sum,cell(r.abstract,'div','abstract'));c1.append(detail);}else c1.append(cell('Resumo indisponível','div','source'));
      const l=link(r.article_url,'Abrir artigo ↗');if(l)c1.append(l);const pdf=link(r.pdf_url||r.access_url,'Texto completo / acesso ↗');if(pdf)c1.append(pdf);if(r.doi)c1.append(cell('DOI: '+r.doi,'div','source'));tr.append(c1);
      const c2=document.createElement('td');c2.append(cell(r.source||'—','div'));c2.append(cell(r.year||'—','div','source'));tr.append(c2);
      const c3=document.createElement('td');const badge=cell(accessText[r.access_status]||'Desconhecido','span','badge b-'+(r.access_status==='open'?'open':r.access_status==='publisher_restricted'?'restrict':r.access_status==='no_open_copy_found'?'missing':'unknown'));c3.append(badge);if(r.access_evidence)c3.append(cell(r.access_evidence,'div','source'));tr.append(c3);
      const c4=document.createElement('td');const sel=document.createElement('select');sel.className='review-select';sel.setAttribute('aria-label','Decisão para '+r.title);for(const status of statuses){const o=cell(decisionText[status],'option');o.value=status;sel.append(o);}sel.value=d.status||'pending';sel.addEventListener('change',()=>{const x=decisions[keys[i]]||(decisions[keys[i]]={status:'pending',reason:'',notes:''});x.status=sel.value;summary();if($('decision').value)render();});c4.append(sel);tr.append(c4);
      const c5=document.createElement('td');const reason=document.createElement('input');reason.className='reason';reason.type='text';reason.maxLength=600;reason.value=d.reason||'';reason.placeholder='Critério / motivo';reason.setAttribute('aria-label','Motivo de '+r.title);reason.addEventListener('input',()=>{const x=decisions[keys[i]]||(decisions[keys[i]]={status:'pending',reason:'',notes:''});x.reason=reason.value;});c5.append(reason);tr.append(c5);
      const c6=document.createElement('td');const notes=document.createElement('textarea');notes.className='notes';notes.maxLength=3000;notes.value=d.notes||'';notes.placeholder='Observações de leitura';notes.setAttribute('aria-label','Notas de '+r.title);notes.addEventListener('input',()=>{const x=decisions[keys[i]]||(decisions[keys[i]]={status:'pending',reason:'',notes:''});x.notes=notes.value;});c6.append(notes);tr.append(c6);
      tbody.append(tr);
    }
    $('empty').hidden=subset.length>0;$('result-counter').textContent=subset.length+' / '+rows.length+' registros';
    $('pageinfo').textContent='Página '+(page+1)+' / '+totalPages+' · até '+PAGE+' artigos por página';
    $('prev').disabled=page===0;$('next').disabled=page>=totalPages-1;
  }
  function csvCell(v){let x=String(v??'');if(/^[\s]*[=+\-@]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';}
  function download(content,name,type){const blob=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000);$('message').textContent='Arquivo gerado: '+name;}
  const date=()=>new Date().toISOString().slice(0,10);
  function saveCsv(){
    const fields=['id','fonte','titulo','autores','ano','doi','acesso','decisao','motivo','notas','link','resumo','busca','data_coleta'];
    const rowsCsv=rows.map((r,i)=>{const d=decisions[keys[i]]||{};return [keys[i],r.source,r.title,r.authors,r.year,r.doi,r.access_status,d.status||'pending',d.reason||'',d.notes||'',r.article_url,r.abstract,r.search_query||meta.search_query,r.collected_at].map(csvCell).join(',');});
    download('\uFEFF'+fields.map(csvCell).join(',')+'\r\n'+rowsCsv.join('\r\n')+'\r\n','DELTA_matriz_triada_'+date()+'.csv','text/csv;charset=utf-8');
  }
  function saveJson(){download(JSON.stringify({format:'delta-review-decisions-v1',exported_at:new Date().toISOString(),source_metadata:meta,records:rows.length,decisions},null,2),'DELTA_decisoes_triagem_'+date()+'.json','application/json;charset=utf-8');}
  async function restore(e){const file=e.target.files&&e.target.files[0];if(!file)return;if(file.size>10_000_000){$('message').textContent='Arquivo de decisões maior que 10 MB.';return;}
    try{const doc=JSON.parse(await file.text());if(doc.format!=='delta-review-decisions-v1'||!doc.decisions||typeof doc.decisions!=='object')throw Error('Formato não reconhecido');const allowed=new Set(keys);let found=0;for(const [key,val] of Object.entries(doc.decisions)){if(!allowed.has(key)||!val||!statuses.includes(val.status))continue;decisions[key]={status:val.status,reason:String(val.reason||'').slice(0,600),notes:String(val.notes||'').slice(0,3000)};found++;}summary();render();$('message').textContent=found+' decisões associadas a esta matriz. Verifique a correspondência dos artigos.';}catch(err){$('message').textContent='Falha na importação: '+err.message;}}
  displayMeta();summary();render();
  for(const id of ['search','source','access','decision','sort','missing-doi','missing-abstract'])$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;render();});
  $('clear-filters').addEventListener('click',()=>{for(const id of ['search','source','access','decision'])$(id).value='';$('sort').value='original';$('missing-doi').checked=false;$('missing-abstract').checked=false;page=0;render();});
  $('prev').addEventListener('click',()=>{page--;render();});$('next').addEventListener('click',()=>{page++;render();});
  $('save-csv').addEventListener('click',saveCsv);$('save-json').addEventListener('click',saveJson);$('restore').addEventListener('change',restore);
})();
</script></body></html>`;
    return start + payload + finish;
  }
  globalThis.DELTA_REVIEW = Object.freeze({auditCoverage, reviewHtml});
})();