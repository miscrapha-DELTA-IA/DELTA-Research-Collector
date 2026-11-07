/* DELTA Research Collector, v0.5.5. GPL-3.0-or-later. */
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
  * {box-sizing:border-box}
  .delta-shell {font-family:system-ui,-apple-system,"Segoe UI",sans-serif;pointer-events:auto;color:#233b47}
  .delta-controls {display:flex;justify-content:flex-end;align-items:center;gap:8px}
  button,select,input {font-family:inherit}
  .primary,.config,.act,.ghost,.mini {cursor:pointer}
  .primary:disabled,.act:disabled {opacity:.65;cursor:wait}
  .primary {display:flex;align-items:center;gap:8px}
  .panel[hidden],.special[hidden] {display:none!important}
  .top {display:flex;align-items:center;justify-content:space-between;gap:10px}
  .eyebrow {font-weight:700}
  h2 {line-height:1.3;margin:0}
  .two {display:grid;grid-template-columns:1fr 1fr;gap:10px}
  label:not(.check) {display:block}
  .check {display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.5}
  .check input {flex:none;width:16px;height:16px;margin:1px 0}
  .note {font-size:11px;line-height:1.5}
  .buttons {display:flex;gap:9px}
  .act {flex:1}
  .status {overflow-wrap:anywhere}
  progress {display:block;width:100%;appearance:none;border:0;border-radius:10px;overflow:hidden}
  .special {border:1px solid #dde8ec;border-radius:10px;padding:12px;margin-top:12px}
  .special label {margin-top:5px}
  .minirow {display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
  .history {max-height:150px;overflow:auto;font-size:11px;white-space:pre-line}


  #delta-panel {width:min(420px,calc(100vw - 24px));max-height:calc(100dvh - 100px);overflow:auto;padding:0;color:#1c3341;
    background:#f8fafb;border:1px solid #dbe4e9;border-radius:15px;box-shadow:0 10px 35px #0a29372b;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}
  #delta-panel .top {padding:17px 19px 13px;align-items:center}
  #delta-panel .eyebrow {color:#6b808b;font-size:10px;letter-spacing:.07em;margin:0 0 3px}
  #delta-panel h2 {font-size:18px;letter-spacing:-.025em;color:#163442;font-weight:700}
  #delta-panel .sub {padding:0 19px 15px;margin:0;color:#197583;font-size:12px;font-weight:600}
  #delta-panel .delta-main {padding:17px 19px 19px;background:#fff;border-top:1px solid #e7edef}
  #delta-panel .delta-page-info {margin:0 0 14px;font-size:11px;line-height:1.5;color:#526b75;
    border-bottom:1px solid #e7edef;padding:0 0 11px}
  #delta-panel .delta-ieee-action {margin:12px 0 0}
  #delta-panel #delta-ieee-import-run {display:block;width:100%;padding:11px 12px;text-align:center;
    background:#fff;border:1px solid #bfd5db;color:#175765;font-size:12px;font-weight:700;border-radius:9px}
  #delta-panel #delta-ieee-import-run:hover {background:#f0f7f8}
  #delta-panel #delta-ieee-import-status {font-size:11px;line-height:1.5}
  #delta-panel #delta-ieee-file {display:none!important}

  #delta-panel .delta-kicker {font-size:10px;color:#70818c;font-weight:750;letter-spacing:.09em}
  #delta-panel #delta-query-preview {padding:7px 0 0;min-height:0;color:#253b46;font-weight:650;font-size:13px}
  #delta-panel #delta-filter-preview {padding:5px 0 12px;min-height:0;color:#72828c;font-size:11px}
  #delta-panel .two {display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #delta-panel label:not(.check) {display:block;color:#4b6070;font-size:11px;font-weight:650;margin:10px 0 6px}
  #delta-panel .two label {margin-top:0}
  #delta-panel select,#delta-panel input[type="text"],#delta-panel input[type="date"],#delta-panel input[type="number"],#delta-panel input[type="file"] {
    font:inherit;font-size:12px;color:#243c48;background:#fff;border:1px solid #ccd8dd;border-radius:9px;min-height:39px;height:auto;padding:8px 10px;width:100%;min-width:0;}
  #delta-panel #delta-coverage-options {margin:13px 0 6px;padding:11px 12px 9px;background:#f7f9fa;border:1px solid #e2e9ed;border-radius:10px}
  #delta-panel #delta-coverage-options > strong,#delta-panel #delta-coverage-options > .note {display:none}
  #delta-panel #delta-coverage-options label {margin:0 0 6px}
  #delta-panel #delta-expected-total {background:#fff;color:#1c3341;border:1px solid #cbd9df;min-height:36px}
  #delta-panel #delta-audit-result {font-size:11px;color:#65808e;margin:7px 0 0;padding:0;min-height:0}
  #delta-panel #delta-local-label {margin:12px 0;color:#526673;font-size:11px}
  #delta-panel .check input {accent-color:#117b82}
  #delta-panel .buttons {margin:0;gap:8px}
  #delta-panel .act {background:#116b73;border-radius:9px;color:white;font-size:13px;font-weight:700;padding:12px;border:none}
  #delta-panel .act:hover {background:#0d5c65;transform:none}
  #delta-panel .ghost {background:#fff;color:#526b79;border:1px solid #d6e1e6;border-radius:9px;padding:9px 12px}
  #delta-panel .ghost:hover {transform:none}
  #delta-panel #delta-status {font-size:11px;color:#5c737f;line-height:1.5;padding:8px 0 0;min-height:0}
  #delta-panel #delta-status.err {color:#9e4554}
  #delta-panel progress {height:5px;margin:12px 0 0;background:#e6ecef}
  #delta-panel progress::-webkit-progress-bar {background:#e6ecef}
  #delta-panel progress::-webkit-progress-value {background:#158a8d}
  #delta-panel #delta-note {font-size:11px;line-height:1.55;color:#6d808a;margin:11px 0 0}
  #delta-panel .delta-fold {border-top:1px solid #e5ebee;margin:0;background:#f8fafb}
  #delta-panel [hidden] {display:none!important}
  #delta-panel .delta-fold > summary {padding:15px 19px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:8px;align-items:center}
  #delta-panel .delta-fold > summary::-webkit-details-marker {display:none}
  #delta-panel .delta-fold > summary:after {content:"+";color:#718692;font-size:18px}
  #delta-panel .delta-fold[open] > summary:after {content:"−"}
  #delta-panel .delta-fold summary span {font-size:13px;font-weight:700;color:#28404e}
  #delta-panel .delta-fold summary small {display:block;font-size:10px;font-weight:400;color:#72848e;margin-top:3px}
  #delta-panel .delta-fold > .special,#delta-panel .delta-fold > .delta-advanced {border:1px solid #e2e9ee;border-radius:10px;background:#fff;padding:13px;margin:0 13px 13px}
  #delta-panel .special {border-color:#e2e9ee;background:#fff;color:#344c59}
  #delta-panel .special .note {color:#667f8a}
  #delta-panel #delta-ieee-import > strong,#delta-panel #delta-library .top > strong {display:none}
  #delta-panel #delta-library .top {padding:0}
  #delta-panel .mini {border:1px solid #d0e1e6;background:#f5f9fa;color:#27616b;border-radius:9px;font-size:11px;padding:9px 11px}
  #delta-panel .mini:hover {background:#eaf3f5}
  #delta-panel .history {color:#637b86;line-height:1.6}
  #delta-panel .delta-danger {border:0;background:transparent;margin-top:12px}
  #delta-panel .delta-danger > summary {padding:6px 0}
  #delta-panel .delta-danger summary span {font-size:11px;color:#647b87}
  #delta-panel .delta-danger .minirow {padding-top:5px}
  #delta-panel #delta-clear {color:#a04452}
  #delta-panel .delta-advanced {display:flex;flex-direction:column;gap:8px}
  #delta-panel .delta-advanced .special {margin:0}
  #delta-panel .delta-advanced .check {font-size:11px;line-height:1.5;margin:7px 0}
  #delta-panel .foot {padding:12px 19px 15px;margin:0;border-top:1px solid #e5ebee;color:#8a99a2;text-align:center;font-size:10px}
  #delta-panel select:focus-visible,#delta-panel input:focus-visible,#delta-panel button:focus-visible,#delta-panel summary:focus-visible {
    outline:2px solid #0d8590;outline-offset:2px}
  .delta-controls {gap:7px}
  .delta-controls .primary {background:#143a49;color:white;border:1px solid #91adb6;box-shadow:0 3px 13px #173a4a28;border-radius:11px;
    font-size:12px;font-weight:650;letter-spacing:0;padding:11px 14px}
  .delta-controls .primary:hover {transform:none;box-shadow:0 5px 16px #173a4a32}
  .delta-controls .config {background:#fff;color:#315565;border:1px solid #cbd9df;box-shadow:0 3px 10px #16384b16;border-radius:11px;width:41px;height:41px;font-size:23px}
  .delta-controls .config:hover {transform:none}
  @media(max-width:560px) {
    #delta-panel {width:min(420px,calc(100vw - 16px));max-height:calc(100dvh - 75px)}
    #delta-panel .top {padding:15px}
    #delta-panel .delta-main {padding:15px}
    #delta-panel .delta-fold > summary {padding:14px 15px}
  }
  @media(prefers-reduced-motion:reduce){*{transition:none!important}}
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
      <div id="delta-ieee-action" class="delta-ieee-action" hidden>
        <input id="delta-ieee-file" type="file" accept=".csv,text/csv,text/plain" hidden aria-label="Selecionar CSV exportado pelo IEEE Xplore" />
        <button class="mini" type="button" id="delta-ieee-import-run">Importar e exportar no formato escolhido</button>
        <div class="status" id="delta-ieee-import-status" role="status" aria-live="polite"></div>
      </div>
      <div id="delta-capes-action" class="delta-ieee-action" hidden>
        <input id="delta-capes-file" type="file" accept=".ris,.bib,.bibtex,text/plain" hidden aria-label="Selecionar RIS ou BibTeX exportado pelo Portal CAPES" />
        <button class="mini" type="button" id="delta-capes-import-run">Importar RIS/BibTeX da CAPES</button>
        <div class="status" id="delta-capes-import-status" role="status" aria-live="polite"></div>
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
    <div class="delta-controls"><button class="primary" id="delta-one-click" title="Coletar até 200 registros em CSV com um clique"><span aria-hidden="true">↓</span> Coletar busca</button><button class="config" id="delta-config" aria-label="Configurar coleta" title="Opções de coleta">⚙</button></div>
  `;
  shadow.append(view);
  document.documentElement.append(shell);
  const $ = name => shadow.getElementById(`delta-${name}`);

  // Calm UI: reorder existing controls without replacing handlers or data semantics.
  const panel = $("panel");
  const header = panel.querySelector(":scope > .top");
  const baseFields = panel.querySelector(":scope > .two");
  const actionRow = panel.querySelector(":scope > .buttons");
  const footer = panel.querySelector(":scope > .foot");
  const makeFold = (title,description,node,cls="") => {
    const details = document.createElement("details");
    details.className = "delta-fold " + cls;
    const summary = document.createElement("summary");
    const label = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = title;
    const subtitle = document.createElement("small");
    subtitle.textContent = description;
    label.append(name,subtitle);
    summary.append(label);
    details.append(summary,node);
    return details;
  };
  const main = document.createElement("section");
  main.className = "delta-main";
  const kicker = document.createElement("div");
  kicker.className = "delta-kicker";
  kicker.textContent = "BUSCA ATUAL";
  // Each source has a distinct pagination model; never label a whole search as a single page.
  const pageInfo = document.createElement("div");
  pageInfo.id = "delta-page-info";
  pageInfo.className = "delta-page-info";
  const pageUrl = new URL(location.href);
  if (provider === "ieee") {
    const countParam = Number(pageUrl.searchParams.get("rowsPerPage"));
    const pageSize = Number.isSafeInteger(countParam) && countParam >= 1 && countParam <= 200 ? countParam : 25;
    const pageParam = Number(pageUrl.searchParams.get("pageNumber") || pageUrl.searchParams.get("page"));
    const pageNum = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : null;
    pageInfo.textContent = (pageNum ? "Página " + pageNum : "Página atual") + " · até " + pageSize + " registros visíveis · coleta parcial";
  } else if (provider === "capes") {
    pageInfo.textContent = "Portal CAPES · importação de arquivo bibliográfico oficial · sem coleta automática da página";
  } else if (provider === "arxiv") {
    const pageSize = Math.max(10,Math.min(200,Number(pageUrl.searchParams.get("size")) || 50));
    const offset = Math.max(0,Number(pageUrl.searchParams.get("start")) || 0);
    pageInfo.textContent = "arXiv · página " + (Math.floor(offset / pageSize) + 1) + " · coleta entre páginas, até o limite selecionado";
  } else {
    pageInfo.textContent = "Fonte: " + provider.toUpperCase() + " · consulte as condições de coleta abaixo";
  }
  main.append(kicker,$("query-preview"),$("filter-preview"),pageInfo,baseFields,$("coverage-options"),$("local-label"),actionRow,$("ieee-action"),$("capes-action"),$("progress"),$("status"),$("note"));
  const library = $("library");
  const clearRow = $("clear").parentElement;
  library.append(makeFold("Gerenciar dados locais","Exclusão de dados",clearRow,"delta-danger"));
  const libraryFold = makeFold("Biblioteca e matriz","Revisão e exportação dos registros salvos",library,"delta-library-fold");
  const advanced = document.createElement("div");
  advanced.className = "delta-advanced";
  advanced.append($("strategy"),$("oa-label"),$("pdf-label"),$("doaj-options"),$("preprint-options"));
  const advancedFold = makeFold("Mais opções","Estratégia, acesso e parâmetros da fonte",advanced,"delta-advanced-fold");
  panel.replaceChildren(header,$("source"),main,libraryFold,advancedFold,footer);
  header.querySelector(".eyebrow").textContent = "DELTA / SCIENTIFIC TOOLS";
  $("config").textContent = "⋯";
  $("config").setAttribute("aria-label","Abrir ou fechar configurações do DELTA");
  $("config").title = "Abrir painel";
  $("config").setAttribute("aria-expanded","false");


  const providers = {
    capes: ["Portal CAPES (experimental)", "Exporte RIS ou BibTeX na busca do Portal CAPES e importe o arquivo aqui. Não há coleta automática nem acesso às credenciais CAFe. Confira a cobertura e preserve o arquivo original."],
    ieee: ["IEEE Xplore", "A coleta direta recupera apenas os resultados visíveis nesta página (geralmente até 25). Para um conjunto maior, exporte CSV pelo IEEE e use o botão de importação acima."],
    arxiv: ["arXiv", "A coleta pode percorrer várias páginas até o limite configurado. A correspondência da busca deve ser conferida; até 20 PDFs opcionais."],
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
  $("source").textContent = providers[provider][0] + " · busca atual";
  showStrategy();
  $("note").textContent = providers[provider][1];
  if (provider === "semanticscholar") $("max").querySelector('option[value="2000"]').disabled = true;
  $("pdf-label").hidden = provider !== "arxiv";
  $("doaj-options").hidden = provider !== 'doaj';
  $("ieee-action").hidden = provider !== "ieee";
  $("capes-action").hidden = provider !== "capes";
  if(provider==="capes"){
    $("one-click").innerHTML='<span aria-hidden="true">↓</span> Importar CAPES';
    $("one-click").title="Importar RIS/BibTeX exportado pelo Portal CAPES";
    $("start").textContent="Importar arquivo CAPES";
  }
  if(provider==="ieee"){$("one-click").innerHTML='<span aria-hidden="true">↓</span> Coletar página';$("one-click").title="IEEE: coleta somente a página atual (normalmente 25). Para a busca inteira use Export Results → CSV.";}
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
  function setPanel(visible) { $("panel").hidden = !visible; $("config").setAttribute("aria-expanded", String(Boolean(visible))); }
  function setBusy(busy) {
    state.running = busy;
    $("start").disabled = busy;
    $("one-click").disabled = busy;
    $("cancel").disabled = !busy;
    $("start").textContent = busy ? "Processando..." : provider==="capes" ? "Importar arquivo CAPES" : "Baixar resultados";
    $("one-click").innerHTML = busy ? "◌ PROCESSANDO..." : (provider==="capes"?'<span aria-hidden="true">↓</span> Importar CAPES':provider==="ieee"?'<span aria-hidden="true">↓</span> Coletar página':'<span aria-hidden="true">↓</span> Coletar busca');
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
      generator: "DELTA Research Collector 0.5.5",
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
      }):format==='ris'?core.toRis(data.records):format==='bib'?core.toBibtex(data.records):format==='csv'?core.toCsv(data.records):JSON.stringify({generator:'DELTA Research Collector v0.5.5',exported_at:new Date().toISOString(),count:data.records.length,records:data.records,history:data.history},null,2);
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
    if (provider === "capes") { openCapesFile(); return; }
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
  function openCapesFile() {
    if(provider!=="capes"||state.running)return;
    if(typeof core.parseCapesNativeExport!=="function"){
      const explanation="Importador CAPES não carregado. Atualize todos os arquivos da extensão, clique em Recarregar em opera://extensions e atualize a página do Portal CAPES.";
      $("capes-import-status").textContent=explanation;
      setPanel(true);setStatus(explanation,true);return;
    }
    $("capes-file").value="";
    $("capes-file").click();
  }
  async function importCapesFile() {
    if(provider!=="capes"||state.running)return;
    const file=$("capes-file").files?.[0];
    if(!file)return;
    if(file.size>20_000_000||!/\.(ris|bib|bibtex)$/i.test(file.name)){
      $("capes-import-status").textContent="Selecione RIS ou BibTeX de até 20 MB.";return;
    }
    setPanel(true);
    setBusy(true);
    $("capes-import-run").disabled=true;
    $("capes-import-status").textContent="Lendo referências do arquivo local…";
    try{
      const input=await file.text();
      if(typeof core.parseCapesNativeExport!=="function")throw Error("Importador CAPES indisponível. Recarregue a extensão e atualize esta página.");
      const parsed=core.parseCapesNativeExport(input,file.name);
      const count=parsed.imported;
      const totalText=$("expected-total").value.trim();
      const expected=totalText?Number(totalText):null;
      if(expected!==null&&(!Number.isSafeInteger(expected)||expected<1||expected>10000000))throw Error("Total esperado inválido.");
      const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));
      const sha=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
      const coverage=expected===null?null:Number((100*count/expected).toFixed(2));
      const mode="capes_native_"+parsed.format.toLowerCase()+"_file_import";
      const note="Importação de arquivo bibliográfico CAPES "+parsed.format+": "+count+" registros e "+parsed.skipped+" entradas ignoradas. Busca original, filtros, ranking, identidade dos registros e completude não verificados. Nenhum acesso automatizado ao Portal CAPES.";
      const records=exportRows(parsed.records,$("format").value,count,false,expected===null||count!==expected,note,mode,{
        original_import_file:file.name,original_import_size:file.size,original_import_sha256:sha,
        import_format:parsed.format,imported_rows:count,skipped_rows:parsed.skipped,expected_search_total:expected,
        coverage_percent:coverage,completeness:expected===null?"not_verified":count===expected?"count_match_only":"count_mismatch",
        query_fidelity:"not_independently_verified",imported_via:"user_selected_native_export"
      });
      let saved="";
      if($("local").checked){
        const ctx=strategy();
        try{
          const result=await message({type:"DELTA_LIBRARY_ADD",records,run:{source:provider,url:ctx.url,query:ctx.query,parameters:ctx.parameters,retrieval_mode:mode,partial:true,note}});
          saved=" · biblioteca: +"+result.added+" novos e "+result.merged+" combinados"+(result.dropped?", "+result.dropped+" não armazenados":"");
          refreshLibrary().catch(()=>{});
        }catch(e){saved=" · biblioteca não atualizada: "+e.message;}
      }
      $("capes-import-status").textContent=count+" registros CAPES importados, exportados em "+$("format").value.toUpperCase()+(coverage===null?"; total da busca não informado":"; "+coverage+"% do total informado")+saved+". Fidelidade não verificada.";
      setStatus("CAPES: "+count+" registros importados. Preserve a exportação original e consulte a auditoria.");
    }catch(e){
      $("capes-import-status").textContent="CAPES: "+e.message;
      setStatus(e.message,true);
    }finally{
      $("capes-import-run").disabled=false;
      setBusy(false);
    }
  }
  $("capes-import-run").addEventListener("click",openCapesFile);
  $("capes-file").addEventListener("change",()=>void importCapesFile());
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
      const expected=Number($("expected-total").value)||null;
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
  $("ieee-import-run").addEventListener("click", () => {
    if(provider !== "ieee" || state.running)return;
    const fileInput=$("ieee-file");
    fileInput.value="";
    fileInput.click();
  });
  $("ieee-file").addEventListener("change", () => {
    if ($("ieee-file").files?.length) void importIEEECSV();
  });
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
