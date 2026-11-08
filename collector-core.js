/* DELTA Research Collector, v0.4.1. GPL-3.0-or-later. */
(() => {
  "use strict";
  const fields = ["source", "identifier", "title", "authors", "year", "date", "doi", "abstract", "article_url", "pdf_url", "journal", "search_url", "search_query", "search_parameters", "access_status", "access_evidence", "access_url", "access_checked_at", "collected_at", "sources", "xref_status", "xref_source", "xref"];

  function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }
  function stripHtml(value) {
    const raw = String(value ?? "");
    if (typeof DOMParser === "undefined") return clean(raw.replace(/<[^>]*>/g, " "));
    const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
    return clean(doc.body.textContent);
  }
  function csvCell(value) {
    let s = String(value ?? "");
    // Mitigate formula injection when opened in spreadsheet software.
    if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function toCsv(records) {
    return "\uFEFF" + fields.map(csvCell).join(",") + "\r\n" +
      records.map(r => fields.map(k => csvCell(Array.isArray(r[k]) ? r[k].join("; ") : r[k] && typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k])).join(",")).join("\r\n") + "\r\n";
  }
  function bibEscape(value) {
    // Braced values preserve Unicode; escape BibTeX-sensitive characters.
    return clean(value).replace(/\\/g, "\\textbackslash{}")
      .replace(/([{}%&#_$])/g, "\\$1")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  }
  function toBibtex(records) {
    const used = new Set();
    return records.map((r, i) => {
      let key = `${r.source || "paper"}_${r.identifier || i + 1}`.replace(/[^A-Za-z0-9_:-]/g, "_");
      const base = key;
      let suffix = 2;
      while (used.has(key)) key = `${base}_${suffix++}`;
      used.add(key);
      const lines = [`@article{${key}`];
      const values = {
        title: r.title,
        author: Array.isArray(r.authors) ? r.authors.join(" and ") : r.authors,
        year: r.year,
        doi: r.doi,
        abstract: r.abstract,
        url: r.article_url,
        note: [r.pdf_url ? `PDF: ${r.pdf_url}` : "",r.access_status?`Acesso: ${r.access_status}`:"",r.search_query?`Busca: ${String(r.search_query).slice(0,250)}`:"",(r.sources||[]).length?`Fontes: ${r.sources.join(", ")}`:"",r.xref_status?`XRef: ${r.xref_status}${r.xref_source?" / "+r.xref_source:""}`:""].filter(Boolean).join("; "),
        journal: r.journal
      };
      for (const [field, value] of Object.entries(values)) {
        if (value !== undefined && value !== null && String(value).trim()) {
          lines.push(`  ${field} = {${bibEscape(value)}}`);
        }
      }
      return lines.join(",\n") + "\n}\n";
    }).join("\n");
  }
  function arxivUrlForPage(searchUrl, offset) {
    const url = new URL(searchUrl);
    if (url.hostname !== "arxiv.org" || !url.pathname.startsWith("/search/")) throw new Error("URL arXiv inválida");
    url.searchParams.set("start", String(offset));
    return url.toString();
  }
  function parseArxiv(html) {
    const doc = typeof html === "string" ? new DOMParser().parseFromString(html, "text/html") : html;
    const nodes = Array.from(doc.querySelectorAll("li.arxiv-result"));
    const items = nodes.map(node => {
      const title = clean(node.querySelector("p.title")?.textContent);
      const anchor = node.querySelector('p.list-title a[href*="/abs/"]') || node.querySelector('a[href*="/abs/"]');
      const href = anchor?.getAttribute("href") || "";
      const id = href.match(/\/abs\/([^?#/]+)/)?.[1] || "";
      if (!title || !id || !/^[\w.\-]+(v\d+)?$/.test(id)) return null;
      const authors = Array.from(node.querySelectorAll("p.authors a")).map(a => clean(a.textContent));
      const abs = node.querySelector("span.abstract-full") || node.querySelector("span.abstract-short") || node.querySelector("p.abstract");
      const abstract = clean(abs?.textContent).replace(/(?:△\s*Less|▽\s*More|Less|More)\s*$/i, "");
      const dateText = clean(node.querySelector("p.is-size-7")?.textContent);
      const dateMatch = dateText.match(/Submitted\s+(?:on\s+)?(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})/i);
      const year = dateMatch ? dateMatch[1].match(/\d{4}$/)?.[0] || "" : "";
      const pdfAnchor = node.querySelector('a[href*="/pdf/"]');
      const pdfUrl = pdfAnchor ? new URL(pdfAnchor.getAttribute("href"), "https://arxiv.org").href : `https://arxiv.org/pdf/${id}`;
      return {
        source: "arXiv", identifier: id, title, authors, year,
        date: dateMatch?.[1] || "", doi: `10.48550/arXiv.${id.replace(/v\d+$/, "")}`,
        abstract, article_url: `https://arxiv.org/abs/${id}`, pdf_url: pdfUrl, journal: "",access_status:"open",access_evidence:"arXiv: preprint aberto",access_url:pdfUrl
      };
    }).filter(Boolean);
    return { records: items, pageSize: nodes.length };
  }
  function parseEuropePmc(data) {
    if (!data || typeof data !== "object" || !data.resultList || !Array.isArray(data.resultList.result)) {
      throw new Error("Resposta inesperada da Europe PMC");
    }
    return {
      total: Number(data.hitCount || 0),
      nextCursor: data.nextCursorMark || null,
      pageSize: data.resultList.result.length,
      records: data.resultList.result.map(r => {
        const links = r.fullTextUrlList?.fullTextUrl || [];
        const pdf = Array.isArray(links) && (r.isOpenAccess === "Y" || r.isOpenAccess === true)
          ? links.find(u => u.documentStyle?.toLowerCase() === "pdf" && u.url?.startsWith("https://"))?.url || ""
          : "";
        const authors = Array.isArray(r.authorList?.author) && r.authorList.author.length
          ? r.authorList.author.map(a => clean(a.fullName || [a.firstName, a.lastName].filter(Boolean).join(" ")))
          : clean(r.authorString).split(/,\s*|;\s*/).filter(Boolean);
        return {
          source: "Europe PMC", identifier: `${r.source || "MED"}:${r.id || ""}`,
          title: stripHtml(r.title), authors, year: String(r.pubYear || ""),
          date: r.firstPublicationDate || "", doi: r.doi || "", abstract: stripHtml(r.abstractText),
          article_url: `https://europepmc.org/article/${encodeURIComponent(r.source || "MED")}/${encodeURIComponent(r.id || "")}`,
          pdf_url: pdf, journal: stripHtml(r.journalInfo?.journal?.title || r.journalTitle),access_status:(r.isOpenAccess==="Y"||r.isOpenAccess===true)?"open":"unknown",access_evidence:"Europe PMC: indicador OA",access_url:pdf
        };
      }).filter(r => r.title && !r.identifier.endsWith(":"))
    };
  }
  function buildEuropePmcUrl(query, cursor = "*", pageSize = 100, sort = "") {
    const u = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
    u.searchParams.set("query", query);
    u.searchParams.set("format", "json");
    u.searchParams.set("resultType", "core");
    u.searchParams.set("pageSize", String(pageSize));
    u.searchParams.set("cursorMark", cursor);
    if (sort) u.searchParams.set("sort", sort);
    return u.toString();
  }

  function safeJsonParse(text, label) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`JSON inválido (${label})`); }
    return data;
  }
  function requireQuery(href, names, source) {
    const u = new URL(href);
    const q = names.map(k => u.searchParams.get(k)).find(v => v && v.trim());
    if (!q) throw new Error(`${source}: faça primeiro uma busca que apareça na URL.`);
    return q.trim();
  }
  function buildPubmedSearchUrl(href, limit) {
    const u = new URL(href);
    // Do not silently omit PubMed UI filters that cannot be faithfully converted to Entrez.
    if (u.searchParams.has('filter') || u.searchParams.has('filters')) {
      throw new Error('PubMed: filtros laterais da interface detectados. A versão atual não os traduz fielmente para ESearch. Refine a expressão de busca (term) com os mesmos critérios e remova os filtros da URL antes de exportar.');
    }
    const q = requireQuery(href, ['term'], 'PubMed');
    const sort = u.searchParams.get('sort') || '';
    const allowedSort = {'':'relevance','relevance':'relevance','date':'pub date','pubdate':'pub date', 'pub_date':'pub date'};
    if (!(sort in allowedSort)) throw new Error(`PubMed: ordenação "${sort}" ainda não suportada.`);
    const api = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    api.searchParams.set('db','pubmed'); api.searchParams.set('term',q);
    api.searchParams.set('retmode','json'); api.searchParams.set('retmax',String(limit));
    api.searchParams.set('sort',allowedSort[sort]); api.searchParams.set('tool','DELTAResearchCollector');
    return api.toString();
  }
  function buildPubmedFetchUrl(ids) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || ids.some(id => !/^\d+$/.test(String(id)))) throw new Error('Lote de PMIDs inválido');
    const u = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi');
    u.searchParams.set('db','pubmed'); u.searchParams.set('id', ids.join(','));
    u.searchParams.set('retmode','xml'); u.searchParams.set('tool','DELTAResearchCollector');
    return u.toString();
  }
  function parsePubmedSearch(payload) {
    const r = payload?.esearchresult;
    if (!r || !Array.isArray(r.idlist)) throw new Error('Resposta ESearch do PubMed inesperada');
    return { ids: r.idlist.map(String).filter(id => /^\d+$/.test(id)), total: Number(r.count || 0) };
  }
  function parsePubmedXml(xml) {
    const doc = new DOMParser().parseFromString(xml,'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML EFetch inválido');
    const articles = Array.from(doc.querySelectorAll('PubmedArticle'));
    return articles.map(node => {
      const citation = node.querySelector('MedlineCitation');
      const article = citation?.querySelector('Article');
      const identifier = clean(citation?.querySelector('PMID')?.textContent);
      const title = clean(article?.querySelector('ArticleTitle')?.textContent);
      if (!identifier || !title) return null;
      const authors = Array.from(article?.querySelectorAll('AuthorList > Author') || []).map(a => {
        const collective = clean(a.querySelector('CollectiveName')?.textContent);
        return collective || clean([a.querySelector('ForeName')?.textContent, a.querySelector('LastName')?.textContent].filter(Boolean).join(' '));
      }).filter(Boolean);
      const dates = article?.querySelector('ArticleDate') || article?.querySelector('JournalIssue > PubDate');
      const year = clean(dates?.querySelector('Year')?.textContent) || (clean(dates?.querySelector('MedlineDate')?.textContent).match(/\b\d{4}\b/)||[])[0] || '';
      const month = clean(dates?.querySelector('Month')?.textContent);
      const day = clean(dates?.querySelector('Day')?.textContent);
      const dparts = [year,month,day].filter(Boolean);
      const identifiers = Array.from(node.querySelectorAll('PubmedData > ArticleIdList > ArticleId'));
      const doi = clean(identifiers.find(a => a.getAttribute('IdType') === 'doi')?.textContent || article?.querySelector('ELocationID[EIdType="doi"]')?.textContent);
      const abstract = Array.from(article?.querySelectorAll('Abstract > AbstractText') || []).map(a => {
        const label = clean(a.getAttribute('Label'));
        return `${label ? label + ': ' : ''}${clean(a.textContent)}`;
      }).join(' ');
      return { source:'PubMed', identifier, title, authors, year, date:dparts.join('-'), doi, abstract,
        article_url:`https://pubmed.ncbi.nlm.nih.gov/${identifier}/`, pdf_url:'', journal:clean(article?.querySelector('Journal > Title')?.textContent) };
    }).filter(Boolean);
  }
  function buildOpenAlexUrl(href, page, size) {
    const current = new URL(href);
    const search = current.searchParams.get('search') || current.searchParams.get('q') || '';
    const filter = current.searchParams.get('filter') || '';
    if (!search && !filter) throw new Error('OpenAlex: inicie uma busca ou aplique filtros antes de exportar.');
    // Changes to unsupported query semantics should not be hidden from the researcher.
    const unsupported = [...current.searchParams.keys()].filter(k => !['search','q','filter','sort','page','per_page','view','column','columns','tab'].includes(k));
    if (unsupported.length) throw new Error(`OpenAlex: parâmetro da busca não suportado: ${unsupported.join(', ')}.`);
    const u = new URL('https://api.openalex.org/works');
    if (search) u.searchParams.set('search',search);
    if (filter) u.searchParams.set('filter',filter);
    if (current.searchParams.has('sort')) u.searchParams.set('sort',current.searchParams.get('sort'));
    u.searchParams.set('page',String(page)); u.searchParams.set('per_page',String(size));
    return u.toString();
  }
  function uninvertAbstract(index) {
    if (!index || typeof index !== 'object') return '';
    const words = [];
    for (const [word, positions] of Object.entries(index)) {
      if (!Array.isArray(positions)) continue;
      for (const idx of positions) if (Number.isInteger(idx) && idx >= 0 && idx < 10000) words[idx] = word;
    }
    return clean(words.join(' '));
  }
  function parseOpenAlex(payload) {
    if (!Array.isArray(payload?.results)) throw new Error('Resposta OpenAlex inesperada');
    return { total: Number(payload.meta?.count || 0), pageSize: payload.results.length,
      records: payload.results.map(r => ({
        source:'OpenAlex', identifier:String(r.id || '').split('/').pop(), title: clean(r.title || r.display_name),
        authors: (r.authorships || []).map(a => clean(a.author?.display_name || a.raw_author_name)).filter(Boolean),
        year: String(r.publication_year || ''), date:r.publication_date || '',
        doi:String(r.doi || '').replace(/^https?:\/\/doi\.org\//i,''), abstract:uninvertAbstract(r.abstract_inverted_index),
        article_url:r.doi || r.id || '', pdf_url:r.best_oa_location?.pdf_url || '',
        journal:clean(r.primary_location?.source?.display_name),access_status:r.open_access?.is_oa===true?'open':r.open_access?.is_oa===false?'no_open_copy_found':'unknown',access_evidence:'Indicador OA OpenAlex',access_url:r.best_oa_location?.pdf_url||r.best_oa_location?.landing_page_url||''
      })).filter(r => r.identifier && r.title) };
  }
  function buildCrossrefUrl(href, cursor, size) {
    const current = new URL(href);
    const query = requireQuery(href,['q','query','query.bibliographic'], 'Crossref');
    const unsupported = [...current.searchParams.keys()].filter(k => !['q','query','query.bibliographic','from_ui','sort','order'].includes(k));
    if (unsupported.length) throw new Error(`Crossref: filtros adicionais não interpretados: ${unsupported.join(', ')}.`);
    const u = new URL('https://api.crossref.org/works');
    u.searchParams.set('query',query); u.searchParams.set('rows',String(size));
    u.searchParams.set('cursor',cursor);
    if (current.searchParams.has('sort')) u.searchParams.set('sort',current.searchParams.get('sort'));
    if (current.searchParams.has('order')) u.searchParams.set('order',current.searchParams.get('order'));
    return u.toString();
  }
  function parseCrossref(payload) {
    const m = payload?.message;
    if (!Array.isArray(m?.items)) throw new Error('Resposta Crossref inesperada');
    return {total: Number(m['total-results'] || 0), nextCursor: m['next-cursor'] || '', pageSize:m.items.length,
      records: m.items.map(r => {
        const dateParts = r.published?.['date-parts']?.[0] || r.issued?.['date-parts']?.[0] || [];
        const authors = (r.author || []).map(a => clean([a.given,a.family].filter(Boolean).join(' ') || a.name)).filter(Boolean);
        return {source:'Crossref', identifier:r.DOI || '', title:stripHtml((r.title||[])[0]), authors,
          year:String(dateParts[0] || ''), date:dateParts.join('-'), doi:r.DOI || '',
          abstract:stripHtml(r.abstract), article_url:r.URL || (r.DOI ? `https://doi.org/${r.DOI}` : ''),
          pdf_url:'', journal:stripHtml((r['container-title'] || [])[0]) };
      }).filter(r=>r.identifier && r.title)};
  }
  function buildSemanticScholarUrl(href, offset, size) {
    const current = new URL(href);
    const q = requireQuery(href,['q','query'], 'Semantic Scholar');
    const sort = current.searchParams.get('sort') || 'relevance';
    if (sort !== 'relevance') throw new Error('Semantic Scholar: apenas a ordenação por relevância é suportada nesta versão.');
    const allowed = ['q','query','sort','year','openAccessPdf','fieldsOfStudy','publicationTypes','minCitationCount','publicationDateOrYear'];
    const unsupported = [...current.searchParams.keys()].filter(k=>!allowed.includes(k));
    if (unsupported.length) throw new Error(`Semantic Scholar: filtros não traduzidos: ${unsupported.join(', ')}.`);
    const u = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
    u.searchParams.set('query',q); u.searchParams.set('offset',String(offset)); u.searchParams.set('limit',String(size));
    u.searchParams.set('fields','title,authors,year,publicationDate,abstract,externalIds,url,openAccessPdf,journal');
    for (const k of ['year','openAccessPdf','fieldsOfStudy','publicationTypes','minCitationCount','publicationDateOrYear']) {
      if (current.searchParams.has(k)) u.searchParams.set(k,current.searchParams.get(k) || '');
    }
    return u.toString();
  }
  function parseSemanticScholar(payload) {
    if (!Array.isArray(payload?.data)) throw new Error('Resposta Semantic Scholar inesperada');
    return {total:Number(payload.total || 0), next: payload.next, pageSize:payload.data.length,
      records:payload.data.map(r => ({
        source:'Semantic Scholar', identifier:r.paperId || '', title:clean(r.title),
        authors:(r.authors || []).map(a=>clean(a.name)).filter(Boolean), year:String(r.year || ''),
        date:r.publicationDate || '', doi:r.externalIds?.DOI || '', abstract:clean(r.abstract),
        article_url:r.url || (r.paperId ? `https://www.semanticscholar.org/paper/${r.paperId}` : ''),
        pdf_url:r.openAccessPdf?.url || '', journal:clean(r.journal?.name),access_status:r.openAccessPdf?.url?'open':'unknown',access_evidence:'Semantic Scholar: indicador OA',access_url:r.openAccessPdf?.url||''
      })).filter(r=>r.identifier && r.title)};
  }


  function normalizeDoi(value) {
    return clean(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").toLowerCase().replace(/[.,;]+$/, "");
  }
  function workKey(r) {
    const doi = normalizeDoi(r.doi);
    if (doi && /^10\.\d{4,9}\//.test(doi)) return `doi:${doi}`;
    return `id:${clean(r.source).toLowerCase()}:${clean(r.identifier).toLowerCase()}`;
  }
  function mergeRecord(a,b) {
    // No fuzzy title matching: different works could share titles.
    const sources = [...new Set([...(a.sources||[a.source]), ...(b.sources||[b.source])])].filter(Boolean);
    const out = {...a, sources};
    for (const k of ['title','abstract','journal','pdf_url','article_url','year','date']) {
      if (String(b[k]||'').length > String(out[k]||'').length) out[k] = b[k];
    }
    if ((b.authors?.length||0) > (out.authors?.length||0)) out.authors = b.authors;
    if (!out.doi && b.doi) out.doi = b.doi;
    return out;
  }
  function deduplicateRecords(records) {
    const map=new Map();
    for (const r of records) {
      const key=workKey(r);
      if (!map.has(key)) map.set(key,{...r,sources:r.sources||[r.source]});
      else map.set(key,mergeRecord(map.get(key),r));
    }
    return [...map.values()];
  }
  function toRis(records) {
    // RIS is importable by Zotero. Sanitize embedded line breaks.
    return records.map(r=>{
      const lines=['TY  - JOUR'];
      for (const [code,value] of [
        ['TI',r.title],['PY',r.year],['DA',r.date],['DO',normalizeDoi(r.doi)],
        ['AB',r.abstract],['JO',r.journal],['UR',r.article_url],['L1',r.pdf_url]
      ]) if (clean(value)) lines.push(`${code}  - ${clean(value)}`);
      for(const author of (Array.isArray(r.authors)?r.authors:clean(r.authors).split(';').filter(Boolean))) {
        if(clean(author))lines.push(`AU  - ${clean(author)}`);
      }
      lines.push(`N1  - DELTA Research Collector; fontes: ${(r.sources||[r.source]).join(', ')}; acesso: ${r.access_status||'unknown'}`);
      if(r.xref_status)lines.push(`N1  - XRef: ${r.xref_status}${r.xref_source?"; registrador: "+r.xref_source:""}; detalhes de evidência no CSV/JSON.`);if(r.search_query)lines.push(`N1  - Busca: ${clean(r.search_query).slice(0,500)}`);if(r.search_url)lines.push(`N1  - URL de busca: ${clean(r.search_url).slice(0,1600)}`);
      lines.push('ER  - ');
      return lines.join('\r\n');
    }).join('\r\n\r\n')+'\r\n';
  }
  function buildDoajUrl(href, page=1, pageSize=100, override='') {
    const u=new URL(href);
    if (u.hostname !== 'doaj.org' && u.hostname!=='www.doaj.org') throw new Error('URL DOAJ inválida');
    let query=clean(override);
    if (!query) query=clean(u.searchParams.get('q')||u.searchParams.get('query')||u.searchParams.get('search'));
    if (!query && /^\/search\/articles\//.test(u.pathname)) query=decodeURIComponent(u.pathname.substring('/search/articles/'.length));
    if (!query) throw new Error('DOAJ: informe um termo na extensão ou abra uma busca com q= na URL. Filtros não transferíveis da interface não são inferidos.');
    if (!override) {
      const invalid=[...u.searchParams.keys()].filter(k=>!['q','query','search','page'].includes(k));
      if (invalid.length) throw new Error('DOAJ: parâmetros não traduzidos ('+invalid.join(', ')+'). Digite o termo manualmente na extensão para uma nova busca sem esses filtros.');
    }
    const api=new URL('https://doaj.org/api/search/articles/'+encodeURIComponent(query));
    api.searchParams.set('page',String(page)); api.searchParams.set('pageSize',String(pageSize));
    return api.toString();
  }
  function parseDoaj(payload) {
    if(!Array.isArray(payload?.results))throw new Error('Resposta inesperada da API DOAJ');
    return {total:Number(payload.total||0),pageSize:payload.results.length,
      records:payload.results.map(r=>{
        const b=r.bibjson||{};
        const doi=(b.identifier||[]).find(i=>String(i.type).toLowerCase()==='doi')?.id||'';
        const links=b.link||[];
        const url=links.find(v=>v.type==='fulltext')?.url||links[0]?.url||'';
        const pdf=links.find(v=>/\.pdf(?:\?|$)/i.test(v.url||''))?.url||'';
        return {source:'DOAJ',identifier:r.id||doi,title:stripHtml(b.title),authors:(b.author||[]).map(a=>clean(a.name)).filter(Boolean),
        year:String(b.year||''),date:b.month&&b.year?`${b.year}-${b.month}`:String(b.year||''),doi:normalizeDoi(doi),abstract:stripHtml(b.abstract),
        article_url:url||(r.id?`https://doaj.org/article/${r.id}`:''),pdf_url:pdf,journal:clean(b.journal?.title),access_status:'open',access_evidence:'DOAJ: revista aberta',access_url:url};
      }).filter(r=>r.identifier&&r.title)};
  }
  function buildSciELOUrl(href,from=1,count=15) {
    const u=new URL(href);
    const supported=['search.scielo.org','www.scielo.org','scielo.org'];
    if(!supported.includes(u.hostname))throw new Error('Endereço SciELO inválido');
    if(!clean(u.searchParams.get('q')))throw new Error('SciELO: execute primeiro uma busca com q= na URL');
    if(u.hostname!=='search.scielo.org'){
      const safe=['q','lang'];
      const other=[...u.searchParams.keys()].filter(k=>!safe.includes(k));
      if(other.length)throw new Error(`SciELO: filtros de interface não traduzidos (${other.join(', ')}). Abra a busca em search.scielo.org.`);
      u.hostname='search.scielo.org';u.pathname='/';
    }
    u.searchParams.set('from',String(from));
    u.searchParams.set('count',String(count));
    u.searchParams.set('page',String(Math.ceil(from/count)));
    u.searchParams.set('output','site');
    u.searchParams.set('format','summary');
    return u.toString();
  }
  function parseSciELO(html) {
    if(typeof DOMParser==='undefined')throw new Error('SciELO HTML exige DOMParser');
    const doc=new DOMParser().parseFromString(html,'text/html');
    const items=[...doc.querySelectorAll('.item')];
    const hits=clean(doc.querySelector('#TotalHits')?.textContent);
    const total=hits?Number(hits.replace(/[^\d]/g,'')):null;
    const records=items.map(n=>{
      const anchor=n.querySelector('.title a[href], h3.title a[href], h2.title a[href]');
      const title=clean(n.querySelector('.title')?.textContent);
      const rawUrl=anchor?.getAttribute('href')||'';
      let articleUrl='';try{if(rawUrl)articleUrl=new URL(rawUrl,'https://search.scielo.org').href;}catch{}
      const doiLink=n.querySelector('.DOIResults a[href]')?.getAttribute('href')||'';
      const doi=normalizeDoi(doiLink)||normalizeDoi(clean(n.querySelector('.DOIResults')?.textContent));
      const authors=[...n.querySelectorAll('.authors a.author')].map(a=>clean(a.textContent)).filter(Boolean);
      if(!authors.length) authors.push(...clean(n.querySelector('.authors')?.textContent).split(/;\s*/).filter(Boolean));
      const yr=clean(n.querySelector('.source')?.textContent).match(/\b(?:19|20)\d{2}\b/)?.[0]||'';
      const nodeId=n.id;let abstract='';
      if(nodeId) for(const lang of ['en','pt','es']){
        const abs=doc.getElementById(`${nodeId}_${lang}`);
        if(abs){abstract=clean(abs.textContent);break;}
      }
      const identifier=doi||nodeId||articleUrl;
      return {source:'SciELO',identifier,title,authors,year:yr,date:yr,doi,abstract,article_url:articleUrl||doiLink,
        pdf_url:'',journal:clean(n.querySelector('.source a')?.textContent)};
    }).filter(r=>r.title&&r.identifier);
    return {total:Number.isFinite(total)?total:null,pageSize:items.length,records};
  }
  function buildPreprintUrl(server, from, to, cursor=0) {
    if(!['biorxiv','medrxiv'].includes(server))throw new Error('Servidor de preprints inválido');
    const re=/^\d{4}-\d{2}-\d{2}$/;
    if(!re.test(from)||!re.test(to)||from>to||Number.isNaN(Date.parse(from))||Number.isNaN(Date.parse(to)))throw new Error('Datas inválidas para busca de preprints');
    if(!Number.isInteger(cursor)||cursor<0)throw new Error('Cursor inválido');
    return `https://api.biorxiv.org/details/${server}/${from}/${to}/${cursor}`;
  }
  function parsePreprint(payload,server) {
    if(!Array.isArray(payload?.collection))throw new Error('Resposta inesperada bioRxiv/medRxiv');
    const total=Number(payload.messages?.[0]?.count ?? 0);
    return {total,pageSize:payload.collection.length,records:payload.collection.map(r=>({
      source:server==='biorxiv'?'bioRxiv':'medRxiv',identifier:clean(r.doi),title:clean(r.title),
      authors:clean(r.authors).split(/;\s*/).filter(Boolean),year:clean(r.date).slice(0,4),date:r.date||'',doi:normalizeDoi(r.doi),
      abstract:stripHtml(r.abstract),article_url:`https://doi.org/${encodeURI(normalizeDoi(r.doi))}`,
      pdf_url:'',journal:'Preprint',access_status:'open',access_evidence:'Preprint em servidor aberto',access_url:`https://doi.org/${encodeURI(normalizeDoi(r.doi))}`
    })).filter(r=>r.identifier&&r.title)};
  }
  function matchesTerm(record,term) {
    const needle=clean(term).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(!needle)return true;
    return clean(`${record.title} ${record.abstract}`).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(needle);
  }

  function searchContext(href) {
    const u=new URL(href),params={},sensitive=/token|api.?key|passw|session|auth|secret|credential|email|cookie|ticket|sso|nonce|csrf|code|state/i;
    for(const [k,v] of u.searchParams.entries())if(!sensitive.test(k)){(params[k] ||= []).push(v.slice(0,3000));}
    let q='';
    for(const k of ['queryText','querytext','query','q','term','search','searchTerm','searchtext','searchText','terms-0-term'])if(params[k]?.length){q=params[k][0];break;}
    if(!q&&u.pathname.startsWith('/search/')){const parts=u.pathname.split('/').filter(Boolean);if(parts[1]&&!['searchresult.jsp','advanced','articles'].includes(parts[1]))q=decodeURIComponent(parts[1]).slice(0,1500);}
    const safe=new URL(u.origin+u.pathname);
    for(const [k,values] of Object.entries(params))for(const v of values)safe.searchParams.append(k,v);
    const filters=Object.fromEntries(Object.entries(params).filter(([k])=>/filter|refinement|facet|range|year|date|sort|order|field|classification|pubtype|contentType|publication|author|access/i.test(k)));
    return {url:safe.toString(),query:q,parameters:params,filters,source:detectProvider(href),captured_at:new Date().toISOString()};
  }
  function accessInfo(r){return {...r,access_status:['open','publisher_restricted','no_open_copy_found','unknown'].includes(r.access_status)?r.access_status:'unknown',access_evidence:r.access_evidence||'',access_url:r.access_url||'',access_checked_at:r.access_checked_at||''};}
  function parseOpenAlexAccess(r){
    if(!r?.id)throw Error('Resposta OpenAlex inesperada');
    const open=r.open_access?.is_oa===true;const loc=r.best_oa_location||r.primary_location||{};
    if(open)return {status:'open',url:loc.pdf_url||loc.landing_page_url||r.open_access?.oa_url||'',evidence:'OpenAlex: copia aberta indexada'};
    if(r.open_access?.is_oa===false)return {status:'no_open_copy_found',url:'',evidence:'OpenAlex: nao encontrou copia OA; paywall nao comprovado'};
    return {status:'unknown',url:'',evidence:'OpenAlex: inconclusivo'};
  }

  // Parse the official IEEE Xplore CSV locally, retaining bibliographic metadata.
  function parseIEEEExportCsv(input) {
    if(typeof input!=='string'||input.length>20_000_000)throw Error('IEEE CSV: arquivo ausente ou maior que 20 MB.');
    const text=input.replace(/^\uFEFF/,'');
    function rowsFor(sep) {
      const rows=[];let row=[],field='',quoted=false;
      for(let i=0;i<text.length;i++){
        const ch=text[i];
        if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
        else if(!quoted&&(ch===sep||ch==='\n'||ch==='\r')){
          if(ch===sep){row.push(field);field='';continue;}
          row.push(field);field='';
          if(row.some(v=>v.trim()))rows.push(row);
          row=[];if(ch==='\r'&&text[i+1]==='\n')i++;
          if(rows.length>25000)throw Error('IEEE CSV: excede 25.000 linhas.');
        }else field+=ch;
      }
      if(quoted)throw Error('IEEE CSV: campo entre aspas não fechado.');
      row.push(field);if(row.some(v=>v.trim()))rows.push(row);
      return rows;
    }
    const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    const recognized=new Set(['documenttitle','title','articletitle','authors','author','authornames','doi','publicationyear','year','publicationtitle','publicationdate','abstract','articleid','articlenumber','documentnumber','ieeedocumentnumber','documenturl','linktodocument','documentlink','link','url','accesstype','pdfurl','pdflink','dateaddedtoieeexplore']);
    let best=null;
    for(const sep of [',',';','\t']){
      const rows=rowsFor(sep);
      for(let i=0;i<Math.min(25,rows.length);i++){
        const keys=rows[i].map(norm),score=keys.filter(k=>recognized.has(k)).length;
        if((keys.includes('documenttitle')||keys.includes('title')||keys.includes('articletitle'))&&score>=2&&(!best||score>best.score))best={rows,header:i,keys,score,separator:sep};
      }
    }
    if(!best)throw Error('IEEE CSV: cabeçalho bibliográfico não identificado. Use Export Results → CSV no IEEE Xplore.');
    const at=(row,...names)=>{for(const key of names){const idx=best.keys.indexOf(norm(key));if(idx>=0&&row[idx])return clean(row[idx]);}return '';};
    const result=[],seen=new Set();let skipped=0;
    for(let i=best.header+1;i<best.rows.length;i++){
      const row=best.rows[i],title=at(row,'Document Title','Title','Article Title');
      if(!title){skipped++;continue;}
      const doi=normalizeDoi(at(row,'DOI'));
      const rawUrl=at(row,'Document URL','Link to Document','Document Link','Link','URL');
      const idFromUrl=(rawUrl.match(/ieeexplore\.ieee\.org\/document\/(\d+)/i)||[])[1];
      const identifier=idFromUrl||at(row,'Article Number','IEEE Document Number','Document Number','Article ID')||doi||'csv:'+norm(title).slice(0,100)+'-'+at(row,'Publication Year','Year');
      const key=doi?'doi:'+doi:'id:'+identifier;
      if(seen.has(key)){skipped++;continue;}seen.add(key);
      const accessText=at(row,'Access Type').toLowerCase();
      const access_status=/open access|ephemera|\boa\b/.test(accessText)?'open':/locked|subscription|restricted/.test(accessText)?'publisher_restricted':'unknown';
      let article_url=idFromUrl?'https://ieeexplore.ieee.org/document/'+idFromUrl:'';
      if(!article_url&&/^https:\/\//i.test(rawUrl)){try{const u=new URL(rawUrl);if(['ieeexplore.ieee.org','doi.org','dx.doi.org'].includes(u.hostname))article_url=u.href;}catch{}}
      if(!article_url&&doi)article_url='https://doi.org/'+doi;
      result.push({source:'IEEE Xplore',identifier,title,authors:at(row,'Authors','Author Names','Author').split(/;\s*|\s+AND\s+/i).map(clean).filter(Boolean),
        year:at(row,'Publication Year','Year'),date:at(row,'Publication Date','Publication Date Online','Date Added to IEEE Xplore'),doi,
        abstract:at(row,'Abstract'),article_url,pdf_url:'',journal:at(row,'Publication Title'),access_status,
        access_evidence:access_status==='unknown'?'IEEE CSV: acesso não verificado':'IEEE CSV: campo Access Type',
        access_url:access_status==='open'?article_url:''});
    }
    if(!result.length)throw Error('IEEE CSV: nenhum artigo válido encontrado.');
    return {records:result,imported:result.length,skipped,header_row:best.header+1,delimiter:best.separator};
  }

  function parseIEEEPage(doc) {
    const nodes=[],seen=new Set();
    for(const selector of ['.List-results-items .List-results-item','.List-results-item','xpl-search-result','article.search-result'])
      for(const e of doc.querySelectorAll(selector))if(!seen.has(e)){nodes.push(e);seen.add(e);}
    if(!nodes.length)for(const a of doc.querySelectorAll('a[href*="/document/"]')){
      const e=a.closest('li,article,[class*="List-results-item"],[class*="search-result"]');
      if(e&&!seen.has(e)){nodes.push(e);seen.add(e);}
    }
    const records=[],ids=new Set();
    for(const e of nodes) {
      const a=e.querySelector('a[href*="/document/"]');if(!a)continue;
      const url=new URL(a.getAttribute('href')||'', 'https://ieeexplore.ieee.org');
      if(url.hostname!=='ieeexplore.ieee.org')continue;
      const id=url.pathname.match(/^\/document\/(\d+)/)?.[1];if(!id||ids.has(id))continue;
      const title=clean(e.querySelector('.result-item-title,.List-results-item-title,[class*="document-title"]')?.textContent||a.textContent);
      if(title.length<5)continue;ids.add(id);
      const text=clean(e.textContent),rawDoi=text.match(/\b10\.\d{4,9}\/[^\s<>"']+/i)?.[0]||e.querySelector('a[href*="doi.org/"]')?.getAttribute('href')||'';
      const authors=[...e.querySelectorAll('a[href*="/author/"],.authors a,.author a')].map(n=>clean(n.textContent)).filter(Boolean).slice(0,60);
      const badges=[...e.querySelectorAll('span,[class*="access"],[title],[aria-label]')].map(n=>clean(n.textContent).toLowerCase());
      const isOpen=badges.includes('open access')||(!title.toLowerCase().includes('open access')&&/(?:^|\s)Open Access(?=\d|\s|$)/i.test(text));
      const locked=badges.includes('locked')||/(?:^|\s)Locked(?=\d|\s|$)|subscription required|purchase pdf/i.test(text);
      records.push({source:'IEEE Xplore',identifier:id,title,authors,year:text.match(/\b(?:19|20)\d{2}\b/)?.[0]||'',date:'',doi:normalizeDoi(rawDoi),abstract:'',article_url:'https://ieeexplore.ieee.org/document/'+id,pdf_url:'',journal:'',
        access_status:isOpen?'open':locked?'publisher_restricted':'unknown',access_evidence:isOpen?'IEEE: selo Open Access':locked?'IEEE: selo Locked':'Sem sinal confiavel na pagina',access_url:isOpen?'https://ieeexplore.ieee.org/document/'+id:''});
    }
    return {records,pageSize:records.length,total:null,mode:'visible_page_only'};
  }

  function detectProvider(href) {
    const u = new URL(href);
    if (u.hostname === "ieeexplore.ieee.org" && u.pathname.startsWith("/search/")) return "ieee";
    if (["periodicos.capes.gov.br","www.periodicos.capes.gov.br"].includes(u.hostname) || /^www-periodicos-capes-gov-br\.ez\d+\.periodicos\.capes\.gov\.br$/.test(u.hostname)) return "capes";
    if (u.hostname === "arxiv.org" && u.pathname.startsWith("/search/")) return "arxiv";
    if (["europepmc.org", "www.europepmc.org"].includes(u.hostname) && u.pathname.startsWith("/search")) return "europepmc";
    if (u.hostname === "pubmed.ncbi.nlm.nih.gov" && u.pathname === "/" && u.searchParams.has("term")) return "pubmed";
    if (["openalex.org","www.openalex.org"].includes(u.hostname) && /^\/works\/?$/.test(u.pathname)) return "openalex";
    if (u.hostname === "search.crossref.org" && u.searchParams.has("q")) return "crossref";
    if (["www.crossref.org","crossref.org"].includes(u.hostname) && u.pathname.startsWith("/search") && (u.searchParams.has("q") || u.searchParams.has("query"))) return "crossref";
    if (["www.semanticscholar.org","semanticscholar.org"].includes(u.hostname) && u.pathname.startsWith("/search") && (u.searchParams.has("q") || u.searchParams.has("query"))) return "semanticscholar";
    if (["search.scielo.org","www.scielo.org","scielo.org"].includes(u.hostname) && (u.hostname==="search.scielo.org"||u.pathname.includes("/search")) && u.searchParams.has('q'))return 'scielo';
    if (["doaj.org","www.doaj.org"].includes(u.hostname) && (u.pathname==='/' || u.pathname.startsWith('/search/articles'))) return 'doaj';
    if (["biorxiv.org","www.biorxiv.org"].includes(u.hostname) && (u.pathname==='/' || u.pathname.startsWith('/search') || u.pathname.startsWith('/collection'))) return 'biorxiv';
    if (["medrxiv.org","www.medrxiv.org"].includes(u.hostname) && (u.pathname==='/' || u.pathname.startsWith('/search') || u.pathname.startsWith('/collection'))) return 'medrxiv';
    return null;
  }
  globalThis.DELTA_CORE = { fields, clean, csvCell, toCsv, toBibtex, parseArxiv, parseEuropePmc, arxivUrlForPage, buildEuropePmcUrl, detectProvider, safeJsonParse,
    buildPubmedSearchUrl, buildPubmedFetchUrl, parsePubmedSearch, parsePubmedXml,
    buildOpenAlexUrl, parseOpenAlex, uninvertAbstract,
    buildCrossrefUrl, parseCrossref, buildSemanticScholarUrl, parseSemanticScholar,
    normalizeDoi, workKey, mergeRecord, deduplicateRecords, toRis,
    buildDoajUrl,parseDoaj,buildSciELOUrl,parseSciELO,buildPreprintUrl,parsePreprint,matchesTerm,searchContext,accessInfo,parseOpenAlexAccess,parseIEEEPage,parseIEEEExportCsv };
})();

// CAPES parser is bundled with the core: content scripts no longer depend on a second script global.
/* DELTA Research Collector: CAPES official RIS/BibTeX imports. GPL-3.0-or-later. */
(() => {
  "use strict";
  const clean = x => String(x ?? "").replace(/\s+/g, " ").trim();
  const doi = x => clean(x).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").replace(/[.,;]+$/, "").toLowerCase();
  const url = x => { try { const u = new URL(clean(x)); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };
  function hash(x) {
    let v = 2166136261;
    for (let i = 0; i < x.length; i++) v = Math.imul(v ^ x.charCodeAt(i), 16777619);
    return (v >>> 0).toString(16).padStart(8, "0");
  }
  function record(d, file, i) {
    const title = clean(d.title);
    if (title.length < 4) return null;
    const rawDoi = doi(d.doi);
    const realDoi = /^10\.\d{4,9}\/\S+$/i.test(rawDoi) ? rawDoi : "";
    const article_url = url(d.url) || (realDoi ? "https://doi.org/" + realDoi : "");
    const authors = (d.authors || []).map(clean).filter(Boolean);
    const identifier = clean(d.id) || realDoi || article_url ||
      "native:" + hash([file, i, title, authors.join(";"), d.year].join("|"));
    return { source: "Portal CAPES", identifier, title, authors,
      year: clean(d.year).match(/\b(?:19|20)\d{2}\b/)?.[0] || "",
      date: clean(d.date), doi: realDoi, abstract: clean(d.abstract),
      article_url, pdf_url: "", journal: clean(d.journal),
      access_status: "unknown",
      access_evidence: "CAPES: importação bibliográfica local; acesso ao texto completo não verificado",
      access_url: "", sources: ["Portal CAPES"] };
  }
  function parseRis(text, file) {
    const records = []; let block = null, tag = "", skipped = 0;
    for (const line of text.split(/\r\n|\r|\n/)) {
      const m = /^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/.exec(line);
      if (m) {
        const [ , key, value ] = m;
        if (key === "TY") { if (block) skipped++; block = {}; tag = ""; }
        if (key === "ER" && block) {
          const first = (...codes) => { for (const c of codes) if (block[c]?.length) return block[c][0]; return ""; };
          const authors = [...(block.AU || []), ...(block.A1 || []), ...(block.A2 || [])];
          const item = record({ title: first("TI", "T1", "CT"), authors, year: first("PY", "Y1", "DA"),
            date: first("DA", "Y1"), doi: first("DO"), url: first("UR"),
            journal: first("JO", "JF", "T2", "JA"), abstract: first("AB", "N2"),
            id: first("ID", "AN") }, file, records.length + skipped);
          if (item) records.push(item); else skipped++;
          block = null; tag = ""; continue;
        }
        if (block && key !== "ER") { (block[key] ||= []).push(value.slice(0, 30000)); tag = key; }
      } else if (block && tag && line.trim() && block[tag]?.length) {
        const entries = block[tag]; entries[entries.length - 1] += " " + line.trim().slice(0, 30000);
      }
      if (records.length > 20000) throw Error("CAPES: arquivo com mais de 20.000 registros.");
    }
    if (block) skipped++; // Never silently accept truncated RIS records.
    return { records, skipped, format: "RIS" };
  }
  function parseBibtex(text, file) {
    const records = []; let skipped = 0, i = 0;
    const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };
    const normalize = s => clean(s).replace(/\\([{}%&#_$~])/g, "$1");
    function fieldValue() {
      ws();
      if (text[i] === "{") {
        let depth = 1, start = ++i;
        for (; i < text.length; i++) {
          if (text[i] === "\\" && i + 1 < text.length) { i++; continue; }
          if (text[i] === "{") depth++;
          else if (text[i] === "}" && --depth === 0) {
            const result = normalize(text.slice(start, i)); i++; return result;
          }
        }
        throw Error("CAPES: BibTeX com chaves incompletas.");
      }
      if (text[i] === '"') {
        const start = ++i;
        for (; i < text.length; i++) {
          if (text[i] === "\\" && i + 1 < text.length) { i++; continue; }
          if (text[i] === '"') { const result = normalize(text.slice(start, i)); i++; return result; }
        }
        throw Error("CAPES: BibTeX com aspas incompletas.");
      }
      const start = i; while (i < text.length && !/[,}\r\n)]/.test(text[i])) i++;
      return normalize(text.slice(start, i));
    }
    while (i < text.length) {
      const found = text.indexOf("@", i); if (found < 0) break; i = found + 1;
      const type = /^[\p{L}][\p{L}\p{N}_-]*/u.exec(text.slice(i)); if (!type) continue;
      const kind = type[0].toLowerCase(); i += type[0].length; ws();
      const open = text[i], end = open === "{" ? "}" : open === "(" ? ")" : null;
      if (!end) continue; i++;
      if (["comment", "string", "preamble"].includes(kind)) {
        let depth = 1;
        while (i < text.length && depth) { if (text[i] === open) depth++; else if (text[i] === end) depth--; i++; }
        continue;
      }
      const keyStart = i;
      while (i < text.length && text[i] !== "," && text[i] !== end) i++;
      const entryKey = clean(text.slice(keyStart, i));
      if (text[i] !== ",") { skipped++; continue; }
      i++;
      const fields = {}; let valid = true;
      while (i < text.length) {
        ws(); while (text[i] === ",") { i++; ws(); }
        if (text[i] === end) { i++; break; }
        const m = /^[A-Za-z][A-Za-z0-9_-]*/.exec(text.slice(i));
        if (!m) { valid = false; while (i < text.length && text[i] !== end) i++; i++; break; }
        const key = m[0].toLowerCase(); i += key.length; ws();
        if (text[i] !== "=") { valid = false; while (i < text.length && text[i] !== end) i++; i++; break; }
        i++; fields[key] = fieldValue(); ws(); if (text[i] === ",") i++;
      }
      if (!valid) { skipped++; continue; }
      const item = record({ title: fields.title, authors: clean(fields.author).split(/\s+and\s+/i),
        year: fields.year || fields.date, date: fields.date, doi: fields.doi,
        url: fields.url, journal: fields.journal || fields.journaltitle || fields.booktitle,
        abstract: fields.abstract, id: entryKey }, file, records.length + skipped);
      if (item) records.push(item); else skipped++;
      if (records.length > 20000) throw Error("CAPES: arquivo com mais de 20.000 registros.");
    }
    return { records, skipped, format: "BibTeX" };
  }
  function parseNativeExport(input, fileName = "") {
    if (typeof input !== "string" || !input.trim() || input.length > 20000000)
      throw Error("CAPES: arquivo vazio ou maior que 20 MB.");
    const ext = String(fileName).toLowerCase().match(/\.(ris|bib|bibtex)$/)?.[1];
    const data = input.replace(/^\uFEFF/, "");
    let parsed;
    if (ext === "ris" || (!ext && /^\s*TY\s{2}-/m.test(data))) parsed = parseRis(data, fileName);
    else if (ext === "bib" || ext === "bibtex" || (!ext && /@\w+\s*[{(]/.test(data))) parsed = parseBibtex(data, fileName);
    else throw Error("CAPES: use arquivo RIS ou BibTeX exportado pelo Portal.");
    if (!parsed.records.length) throw Error("CAPES: nenhum registro bibliográfico válido encontrado.");
    // CAPES exports may have Unicode item types (e.g. @Revisão). Prevent silent loss.
    if (parsed.format === "BibTeX") {
      const headers = Array.from(data.matchAll(/^\s*@([^\s{(]+)\s*[{(]/gmu))
        .filter(m => !["comment", "string", "preamble"].includes(m[1].toLowerCase()));
      if (headers.length !== parsed.records.length + parsed.skipped) {
        throw Error("CAPES: inconsistência na leitura do BibTeX: " + headers.length +
          " entradas declaradas, " + parsed.records.length + " importadas, " +
          parsed.skipped + " ignoradas. Não utilize exportação parcial silenciosa.");
      }
    }
    return { ...parsed, imported: parsed.records.length };
  }
  if (globalThis.DELTA_CORE) globalThis.DELTA_CORE.parseCapesNativeExport = parseNativeExport;
})();


// Browser-page CAPES collector: only reads metadata already rendered in the user's page.
// No CAPES API calls, authentication interception, credential handling or restricted PDFs.
(() => {
  "use strict";
  const core = globalThis.DELTA_CORE;
  if (!core) return;
  const clean = core.clean;
  const hash = input => {
    let n=2166136261; const str=String(input);
    for(let i=0;i<str.length;i++)n=Math.imul(n^str.charCodeAt(i),16777619);
    return (n>>>0).toString(16).padStart(8,"0");
  };
  const unique = items => [...new Set(items)];
  const field = (node,selectors) => {
    for(const selector of selectors){
      const target=node.querySelector?.(selector);
      const value=clean(target?.textContent);
      if(value)return value;
    }
    return "";
  };
  const validLink = (value,origin) => {
    if(!value)return "";
    try{
      const parsed=new URL(value,origin);
      if(!["http:","https:"].includes(parsed.protocol)||parsed.username||parsed.password)return "";
      if(/^(?:#|javascript:)/i.test(value))return "";
      return parsed.href;
    }catch{return "";}
  };
  function parseCapesPage(doc, origin="https://www.periodicos.capes.gov.br/") {
    const root=doc.querySelector?.("main,[role='main'],#content,.main-content")||doc.body||doc;
    const selectors=[
      ".result-busca",
      "[class*='result-busca' i]",
      "[data-testid*='result' i]",
      "[class*='search-result' i]",
      "[class*='result-item' i]",
      "[class*='result-card' i]",
      "[class*='item-resultado' i]",
      "[class*='resultado-busca' i]",
      "[class*='searchResult']",
      ".resultados article",
      ".results article",
      ".results-list > li",
      "article"
    ];
    const candidates=[];
    const found=new Set();
    for(const selector of selectors) {
      for(const node of Array.from(root.querySelectorAll?.(selector)||[])){
        if(found.has(node)||node.id==="delta-research-collector-root"||node.closest?.("#delta-research-collector-root"))continue;
        found.add(node);
        candidates.push(node);
      }
    }
    // CAPES templates may have titles without standardized card classes.
    // These heading fallbacks still require a result-like parent and supporting metadata.
    if(!candidates.length){
      for(const heading of Array.from(root.querySelectorAll?.("h2,h3,h4")||[])){
        const parent=heading.closest?.("article,li,[class*='card' i],[class*='result' i]");
        if(parent&&!found.has(parent)){found.add(parent);candidates.push(parent);}
      }
    }
    const records=[],seen=new Set();
    for(const node of candidates){
      const txt=clean(node.textContent);
      if(!txt||txt.length>12000)continue;
      // CAPES 2026 (verified diagnostic): .result-busca contains a numbered
      // bibliographic title but no h2/h3 or article wrapper. Select a title
      // *within each card*, never infer it from the entire card text (which
      // also includes authors, abstract and action labels).
      const titleSelector=[
        "[data-testid*='title' i]", "[class*='article-title' i]",
        "[class*='result-title' i]", "[class*='item-title' i]",
        "[class*='titulo' i]", "[class*='title' i]",
        "[itemprop='name']", "[role='heading']",
        "h2", "h3", "h4", "a[href]", "strong", "b", "p", "span", "div"
      ].join(",");
      const possibleTitleNodes=Array.from(node.querySelectorAll?.(titleSelector)||[]);
      let bestTitle=null, bestScore=-1;
      for(const el of possibleTitleNodes){
        const raw=clean(el.textContent);
        const titleCandidate=raw.replace(/^\d{1,6}\.\s+/, "");
        if(titleCandidate.length<12||titleCandidate.length>450)continue;
        if(/^(?:artigo|revis[aã]o|carta|editorial|resumo|acesso aberto|revisado por pares|baixar|acessar|exportar|detalhes|doi|autores?|t[oó]picos?)(?:\s|$)/i.test(titleCandidate))continue;
        const type=String(el.tagName||"").toUpperCase();
        const cls=String(el.className||"");
        const isTitle=/titul|title|heading|nome.*artigo/i.test(cls)||
          el.getAttribute?.("itemprop")==="name"||el.getAttribute?.("role")==="heading"||
          /^H[2-4]$/.test(type);
        const isNumbered=/^\d{1,6}\.\s+\S/.test(raw);
        const isLink=type==="A"&&Boolean(el.getAttribute?.("href"));
        if(["P","SPAN","DIV"].includes(type)&&!isNumbered&&!isTitle)continue;
        const score=(isTitle?8:0)+(isNumbered?6:0)+(isLink?3:0)+
          (titleCandidate.length>=25&&titleCandidate.length<=250?1:0);
        if(score>bestScore){bestTitle=el;bestScore=score;}
      }
      const titleNode=bestTitle;
      const title=clean(bestTitle?.textContent).replace(/^\d{1,6}\.\s+/, "");
      // No title means no record. Never substitute a whole-card text guess.
      
      if(title.length<12||title.length>450||/^(?:\d+\s+)?(?:resultados?|filtros?|buscar|exportar|ordenar|selecionar tudo|próxim[ao] página)$/i.test(title))continue;
      // Prefer a DOI hyperlink over concatenated textContent. The latter
      // can glue a DOI to "Google" or another adjacent link label.
      const doiLinks=Array.from(node.querySelectorAll?.('a[href*="doi.org/"]')||[]);
      const doiFromLink=doiLinks.map(a=>core.normalizeDoi(a.getAttribute?.("href")||""))
        .find(d=>/^10\.\d{4,9}\/\S+$/i.test(d))||"";
      const doiMatch=txt.match(/\b10\.\d{4,9}\/[^\s<>"'()[\]]+/i);
      const doiFromText=core.normalizeDoi(doiMatch?.[0]||"");
      const ambiguousSuffix=/(?:google|scholar|crossref|resumo|abstract|acesso|detalhes)$/i;
      const reliableDoi=doiFromLink||(
        /^10\.\d{4,9}\/\S+$/i.test(doiFromText)&&!ambiguousSuffix.test(doiFromText)
        ?doiFromText:"");
      const titleLink=titleNode?.getAttribute?.("href") ||
        titleNode?.querySelector?.("a[href]")?.getAttribute?.("href") ||
        node.querySelector?.("a[href*='doi.org/'],a[href*='/acervo/']")?.getAttribute?.("href") || "";
      const article_url=validLink(titleLink,origin)||(reliableDoi?"https://doi.org/"+reliableDoi:"");
      // CAPES uses <p class="text-down-01">2021 - Publisher | Journal</p>.
      // Do not take the first four-digit number from the whole card:
      // snippets frequently mention older years unrelated to publication.
      const publicationLines=Array.from(node.querySelectorAll?.("p.text-down-01")||[])
        .map(el=>clean(el.textContent));
      const publicationLine=publicationLines.find(line=>/^(?:19|20)\d{2}\s*-\s*/.test(line))||"";
      const pubMatch=publicationLine.match(/^((?:19|20)\d{2})\s*-\s*(.*)$/);
      const year=pubMatch?.[1]||"";
      const journal=pubMatch?.[2]?.includes("|")?
        clean(pubMatch[2].split("|").slice(1).join("|")):
        field(node,["[class*='journal' i]","[class*='periodico' i]","[class*='revista' i]"]);
      // Multiple CAPES author links are present, although the interface may
      // show an abbreviated subset. Retain all visible linked authors only.
      const linkedAuthors=Array.from(node.querySelectorAll?.("a.view-autor")||[])
        .map(el=>clean(el.textContent)).filter(Boolean);
      const authors=(linkedAuthors.length?Array.from(new Set(linkedAuthors)):
        field(node,["[class*='author' i]","[class*='autor' i]","[data-testid*='author' i]"])
          .split(/\s*;\s*|\s+\band\b\s+|\s+\be\b\s+/i).map(clean).filter(Boolean)).slice(0,45);
      // Search-result snippets are NOT full article abstracts.
      const abstract="";
      const idFromElement=node.getAttribute?.("data-id")||node.getAttribute?.("data-record-id")||"";
      const identifier=reliableDoi||clean(idFromElement)||(article_url && article_url!==origin?article_url:"")||
        "page:"+hash([title.toLocaleLowerCase(),year,authors[0]||""].join("|"));
      const dedupKey=reliableDoi?"doi:"+reliableDoi:"id:"+identifier;
      if(seen.has(dedupKey))continue;seen.add(dedupKey);
      records.push({
        source:"Portal CAPES",identifier,title,authors,year,date:"",doi:reliableDoi,abstract,article_url,pdf_url:"",journal,
        access_status:"unknown",
        access_evidence:"CAPES: metadados da listagem; autores podem ser abreviados; resumo não obtido; acesso completo não verificado",
        access_url:"",sources:["Portal CAPES"]
      });
    }
    // Count is an unverified UI claim until compared to the extracted record IDs.
    const text=clean(root.textContent).slice(0,12000);
    const matches=[...text.matchAll(/\b(\d{1,3}(?:[.\s]\d{3})+|\d+)\s+resultados\b/gi)]
      .map(x=>Number(x[1].replace(/[.\s]/g,""))).filter(x=>Number.isSafeInteger(x)&&x>=0);
    // Actual CAPES 2026 pagination: "1–100 de 456 itens".
    const pagers=Array.from(doc.querySelectorAll?.("nav.br-pagination,.pagination-information")||[]);
    for(const pager of pagers){
      const label=clean(pager.textContent);
      const m=label.match(/\b\d+\s*[-–—]\s*\d+\s+de\s+([\d.\s]+)\s+itens\b/i);
      if(m)matches.push(Number(m[1].replace(/[.\s]/g,"")));
    }
    const total=matches.filter(x=>Number.isSafeInteger(x)&&x>=0).length
      ?Math.max(...matches.filter(x=>Number.isSafeInteger(x)&&x>=0)):null;
    const pageRange=Array.from(pagers).map(pager=>
      clean(pager.textContent).match(/\b([\d.]+)\s*[-–—]\s*([\d.]+)\s+de\s+([\d.]+)\s+itens\b/i)
    ).find(Boolean);
    const visibleRange=pageRange?{
      start:Number(pageRange[1].replace(/\./g,"")),
      end:Number(pageRange[2].replace(/\./g,"")),
      total:Number(pageRange[3].replace(/\./g,""))
    }:null;
    return {records,total,candidates:candidates.length,visibleRange,mode:"visible_page_dom"};
  }
  function findCapesNextPage(doc) {
    const scopes=Array.from(doc.querySelectorAll?.(
      "nav[aria-label*='pagin' i], [role='navigation'][aria-label*='pagin' i], .pagination, [class*='pagin' i]"
    )||[]);
    for(const scope of scopes){
      const controls=Array.from(scope.querySelectorAll?.("a,button,[role='button']")||[]);
      const usable=el=>!el.disabled&&el.getAttribute?.("aria-disabled")!=="true"&&
        !/\bdisabled\b/i.test(el.className||"")&&!el.hasAttribute?.("disabled");
      for(const el of controls){
        if(!usable(el))continue;
        const label=clean([el.textContent,el.getAttribute?.("aria-label"),el.getAttribute?.("title"),el.getAttribute?.("rel")].join(" "));
        if(/(?:pr[oó]xim[ao]|next|seguinte|avançar|chevron-right)/i.test(label)||/^(?:>|»|→)$/.test(label))
          return el;
      }
      const selected=controls.find(el=>el.getAttribute?.("aria-current")==="page"||/\bactive\b/i.test(el.className||""));
      const current=Number(clean(selected?.textContent));
      if(Number.isSafeInteger(current)&&current>0){
        const next=controls.find(el=>usable(el)&&clean(el.textContent)===String(current+1));
        if(next)return next;
      }
    }
    // CAPES GovBR br-pagination: the right arrow has an icon but no text.
    // Scope selection to the pagination widget, never arbitrary page buttons.
    for(const scope of scopes){
      const arrowGroup=scope.querySelector?.(".pagination-arrows");
      if(!arrowGroup)continue;
      const arrows=Array.from(arrowGroup.querySelectorAll?.("button,a,[role='button']")||[]);
      const enabled=el=>!el.disabled&&!el.hasAttribute?.("disabled")&&
        el.getAttribute?.("aria-disabled")!=="true"&&
        !/\bdisabled\b/i.test(String(el.className||""));
      // First try direction-bearing aria-labels/icons.
      const right=arrows.find(el=>enabled(el)&&
        /next|pr[oó]xim|avanç|angle-right|chevron-right|arrow-right/i.test(
          [el.getAttribute?.("aria-label"),el.getAttribute?.("title"),
           String(el.className||""),el.querySelector?.("i,svg")?.className?.baseVal||
           el.querySelector?.("i,svg")?.getAttribute?.("class")].join(" ")));
      if(right)return right;
      // Two controls in the verified .pagination-arrows group: left and right.
      // If there are more controls, do not guess.
      if(arrows.length===2&&enabled(arrows[1]))return arrows[1];
    }
    // The "Página 1 2 3 4 5" control may be a <select>.
    for(const scope of scopes){
      const chooser=scope.querySelector?.(".pagination-go-to-page select");
      if(!chooser||chooser.disabled)continue;
      const opts=Array.from(chooser.options||[]);
      const idx=opts.findIndex(o=>o.selected);
      if(idx>=0&&idx<opts.length-1)return chooser;
    }
    return null;
  }
  // A search may be opened on its last page (e.g. page=4&num=30).
  // Normalize only pagination; preserve the complete search expression, filters,
  // source and sort parameters. No undocumented CAPES API is used.
  function capesPageUrl(href,page) {
    const u=new URL(href);
    if(core.detectProvider(u.href)!=="capes"||
       !/\/acervo\/buscador\.html$/.test(u.pathname)||
       !u.searchParams.has("q"))throw Error("CAPES: endereço de busca inválido.");
    if(!Number.isSafeInteger(page)||page<1||page>200)throw Error("CAPES: página fora do intervalo.");
    u.searchParams.set("page",String(page));
    return u.href;
  }
  function capesSearchKey(href) {
    const u=new URL(capesPageUrl(href,1));
    u.searchParams.delete("page");
    u.hash="";
    u.searchParams.sort();
    return u.href;
  }
  core.capesPageUrl=capesPageUrl;
  core.capesSearchKey=capesSearchKey;
  core.parseCapesPage=parseCapesPage;
  core.findCapesNextPage=findCapesNextPage;
})();
