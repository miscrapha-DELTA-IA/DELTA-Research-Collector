/* DELTA Research Collector, v0.3.0. GPL-3.0-or-later. */
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
        <div><label for="delta-format">Formato</label><select id="delta-format"><option value="csv">CSV (Excel)</option><option value="bibtex">BibTeX (Zotero)</option><option value="json">JSON</option><option value="ris">RIS (Zotero)</option></select></div>
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
      <label class="check" id="delta-local-label"><input type="checkbox" id="delta-local" checked/><span>Adicionar registros à biblioteca local para deduplicação entre fontes (por DOI).</span></label>
      <label class="check" id="delta-pdf-label"><input type="checkbox" id="delta-pdf" /><span>Também solicitar PDFs do arXiv (máximo 20 por coleta).</span></label>
      <p class="note" id="delta-note">Até 2.000 registros por operação. Filtros não traduzidos serão bloqueados ou sinalizados. Respeita intervalos entre requisições.</p>
      <div class="buttons"><button class="act" id="delta-start">Baixar resultados</button><button class="ghost" id="delta-cancel" disabled>Cancelar</button></div>
      <div class="status" id="delta-status" role="status" aria-live="polite">Pronto para coletar.</div>
      <progress id="delta-progress" max="200" value="0" aria-label="Registros coletados"></progress>
      <div class="special" id="delta-library">
        <div class="top"><strong style="font-size:12px">Biblioteca e histórico local</strong><button class="mini" id="delta-refresh">Atualizar</button></div>
        <div class="status" id="delta-library-info">Clique Atualizar para consultar.</div>
        <div class="minirow"><button class="mini" id="delta-library-ris">Exportar RIS / Zotero</button><button class="mini" id="delta-library-bib">BibTeX</button><button class="mini" id="delta-library-csv">CSV</button><button class="mini" id="delta-library-json">JSON</button></div>
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
  $("source").textContent = `${providers[provider][0]} · resultados da busca atual`;
  $("note").textContent = providers[provider][1];
  if (provider === "semanticscholar") $("max").querySelector('option[value="2000"]').disabled = true;
  $("pdf-label").hidden = provider !== "arxiv";
  $("doaj-options").hidden = provider !== 'doaj';
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
    $("one-click").innerHTML = busy ? "◌ COLETANDO..." : '<span aria-hidden="true">↓</span> BAIXAR BUSCA';
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
  function exportRows(rows, format, max, cancelled, truncated) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const file = `DELTA_${provider}_${timestamp}.${format === "bibtex" ? "bib" : format}`;
    const records = rows.map(r => ({ ...r, search_url: location.href, collected_at: now.toISOString() }));
    const metadata = {
      generator: "DELTA Research Collector 0.3.0",
      source: provider, original_search_url: location.href, exported_at: now.toISOString(),
      exported_count: rows.length, requested_limit: max, cancelled, truncated,
      note: "Coleta limitada à quantidade solicitada, não representa necessariamente a base inteira."
    };
    const bibComment = `% Search URL: ${location.href.replace(/[\r\n]/g, "")}\n% Collected at: ${now.toISOString()}\n`;
    const text = format === "csv" ? core.toCsv(records) :
      format === "bibtex" ? bibComment + core.toBibtex(records) :
      format === "ris" ? core.toRis(records) : JSON.stringify({ metadata, records }, null, 2);
    saveText(text, file, format === "csv" ? "text/csv;charset=utf-8" : format === "bibtex" ? "application/x-bibtex;charset=utf-8" : format === "ris" ? "application/x-research-info-systems;charset=utf-8" : "application/json;charset=utf-8");
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
      const text=format==='ris'?core.toRis(data.records):format==='bib'?core.toBibtex(data.records):format==='csv'?core.toCsv(data.records):JSON.stringify({generator:'DELTA Research Collector v0.3.0',exported_at:new Date().toISOString(),count:data.records.length,records:data.records,history:data.history},null,2);
      saveText(text,`DELTA_biblioteca_unificada_${now}.${format}`,format==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8');
      $('library-info').textContent=`${data.records.length} artigos únicos exportados em ${format.toUpperCase()}.`;
    }catch(e){$('library-info').textContent=`Falha ao exportar biblioteca: ${e.message}`;}
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
    return { truncated: !done && rows.length >= max };
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
    return {truncated: total > max};
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
    return {truncated:total > max};
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
    return {truncated:total > max};
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
    return {truncated:total > max};
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
    return {truncated:total>max,note:override?'Busca DOAJ via expressão informada na extensão; filtros da interface não foram transferidos.':''};
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
    return {truncated:(!done&&rows.length>=max)||(Number.isFinite(total)&&total>max),note:'SciELO experimental: metadados recuperados do HTML da página.'};
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
    let failure = null, truncated = false, collectorNote='';
    setPanel(true); setBusy(true);
    $("progress").max = max; $("progress").value = 0;
    setStatus("Iniciando coleta…");
    try {
      const collector = {
        arxiv: collectArxiv, europepmc: collectEuropePmc, pubmed: collectPubmed,
        openalex: collectOpenAlex, crossref: collectCrossref, semanticscholar: collectSemanticScholar,
        scielo:collectSciELO,doaj:collectDoaj,biorxiv:collectPreprints,medrxiv:collectPreprints
      }[provider];
      const result = await collector(max, rows, seen);
      truncated = result.truncated;
      collectorNote=result.note||'';
    } catch (error) { failure = error; }
    try {
      if (rows.length) {
        const records=exportRows(rows, format, max, state.cancel || !!failure, truncated);
        let stored='';
        if($('local').checked){
          try{
            const r=await message({type:'DELTA_LIBRARY_ADD',records,run:{source:provider,url:location.href,partial:!!failure||state.cancel||truncated,note:collectorNote}});
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
  $('refresh').addEventListener('click',()=>refreshLibrary().catch(e=>$('library-info').textContent=e.message));
  for(const form of ['ris','bib','csv','json']) $('library-'+form).addEventListener('click',()=>exportLibrary(form));
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
