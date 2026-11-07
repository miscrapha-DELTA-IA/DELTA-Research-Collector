/* DELTA Research Collector, v0.5.0. GPL-3.0-or-later. */
(() => {
  "use strict";
  if (document.getElementById("delta-research-collector-root")) return;
  const core = globalThis.DELTA_CORE;
  const provider = core?.detectProvider(location.href);
  if (!provider) return;

  const shell = document.createElement("div");
  shell.id = "delta-research-collector-root";
  shell.style.cssText = "position:fixed;right:18px;bottom:24px;z-index:2147483646;pointer-events:none";
  const shadow = shell.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; }
    .delta-shell { font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; color:#eaf3fa; pointer-events: auto; }
    .delta-controls { display:flex; justify-content:flex-end; gap:8px; align-items:center; }
    .primary, .config, .act, .ghost { cursor:pointer; font:inherit; transition:transform .16s ease, box-shadow .16s ease, background .16s ease; }
    .primary:hover, .config:hover, .act:hover { transform:translateY(-2px); }
    .primary { display:flex;gap:9px;align-items:center;border:1px solid #82edf5;border-radius:17px;padding:14px 18px;background:linear-gradient(120deg,#087d95,#16425f 65%,#2e315a);box-shadow:0 10px 32px #001b2b70, inset 0 1px #ffffff33;color:#fff;font-weight:800;letter-spacing:.03em;font-size:13px; }
    .primary:disabled, .act:disabled { opacity:.64;cursor:wait;transform:none; }
    .config { width:47px;height:47px;border-radius:15px;border:1px solid #607b95;background:#11283f;color:#d9edfa;font-size:21px;box-shadow:0 8px 22px #001b2b44; }
    .panel { width:min(395px, calc(100vw - 24px)); max-height:calc(100vh - 110px);overflow-y:auto; margin-bottom:12px;padding:20px;background:linear-gradient(145deg,#13253a,#0a1627 70%);border:1px solid #3b5872;border-radius:22px;box-shadow:0 14px 55px #001019ad, inset 0 1px #ffffff17; }
    .panel[hidden] { display:none; }
    .top { display:flex;gap:10px;align-items:center;justify-content:space-between; }
    .eyebrow { font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#68d7e0;margin:0 0 5px; }
    h2 { font-size:20px;line-height:1.25;margin:0 0 3px;color:#f7feff;font-weight:800; }
    .sub { font-size:12px;color:#9db0c6;margin:0 0 17px; }
    label:not(.check) { display:block;font-size:12px;color:#c5d9e7;font-weight:650;margin:13px 0 7px; }
    select { width:100%;height:42px;border:1px solid #38536d;border-radius:12px;background:#1a324a;color:white;font:inherit;font-size:13px;padding:0 11px; }
    .two { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
    .check { display:flex;align-items:start;gap:9px;font-size:12px;color:#cddde8;line-height:1.45;margin-top:14px; }
    .check input { accent-color:#4de1d5;width:16px;height:16px;flex:none;margin:1px 0; }
    .note { font-size:11px;color:#92a9be;margin:11px 0 16px;line-height:1.45; }
    .buttons { display:flex;gap:9px; }
    .act { flex:1;padding:12px 10px;border:none;border-radius:12px;background:#53e7d8;color:#071f2a;font-weight:800;font-size:13px; }
    .ghost { padding:11px 13px;border:1px solid #4e687e;color:#e3ecf6;border-radius:12px;background:#182e43;font-size:12px; }
    .status { padding:12px 0 0;min-height:32px;font-size:12px;line-height:1.45;color:#b5d2e2;overflow-wrap:anywhere; }
    .status.err { color:#ffabb3; }
    progress { width:100%;height:7px;appearance:none;border:none;border-radius:9px;overflow:hidden;display:block;margin-top:8px;background:#243d54; }
    progress::-webkit-progress-bar { background:#243d54; }
    progress::-webkit-progress-value { background:#4de1d5; }
    .special { border:1px solid #2f5265;background:#10283b;padding:11px;border-radius:12px;margin-top:12px; }
    .special[hidden] {display:none;} .special label {margin-top:4px!important;}
    input[type="text"], input[type="date"] {width:100%;min-height:40px;background:#1a324a;color:#fff;border:1px solid #38536d;border-radius:9px;padding:8px;font:inherit;font-size:12px;}
    .mini {border:1px solid #37566e;background:#132f47;color:#eaf3fa;border-radius:10px;padding:10px;cursor:pointer;font-weight:650;font-size:12px;}
    .minirow {display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}.history {max-height:130px;overflow:auto;line-height:1.45;font-size:11px;color:#bcd3e3;white-space:pre-line;}
    .foot { font-size:10px;color:#8195a9;border-top:1px solid #2b435b;padding-top:12px;margin-top:13px; }
    @media(max-width:560px) { .panel{padding:17px;} .primary{padding:12px;font-size:12px;} .delta-shell{margin-right:-7px;margin-bottom:-9px;} }
    @media(prefers-reduced-motion:reduce) { * { transition:none!important; } }
  `;
  shadow.append(style);
  const view = document.createElement("div");
  view.className = "delta-shell";
  view.innerHTML = `
    <section class="panel" id="delta-panel" hidden role="region" aria-label="Configurações da coleta">
      <div class="top"><div><p class="eyebrow">DELTA / Research Tools</p><h2>Research Collector</h2></div><button class="ghost" id="delta-close" aria-label="Fechar configurações">✕</button></div>
      <p class="sub" id="delta-source"></p>
      <div class="two">
        <div><label for="delta-max">Máx. de registros</label><select id="delta-max"><option value="50">50</option><option value="200" selected>200</option><option value="500">500</option><option value="1000">1.000</option><option value="2000">2.000</option></select></div>
        <div><label for="delta-format">Formato</label><select id="delta-format"><option value="csv">CSV (Excel)</option><option value="bibtex">BibTeX (Zotero)</option><option value="json">JSON</option><option value="ris">RIS (Zotero)</option><option value="html">Matriz visual interativa (HTML)</option></select></div>
      </div>
      <div class="special" id="delta-doaj-options" hidden>
        <label for="delta-doaj-query">Consulta na API DOAJ (sem filtros da interface)</label>
        <input id="delta-doaj-query" type="text" maxlength="240" placeholder="Ex.: dengue, transcriptomics, DOI..." />
      </div>
      <div class="special" id="delta-preprint-options" hidden>
        <div class="two"><div><label for="delta-from">Desde</label><input id="delta-from" type="date"/></div><div><label for="delta-to">Até</label><input id="delta-to" type="date"/></div></div>
        <label for="delta-keywords">Filtrar título/resumo localmente (opcional)</label>
        <input id="delta-keywords" type="text" maxlength="180" placeholder="Ex.: single-cell" />
        <p class="note">API por período, não equivale à busca por palavras-chave do site. Varredura limitada a 2.000 registros.</p>
      </div>
      <div class="special" id="delta-ieee-import" hidden>
        <strong style="font-size:12px">IEEE Xplore — importar todos os resultados</strong>
        <p class="note">O botão rápido baixa somente os artigos desta página (normalmente 25). Para obter toda a busca, use <strong>Export Results → CSV</strong> no IEEE, depois selecione esse arquivo aqui. O arquivo é processado localmente.</p>
        <label for="delta-ieee-file">CSV exportado pelo IEEE</label><input id="delta-ieee-file" type="file" accept=".csv,text/csv,text/plain" style="width:100%;font-size:12px"/>
        <label for="delta-ieee-total">Total de resultados encontrados no IEEE (opcional)</label><input id="delta-ieee-total" type="number" min="1" max="100000" placeholder="Ex.: 512" style="width:100%;min-height:40px;background:#1a324a;color:#fff;border:1px solid #38536d;border-radius:9px;padding:8px"/>
        <div class="minirow"><button class="mini" id="delta-ieee-import-run">Importar e exportar no formato escolhido</button></div>
        <div class="status" id="delta-ieee-import-status" role="status" aria-live="polite"></div>
      </div>
      <div class="special" id="delta-strategy">
        <strong style="font-size:12px">Estratégia da busca</strong>
        <div class="status" id="delta-query-preview"></div><div class="status" id="delta-filter-preview"></div>
        <button class="mini" id="delta-strategy-export">Exportar estratégia JSON</button>
      </div>
      <div class="special" id="delta-coverage-options">
        <strong style="font-size:12px">Auditoria de cobertura</strong>
        <label for="delta-expected-total">Resultados exibidos na base (opcional)</label>
        <input id="delta-expected-total" type="number" min="1" max="10000000" placeholder="Ex.: 512" style="width:100%;min-height:40px;background:#1a324a;color:#fff;border:1px solid #38536d;border-radius:9px;padding:8px"/>
        <p class="note">Usado somente para comparar contagens. Quantidades iguais não comprovam correspondência dos artigos, filtros ou ranking.</p>
        <div class="status" id="delta-audit-result" role="status" aria-live="polite">Total não informado — completude ainda não verificada.</div>
      </div>
      <label class="check" id="delta-oa-label"><input type="checkbox" id="delta-oa"/><span>Verificar cópias abertas por DOI via OpenAlex (até 20; envia os DOIs).</span></label>
      <label class="check" id="delta-local-label"><input type="checkbox" id="delta-local" checked/><span>Adicionar registros à biblioteca local para deduplicação entre fontes (por DOI).</span></label>
      <label class="check" id="delta-pdf-label"><input type="checkbox" id="delta-pdf" /><span>Também solicitar PDFs do arXiv (máximo 20 por coleta).</span></label>
      <p class="note" id="delta-note">Até 2.000 registros por operação. Filtros não traduzidos serão bloqueados ou sinalizados. Respeita intervalos entre requisições.</p>
      <div class="buttons"><button class="act" id="delta-start">Baixar resultados</button><button class="ghost" id="delta-cancel" disabled>Cancelar</button></div>
      <div class="status" id="delta-status" role="status" aria-live="polite">Pronto para coletar.</div>
      <progress id="delta-progress" max="200" value="0" aria-label="Registros coletados"></progress>
      <div class="special" id="delta-library">
        <div class="top"><strong style="font-size:12px">Biblioteca e histórico local</strong><button class="mini" id="delta-refresh">Atualizar</button></div>
        <div class="status" id="delta-library-info">Clique Atualizar para consultar.</div>
        <div class="minirow"><button class="mini" id="delta-library-ris">Exportar RIS / Zotero</button><button class="mini" id="delta-library-bib">BibTeX</button><button class="mini" id="delta-library-csv">CSV</button><button class="mini" id="delta-library-json">JSON</button><button class="mini" id="delta-library-html">Matriz visual</button></div>
        <div class="history" id="delta-history"></div>
        <div class="minirow"><button class="mini" id="delta-clear">Apagar biblioteca e histórico</button></div>
      </div>
      <div class="foot">Biblioteca e histórico ficam neste navegador • sem conta • sem servidores DELTA IA</div>
    </section>
    <div class="delta-controls"><button class="primary" id="delta-one-click" title="Coletar até 200 registros em CSV com um clique"><span aria-hidden="true">↓</span> BAIXAR BUSCA</button><button class="config" id="delta-config" aria-label="Configurar coleta" title="Opções de coleta">⚙</button></div>
  `;
  shadow.append(view);
  document.documentElement.append(shell);
  const $ = name => shadow.getElementById(`delta-${name}`);
  const providers = {
    ieee: ["IEEE Xplore", "Apenas cartões visíveis nesta página. Exportação parcial; sem paginação automática."],
    arxiv: ["arXiv", "Preserva a URL avançada. Até 20 PDFs opcionais."],
    europepmc: ["Europe PMC", "API oficial. Metadados, resumos e links abertos quando disponíveis."],
    pubmed: ["PubMed", "NCBI ESearch + EFetch. Filtros laterais não traduzidos são bloqueados para evitar erros metodológicos."],
    openalex: ["OpenAlex", "API oficial. Busca, filtros e ordenação da URL. Paginação básica sem chave (até 2.000 nesta versão)."],
    crossref: ["Crossref", "API REST. A busca é traduzida; classificação pode diferir da página original."],
    semanticscholar: ["Semantic Scholar", "API de relevância (máx. 1.000). Serviço pode exigir limites severos ou retornar HTTP 429."],
    doaj: ["DOAJ", "API pública DOAJ. Apenas a expressão textual pode ser reproduzida; filtros da interface não são assumidos."],
    scielo: ["SciELO (experimental)", "Extração HTML paginada: pode falhar se a estrutura da busca mudar. Respeita os parâmetros da página."],
    biorxiv: ["bioRxiv", "Coleta por período e filtro local opcional. NÃO equivale aos resultados de busca do site."],
    medrxiv: ["medRxiv", "Coleta por período e filtro local opcional. NÃO equivale aos resultados de busca do site."]
  };
  const strategy=()=>core.searchContext(location.href);
  const showStrategy=()=>{$('query-preview').textContent='Busca: '+(strategy().query||'(não identificada na URL)');$('filter-preview').textContent='Parâmetros: '+Object.keys(strategy().parameters).length+' · filtros: '+Object.keys(strategy().filters).length;};
  $("source").textContent = `${providers[provider][0]} · resultados da busca atual`;
  showStrategy();
  $("note").textContent = providers[provider][1];
  if (provider === "semanticscholar") $("max").querySelector('option[value="2000"]').disabled = true;
  $("pdf-label").hidden = provider !== "arxiv";
  $("doaj-options").hidden = provider !== 'doaj';
  $("ieee-import").hidden = provider !== "ieee";
  if(provider==="ieee"){$("one-click").innerHTML='<span aria-hidden="true">↓</span> SOMENTE ESTA PÁGINA';$("one-click").title="IEEE: coleta somente a página atual (normalmente 25). Para a busca inteira use Export Results → CSV.";}
  $("preprint-options").hidden = !['biorxiv','medrxiv'].includes(provider);
  const today = new Date();
  const ago = new Date(today.getTime()-7*86400000);
  $("to").value=today.toISOString().slice(0,10);
  $("from").value=ago.toISOString().slice(0,10);

  if(['biorxiv','medrxiv'].includes(provider)) {
    const u=new URL(location.href);
    $("keywords").value=u.searchParams.get('q')||u.searchParams.get('query')||'';
  }
  const state = { running: false, cancel: false };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function setStatus(text, error = false) {
    $("status").textContent = text;
    $("status").classList.toggle("err", error);
    $("one-click").title = text;
  }
  function setPanel(visible) { $("panel").hidden = !visible; }
  function setBusy(busy) {
    state.running = busy;
    $("start").disabled = busy;
    $("one-click").disabled = busy;
    $("cancel").disabled = !busy;
    $("start").textContent = busy ? "Coletando..." : "Baixar resultados";
    $("one-click").innerHTML = busy ? "◌ COLETANDO..." : (provider==="ieee"?'<span aria-hidden="true">↓</span> SOMENTE ESTA PÁGINA':'<span aria-hidden="true">↓</span> BAIXAR BUSCA');
  }
  function message(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, reply => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else if (!reply) reject(new Error("Sem resposta da extensão"));
        else if (reply.error) reject(new Error(reply.error));
        else resolve(reply);
      });
    });
  }
  async function fetchWithRetry(url, source, count, max) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (state.cancel) return null;
      try {
        const response = await message({ type: "DELTA_FETCH", url });
        if (response.status === 200) return response.text;
        if (response.status === 429 || response.status === 503 || response.status === 502) {
          if (attempt === 2) throw new Error(`HTTP ${response.status} após 3 tentativas`);
          const retrySec = Math.max(3 * (attempt + 1), Math.min(30, Number(response.retryAfter) || 0));
          setStatus(`${source}: HTTP ${response.status}; tentando novamente em ${retrySec}s (${count}/${max}).`);
          await sleep(retrySec * 1000);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (e) {
        if (attempt === 2 || /^HTTP \d+/.test(e.message)) throw e;
        setStatus(`${source}: falha de conexão, tentando novamente (${attempt + 2}/3).`);
        await sleep(3000 * (attempt + 1));
      }
    }
    return null;
  }
  function saveText(content, fileName, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    a.style.display = "none";
    shadow.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  function exportRows(rows, format, max, cancelled, truncated, collectorNote="", retrievalMode="provider_adapter", extraMetadata={}) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const file = `DELTA_${provider}_${timestamp}.${format === "bibtex" ? "bib" : format}`;
    const context=strategy();
    const records=rows.map(r=>core.accessInfo({...r,search_url:context.url,search_query:context.query,search_parameters:context.parameters,collected_at:now.toISOString()}));
    const metadata = {
      generator: "DELTA Research Collector 0.5.0",
      source: provider, original_search_url: context.url, exported_at: now.toISOString(),
      search_query:context.query,search_parameters:context.parameters,search_filters:context.filters,
      retrieval_mode:retrievalMode,collector_note:collectorNote,
      access_legend:{open:'Cópia aberta identificada',publisher_restricted:'Editora informa restrição',no_open_copy_found:'Cópia OA não localizada; paywall não comprovado',unknown:'Não verificado'},
      exported_count: rows.length, requested_limit: max, cancelled, truncated,
      ...extraMetadata,
      note: "Coleta limitada à quantidade solicitada, não representa necessariamente a base inteira."
    };
    const manualTotal = $("expected-total").value.trim();
    const audit = globalThis.DELTA_REVIEW.auditCoverage({
      source:provider, retrieval_mode:retrievalMode, collected:rows.length, requested_limit:max,
      reported_total:extraMetadata.reported_total ?? null,
      expected_total:extraMetadata.expected_search_total ?? manualTotal,
      truncated, cancelled, failed:Boolean(extraMetadata.failure),
      filters:context.filters, query:context.query
    });
    metadata.audit = audit;
    metadata.partial = audit.partial;
    const countDescription = audit.expected_total === null ? "total não verificado" : rows.length + "/" + audit.expected_total + " (" + audit.coverage_percent + "%)";
    $("audit-result").textContent = "Cobertura: " + countDescription + " · fidelidade da busca não verificada; consulte o JSON de estratégia.";
    const bibComment = `% Search URL: ${context.url.replace(/[\r\n]/g, "")}\n% Query: ${context.query.replace(/[\r\n]/g, "")}\n% Collected at: ${now.toISOString()}\n`;
    const text = format === "html" ? globalThis.DELTA_REVIEW.reviewHtml(records, metadata) :
      format === "csv" ? core.toCsv(records) :
      format === "bibtex" ? bibComment + core.toBibtex(records) :
      format === "ris" ? core.toRis(records) : JSON.stringify({ metadata, records }, null, 2);
    saveText(JSON.stringify(metadata,null,2),`DELTA_${provider}_${timestamp}_estrategia.json`,"application/json;charset=utf-8");
    saveText(text, file, format === "csv" ? "text/csv;charset=utf-8" : format === "bibtex" ? "application/x-bibtex;charset=utf-8" : format === "ris" ? "application/x-research-info-systems;charset=utf-8" : format === "html" ? "text/html;charset=utf-8" : "application/json;charset=utf-8");
    return records;
  }
  function updateProgress(num, max, providerName) {
    $("progress").max = max;
    $("progress").value = Math.min(num, max);
    setStatus(`${providerName}: ${num} de até ${max} registros processados…`);
  }
  async function refreshLibrary() {
    const data=await message({type:'DELTA_LIBRARY_GET'});
    $('library-info').textContent=`${data.records.length} artigos únicos na biblioteca · ${data.history.length} coletas registradas.`;
    $('history').textContent=data.history.slice(0,8).map(r=>`${r.date.slice(0,16).replace('T',' ')} · ${r.source}: ${r.received} recebidos (${r.added} novos, ${r.merged} combinados)${r.partial?' · PARCIAL':''}`).join('\n');
    return data;
  }
  async function exportLibrary(format){
    try{
      $('library-info').textContent='Preparando biblioteca…';
      const data=await refreshLibrary();
      if(!data.records.length){$('library-info').textContent='Biblioteca vazia. Faça uma coleta com armazenamento local ativado.';return;}
      const now=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
      const text=format==='html'?globalThis.DELTA_REVIEW.reviewHtml(data.records,{
        source:'biblioteca_local', exported_at:new Date().toISOString(), retrieval_mode:'local_merged_library',
        audit:globalThis.DELTA_REVIEW.auditCoverage({source:'biblioteca_local',collected:data.records.length})
      }):format==='ris'?core.toRis(data.records):format==='bib'?core.toBibtex(data.records):format==='csv'?core.toCsv(data.records):JSON.stringify({generator:'DELTA Research Collector v0.5.0',exported_at:new Date().toISOString(),count:data.records.length,records:data.records,history:data.history},null,2);
      saveText(text,`DELTA_biblioteca_unificada_${now}.${format}`,format==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8');
      $('library-info').textContent=`${data.records.length} artigos únicos exportados em ${format.toUpperCase()}.`;
    }catch(e){$('library-info').textContent=`Falha ao exportar biblioteca: ${e.message}`;}
  }

  async function collectIEEE(max,rows,seen) {
    const found=core.parseIEEEPage(document);
    if(!found.records.length)throw Error('IEEE: nenhum cartão de resultado reconhecido. Abra a busca com resultados carregados ou use a exportação nativa.');
    for(const r of found.records){if(rows.length>=max)break;if(!seen.has(r.identifier)){seen.add(r.identifier);rows.push(r);}}
    updateProgress(rows.length,max,'IEEE Xplore');
    return {truncated:true,retrieval_mode:'visible_page_only',note:'IEEE: somente a página visível; não é exportação exaustiva.'};
  }
  async function checkOpenCopies(rows) {
    const chosen=rows.filter(r=>r.doi&&!/^10\.48550\/arxiv\./i.test(r.doi)).slice(0,20);
    let checked=0,errors=0;
    for(const r of chosen){
      if(state.cancel)break;
      try{
        const doi=core.normalizeDoi(r.doi);
        if(!/^10\.\d{4,9}\/.+/.test(doi))continue;
        const reply=await message({type:'DELTA_FETCH',url:'https://api.openalex.org/works/doi:'+encodeURI(doi)});
        if(reply.status!==200){errors++;continue;}
        const a=core.parseOpenAlexAccess(core.safeJsonParse(reply.text,'OpenAlex'));
        if(a.status==='open'||r.access_status!=='publisher_restricted')r.access_status=a.status;
        r.access_evidence=[r.access_evidence,a.evidence].filter(Boolean).join(' | ');
        r.access_url=a.url||r.access_url||'';
        r.access_checked_at=new Date().toISOString();
        checked++;
      }catch{errors++;}
      setStatus('Verificando acesso aberto: '+checked+' registros; '+errors+' falhas.');
      if(!state.cancel)await sleep(450);
    }
    return {checked,errors};
  }
  async function collectArxiv(max, rows, seen) {
    const u = new URL(location.href);
    if (u.pathname.includes("/advanced") && !u.searchParams.get("terms-0-term")) {
      throw new Error("Execute primeiro a pesquisa avançada do arXiv.");
    }
    const size = Math.max(10, Math.min(200, Number(u.searchParams.get("size")) || 50));
    let offset = 0, done = false;
    while (rows.length < max && !done && !state.cancel) {
      const text = await fetchWithRetry(core.arxivUrlForPage(u.toString(), offset), "arXiv", rows.length, max);
      if (!text || state.cancel) break;
      const parsed = core.parseArxiv(text);
      if (parsed.pageSize === 0) break;
      for (const record of parsed.records) {
        const key = record.identifier.replace(/v\d+$/, "");
        if (!seen.has(key)) { seen.add(key); rows.push(record); }
        if (rows.length === max) break;
      }
      updateProgress(rows.length, max, "arXiv");
      offset += size;
      if (parsed.pageSize < size) done = true;
      else if (rows.length < max && !state.cancel) await sleep(3100);
    }
    return { truncated: !done && rows.length >= max };
  }
  async function collectEuropePmc(max, rows, seen) {
    const u = new URL(location.href);
    const query = u.searchParams.get("query") || u.searchParams.get("queryString") || u.searchParams.get("q");
    if (!query) throw new Error("Abra uma busca Europe PMC com o parâmetro 'query' na URL.");
    let cursor = "*", total = Infinity, done = false;
    const usedCursors = new Set();
    while (rows.length < max && !done && !state.cancel) {
      if (usedCursors.has(cursor)) break;
      usedCursors.add(cursor);
      const url = core.buildEuropePmcUrl(query, cursor, Math.min(100, max), u.searchParams.get("sort") || "");
      const txt = await fetchWithRetry(url, "Europe PMC", rows.length, max);
      if (!txt || state.cancel) break;
      let payload;
      try { payload = JSON.parse(txt); } catch { throw new Error("Resposta JSON inválida da Europe PMC"); }
      const parsed = core.parseEuropePmc(payload);
      total = parsed.total;
      for (const record of parsed.records) {
        if (!seen.has(record.identifier)) { seen.add(record.identifier); rows.push(record); }
        if (rows.length >= max) break;
      }
      updateProgress(rows.length, max, "Europe PMC");
      if (!parsed.pageSize || !parsed.nextCursor || parsed.nextCursor === cursor || rows.length >= total) done = true;
      else cursor = parsed.nextCursor;
      if (!done && rows.length < max && !state.cancel) await sleep(1100);
    }
    return { truncated: !done && rows.length >= max, reported_total:Number.isFinite(total)?total:null };
  }
  async function collectPubmed(max, rows, seen) {
    const searchUrl = core.buildPubmedSearchUrl(location.href, max);
    const text = await fetchWithRetry(searchUrl, "PubMed ESearch", 0, max);
    if (!text || state.cancel) return {truncated: false};
    const {ids,total} = core.parsePubmedSearch(core.safeJsonParse(text, "PubMed ESearch"));
    for (let offset = 0; offset < ids.length && !state.cancel; offset += 100) {
      const batch = ids.slice(offset,offset + 100);
      await sleep(550); // At most ~2 requests/second on NCBI, below 3/s keyless threshold.
      const xml = await fetchWithRetry(core.buildPubmedFetchUrl(batch), "PubMed EFetch", rows.length, max);
      if (!xml || state.cancel) break;
      const records = core.parsePubmedXml(xml);
      if (records.length < batch.length) throw new Error(`PubMed: EFetch retornou ${records.length}/${batch.length} artigos; coleta incompleta.`);
      for (const r of records) {
        if (!seen.has(r.identifier)) { seen.add(r.identifier); rows.push(r); }
      }
      updateProgress(rows.length,max,"PubMed");
      if (offset + 100 < ids.length && !state.cancel) await sleep(800);
    }
    return {truncated: total > max,reported_total:Number.isFinite(total)?total:null};
  }
  async function collectOpenAlex(max, rows, seen) {
    let page = 1, total = Infinity, done = false;
    while (rows.length < max && !state.cancel && !done) {
      const url = core.buildOpenAlexUrl(location.href, page, Math.min(100,max));
      const text = await fetchWithRetry(url,"OpenAlex",rows.length,max);
      if (!text || state.cancel) break;
      const result = core.parseOpenAlex(core.safeJsonParse(text,"OpenAlex"));
      total = result.total;
      for (const r of result.records) {
        if (!seen.has(r.identifier)) {seen.add(r.identifier);rows.push(r);}
        if (rows.length >= max) break;
      }
      updateProgress(rows.length,max,"OpenAlex");
      if (!result.pageSize || result.pageSize < Math.min(100,max) || page * Math.min(100,max) >= total) done = true;
      page++;
      if (!done && rows.length < max && !state.cancel) await sleep(1100);
    }
    return {truncated:total > max,reported_total:Number.isFinite(total)?total:null};
  }
  async function collectCrossref(max, rows, seen) {
    let cursor = '*', total = Infinity, done = false;
    const cursors = new Set();
    while (rows.length < max && !state.cancel && !done) {
      if (cursors.has(cursor)) throw new Error('Crossref: cursor repetido; coleta interrompida para evitar repetição.');
      cursors.add(cursor);
      const url=core.buildCrossrefUrl(location.href,cursor,Math.min(100,max));
      const text=await fetchWithRetry(url,"Crossref",rows.length,max);
      if (!text || state.cancel) break;
      const result=core.parseCrossref(core.safeJsonParse(text,"Crossref"));
      total=result.total;
      for (const r of result.records) {
        if (!seen.has(r.identifier)) {seen.add(r.identifier);rows.push(r);}
        if (rows.length >= max) break;
      }
      updateProgress(rows.length,max,"Crossref");
      if (!result.pageSize || result.pageSize < Math.min(100,max) || !result.nextCursor || rows.length >= total) done=true;
      else cursor=result.nextCursor;
      if (!done && rows.length < max && !state.cancel) await sleep(1200);
    }
    return {truncated:total > max,reported_total:Number.isFinite(total)?total:null};
  }
  async function collectSemanticScholar(max, rows, seen) {
    if (max > 1000) throw new Error('Semantic Scholar: máximo de 1.000 resultados ordenados por relevância. Escolha 1.000 ou menos.');
    let offset = 0, total = Infinity, done = false;
    while (rows.length < max && !state.cancel && !done && offset < 1000) {
      const limit=Math.min(100,max-offset);
      const url=core.buildSemanticScholarUrl(location.href,offset,limit);
      const text=await fetchWithRetry(url,"Semantic Scholar",rows.length,max);
      if (!text || state.cancel) break;
      const result=core.parseSemanticScholar(core.safeJsonParse(text,"Semantic Scholar"));
      total=result.total;
      for (const r of result.records) {
        if (!seen.has(r.identifier)) {seen.add(r.identifier);rows.push(r);}
        if (rows.length >= max) break;
      }
      updateProgress(rows.length,max,"Semantic Scholar");
      offset += result.pageSize;
      if (!result.pageSize || result.pageSize < limit || offset >= total || offset >= 1000) done=true;
      if (!done && rows.length < max && !state.cancel) await sleep(3100);
    }
    return {truncated:total > max,reported_total:Number.isFinite(total)?total:null};
  }

  async function collectDoaj(max,rows,seen) {
    const override=$('doaj-query').value.trim();
    let total=Infinity, page=1, done=false;
    while(rows.length<max&&!state.cancel&&!done) {
      const url=core.buildDoajUrl(location.href,page,Math.min(100,max),override);
      const txt=await fetchWithRetry(url,'DOAJ',rows.length,max);
      if(!txt||state.cancel)break;
      const result=core.parseDoaj(core.safeJsonParse(txt,'DOAJ'));total=result.total;
      for(const r of result.records){if(!seen.has(r.identifier)){seen.add(r.identifier);rows.push(r);}if(rows.length>=max)break;}
      updateProgress(rows.length,max,'DOAJ');
      if(!result.pageSize||result.pageSize<Math.min(100,max)||rows.length>=total)done=true;
      page++;
      if(!done&&rows.length<max&&!state.cancel)await sleep(1100);
    }
    return {truncated:total>max,reported_total:Number.isFinite(total)?total:null,note:override?'Busca DOAJ via expressão informada na extensão; filtros da interface não foram transferidos.':''};
  }
  async function collectSciELO(max,rows,seen){
    let from=1,count=15,done=false,total=null;
    while(rows.length<max&&!state.cancel&&!done){
      const url=core.buildSciELOUrl(location.href,from,count);
      const txt=await fetchWithRetry(url,'SciELO',rows.length,max);
      if(!txt||state.cancel)break;
      const result=core.parseSciELO(txt);total=result.total;
      if(!result.pageSize){
        if(from===1&&total!==0)throw Error('SciELO: resultados HTML não reconhecidos (estrutura alterada ou bloqueio).');
        break;
      }
      for(const r of result.records){if(!seen.has(r.identifier)){seen.add(r.identifier);rows.push(r);}if(rows.length>=max)break;}
      updateProgress(rows.length,max,'SciELO');
      from+=count;
      if(result.pageSize<count||(Number.isFinite(total)&&from>total))done=true;
      if(!done&&rows.length<max&&!state.cancel)await sleep(3600);
    }
    return {truncated:(!done&&rows.length>=max)||(Number.isFinite(total)&&total>max),reported_total:Number.isFinite(total)?total:null,note:'SciELO experimental: metadados recuperados do HTML da página.'};
  }
  async function collectPreprints(max,rows,seen){
    const from=$('from').value,to=$('to').value,term=$('keywords').value.trim();
    let cursor=0,total=Infinity,done=false,scanned=0;
    const scanLimit=2000;
    while(rows.length<max&&!done&&!state.cancel&&scanned<scanLimit){
      const url=core.buildPreprintUrl(provider,from,to,cursor);
      const txt=await fetchWithRetry(url,providers[provider][0],rows.length,max);
      if(!txt||state.cancel)break;
      const parsed=core.parsePreprint(core.safeJsonParse(txt,provider),provider);
      total=parsed.total;
      if(parsed.pageSize===0){done=true;break;}
      scanned+=parsed.pageSize;
      for(const record of parsed.records){
        if(!core.matchesTerm(record,term)||seen.has(record.identifier))continue;
        seen.add(record.identifier);rows.push(record);
        if(rows.length>=max)break;
      }
      setStatus(`${providers[provider][0]}: ${scanned} registros examinados; ${rows.length} selecionados.`);
      $('progress').value=Math.min(rows.length,max);
      cursor+=parsed.pageSize;
      if(parsed.pageSize<30||cursor>=total)done=true;
      if(!done&&rows.length<max&&!state.cancel)await sleep(1400);
    }
    const incomplete=!done&&(rows.length>=max||scanned>=scanLimit);
    return {truncated:incomplete,note:`Intervalo ${from} a ${to}; termo local: ${term||'(nenhum)'}; examinados: ${scanned}; varredura ${incomplete?'não exaustiva':'concluída segundo a API'}.`};
  }
  async function requestPdfs(rows) {
    let requested = 0, errors = 0;
    const targets = rows.slice(0, 20).filter(r => r.source === "arXiv" && r.pdf_url);
    for (const record of targets) {
      if (state.cancel) break;
      try {
        await message({ type: "DELTA_PDF", url: record.pdf_url, identifier: record.identifier });
        requested++;
      } catch { errors++; }
      setStatus(`PDFs solicitados: ${requested}/${targets.length}${errors ? ` · erros: ${errors}` : ""}`);
      if (targets.indexOf(record) < targets.length - 1 && !state.cancel) await sleep(3200);
    }
    return { requested, errors };
  }
  async function run(quick = false) {
    if (state.running) return;
    state.cancel = false;
    const max = quick ? 200 : Number($("max").value);
    const format = quick ? "csv" : $("format").value;
    const withPdfs = !quick && provider === "arxiv" && $("pdf").checked;
    const rows = [], seen = new Set();
    let failure = null, truncated = false, collectorNote='',retrievalMode='provider_adapter',reportedTotal=null;
    setPanel(true); setBusy(true);
    $("progress").max = max; $("progress").value = 0;
    setStatus("Iniciando coleta…");
    try {
      const collector = {
        ieee:collectIEEE,arxiv: collectArxiv, europepmc: collectEuropePmc, pubmed: collectPubmed,
        openalex: collectOpenAlex, crossref: collectCrossref, semanticscholar: collectSemanticScholar,
        scielo:collectSciELO,doaj:collectDoaj,biorxiv:collectPreprints,medrxiv:collectPreprints
      }[provider];
      const result = await collector(max, rows, seen);
      truncated = result.truncated;
      collectorNote=result.note||'';retrievalMode=result.retrieval_mode||'provider_adapter';
      reportedTotal=Number.isFinite(result.reported_total)?result.reported_total:null;
    } catch (error) { failure = error; }
    try {
      if (rows.length) {
        if(!quick&&$('oa').checked&&!state.cancel){const oa=await checkOpenCopies(rows);collectorNote+=' | OA consultados: '+oa.checked+'; falhas: '+oa.errors;}
        const records=exportRows(rows, format, max, state.cancel || !!failure, truncated,collectorNote,retrievalMode,{reported_total:reportedTotal,failure:failure?failure.message:null});
        let stored='';
        if($('local').checked){
          try{
            const r=await message({type:'DELTA_LIBRARY_ADD',records,run:{source:provider,url:strategy().url,query:strategy().query,parameters:strategy().parameters,retrieval_mode:retrievalMode,partial:!!failure||state.cancel||truncated,note:collectorNote}});
            stored=` · biblioteca: +${r.added} novos, ${r.merged} combinados${r.dropped?`, ${r.dropped} fora do limite`:''}`;
          }catch(e){stored=` · NÃO salvos na biblioteca (${e.message})`;}
        }
        setStatus(`${rows.length} registros exportados em ${format.toUpperCase()}${truncated ? ` (limite/varredura não exaustiva)` : ""}${failure ? `. Coleta parcial: ${failure.message}` : ""}${stored}.`, !!failure);
        if($('local').checked)refreshLibrary().catch(()=>{});
        if (withPdfs && !state.cancel && !failure) {
          const pdfs = await requestPdfs(rows);
          setStatus(`${rows.length} registros exportados; ${pdfs.requested} PDFs solicitados${pdfs.errors ? `; ${pdfs.errors} falharam` : ""}.`);
        }
      } else if (state.cancel) setStatus("Coleta cancelada antes de obter resultados.");
      else if (failure) setStatus(`Falha: ${failure.message}`, true);
      else setStatus("Nenhum resultado foi encontrado ou reconhecido nesta busca.", true);
    } catch (error) { setStatus(`Não foi possível gerar o arquivo: ${error.message}`, true); }
    finally { setBusy(false); }
  }
  $('strategy-export').addEventListener('click',()=>saveText(JSON.stringify(strategy(),null,2),`DELTA_${provider}_estrategia.json`,'application/json;charset=utf-8'));
  async function importIEEECSV(){
    if(provider!=="ieee"||state.running)return;
    const file=$("ieee-file").files?.[0];
    if(!file){$("ieee-import-status").textContent="Selecione primeiro o arquivo CSV exportado pelo IEEE.";return;}
    if(file.size>20_000_000){$("ieee-import-status").textContent="Arquivo maior que 20 MB. Divida a exportação.";return;}
    const btn=$("ieee-import-run");btn.disabled=true;
    $("ieee-import-status").textContent="Lendo CSV local e conferindo os metadados…";
    try{
      const parsed=core.parseIEEEExportCsv(await file.text());
      const expected=Number($("ieee-total").value)||null;
      if(expected!==null&&(!Number.isSafeInteger(expected)||expected<1||expected>100000))throw Error("Total informado inválido.");
      const count=parsed.imported;
      const complete=expected!==null&&count===expected;
      const shortfall=expected!==null&&count<expected;
      const partial=!complete;
      const coverage=expected===null?null:Number((count/expected*100).toFixed(2));
      const mode="ieee_official_csv_import";
      const note="IEEE CSV oficial: "+count+" registros válidos; "+parsed.skipped+" registros ignorados; total exibido na pesquisa: "+(expected??"não informado")+"; cobertura: "+(coverage??"não verificada")+"%. Nenhum PDF restrito acessado.";
      const format=$("format").value;
      const extra={original_import_file:file.name,original_import_size:file.size,imported_rows:count,skipped_rows:parsed.skipped,
        expected_search_total:expected,coverage_percent:coverage,
        completeness:complete?"count_match":expected===null?"not_verified":shortfall?"partial_count":"count_mismatch"};
      const records=exportRows(parsed.records,format,count,false,shortfall,note,mode,extra);
      let saved="";
      if($("local").checked){
        const ctx=strategy();
        try{
          const result=await message({type:"DELTA_LIBRARY_ADD",records,run:{source:provider,url:ctx.url,query:ctx.query,parameters:ctx.parameters,retrieval_mode:mode,partial,note}});
          saved=" · biblioteca: +"+result.added+" novos, "+result.merged+" combinados"+(result.dropped?", "+result.dropped+" não armazenados":"");
          refreshLibrary().catch(()=>{});
        }catch(e){saved=" · NÃO salvo na biblioteca: "+e.message;}
      }
      $("ieee-import-status").textContent=count+" artigos exportados em "+format.toUpperCase()+
        (expected?" de "+expected+" esperados ("+coverage+"%)":"; total original não informado")+saved+".";
    }catch(e){$("ieee-import-status").textContent="Falha na importação: "+e.message;}
    finally{btn.disabled=false;}
  }
  $("ieee-import-run").addEventListener("click",importIEEECSV);
  $('config').addEventListener('click',showStrategy);
  $('refresh').addEventListener('click',()=>refreshLibrary().catch(e=>$('library-info').textContent=e.message));
  for(const form of ['ris','bib','csv','json','html']) $('library-'+form).addEventListener('click',()=>exportLibrary(form));
  $('clear').addEventListener('click',async()=>{
    if(!window.confirm('Apagar definitivamente a biblioteca unificada e o histórico local desta extensão? Os arquivos exportados não serão apagados.'))return;
    try{await message({type:'DELTA_LIBRARY_CLEAR',confirm:'APAGAR_BIBLIOTECA_LOCAL'});await refreshLibrary();}
    catch(e){$('library-info').textContent=`Erro: ${e.message}`;}
  });
  $("one-click").addEventListener("click", () => run(true));
  $("config").addEventListener("click", () => setPanel($("panel").hidden));
  $("close").addEventListener("click", () => setPanel(false));
  $("start").addEventListener("click", () => run(false));
  $("cancel").addEventListener("click", () => { state.cancel = true; setStatus("Cancelando após a requisição atual; resultados parciais serão exportados."); });
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "DELTA_TOGGLE") setPanel($("panel").hidden);
  });
})();
