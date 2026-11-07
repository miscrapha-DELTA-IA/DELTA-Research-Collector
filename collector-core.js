/* DELTA Research Collector, v0.3.0. GPL-3.0-or-later. */
(() => {
  "use strict";
  const fields = ["source", "identifier", "title", "authors", "year", "date", "doi", "abstract", "article_url", "pdf_url", "journal", "search_url", "collected_at", "sources"];

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
      records.map(r => fields.map(k => csvCell(Array.isArray(r[k]) ? r[k].join("; ") : r[k])).join(",")).join("\r\n") + "\r\n";
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
        note: [r.pdf_url ? `PDF: ${r.pdf_url}` : "",(r.sources||[]).length?`Fontes: ${r.sources.join(", ")}`:""].filter(Boolean).join("; "),
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
        abstract, article_url: `https://arxiv.org/abs/${id}`, pdf_url: pdfUrl, journal: ""
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
          pdf_url: pdf, journal: stripHtml(r.journalInfo?.journal?.title || r.journalTitle)
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
        journal:clean(r.primary_location?.source?.display_name)
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
        pdf_url:r.openAccessPdf?.url || '', journal:clean(r.journal?.name)
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
      lines.push(`N1  - DELTA Research Collector; fontes: ${(r.sources||[r.source]).join(', ')}`);
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
        article_url:url||(r.id?`https://doaj.org/article/${r.id}`:''),pdf_url:pdf,journal:clean(b.journal?.title)};
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
      pdf_url:'',journal:'Preprint'
    })).filter(r=>r.identifier&&r.title)};
  }
  function matchesTerm(record,term) {
    const needle=clean(term).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(!needle)return true;
    return clean(`${record.title} ${record.abstract}`).toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(needle);
  }
  function detectProvider(href) {
    const u = new URL(href);
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
    buildDoajUrl,parseDoaj,buildSciELOUrl,parseSciELO,buildPreprintUrl,parsePreprint,matchesTerm };
})();
