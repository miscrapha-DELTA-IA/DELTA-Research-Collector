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
      const type = /^[A-Za-z]+/.exec(text.slice(i)); if (!type) continue;
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
    return { ...parsed, imported: parsed.records.length };
  }
  globalThis.DELTA_CAPES = { parseNativeExport };
})();
