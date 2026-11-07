<div align="center">

<img src="icons/128.png" alt="DELTA Research Collector icon" width="96">

# DELTA Research Collector

**Colete, organize e exporte resultados de pesquisas científicas diretamente do navegador.**

Extensão experimental de código aberto para **Opera GX, Chrome e Edge** (Manifest V3).

[![Versão](https://img.shields.io/badge/version-0.3.0-blue)](https://github.com/miscrapha-DELTA-IA/DELTA-Research-Collector) [![Licença GPL--3.0](https://img.shields.io/badge/license-GPL--3.0--or--later-green)](LICENSE) [![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-lightgrey)](manifest.json)

[English](README.en.md) · [Instalação](#instalação) · [Bases compatíveis](#bases-compatíveis) · [Limitações](#limitações-científicas)

</div>

## O que faz

- **Um botão na página de resultados:** exporta metadados bibliográficos em **CSV, BibTeX, RIS** (importável no Zotero) e **JSON**.
- **Dez fontes compatíveis**, com estratégias de coleta adaptadas a cada plataforma.
- **Biblioteca local unificada:** identifica DOIs repetidos entre bases e preserva as fontes originais.
- **Histórico de coletas:** guarda URL, data, origem, contagens e indicação de resultados parciais.
- **PDFs:** solicitação opcional de até 20 PDFs no arXiv. Outras bases podem fornecer links, sem download em lote.
- **Sem conta ou servidor próprio:** a biblioteca permanece no armazenamento local do navegador.

> [!IMPORTANT]
> Projeto **experimental**. A exportação não garante recuperação exaustiva nem equivalência perfeita com os filtros e o ranking da interface de cada base. Para revisões sistemáticas, registre e confira manualmente a estratégia, a data e os totais da pesquisa.

## Bases compatíveis

| Base | Coleta | Observação |
|---|---|---|
| arXiv | Resultados HTML paginados | PDFs opcionais, até 20 |
| Europe PMC | API oficial | Metadados e resumos disponíveis |
| PubMed | NCBI ESearch + EFetch | Bloqueia filtros laterais não reproduzíveis |
| OpenAlex | API oficial | Resumos quando disponíveis |
| Crossref | API oficial | Cobertura e ranking podem diferir da interface |
| Semantic Scholar | Academic Graph API | Pode limitar volume e requisições |
| DOAJ | API pública de artigos | Filtros complexos da interface não são preservados |
| SciELO | Leitura experimental do HTML | Sensível a mudanças da página/bloqueios |
| bioRxiv | API por intervalo de datas | Filtro textual local, não equivale à busca do site |
| medRxiv | API por intervalo de datas | Filtro textual local, não equivale à busca do site |

## Instalação

**Opera GX** (procedimento semelhante em Chrome e Edge):

1. Baixe o [ZIP instalável v0.3.0](dist/DELTA-Research-Collector_v0.3.0_INSTALAR.zip) e extraia tudo em uma pasta permanente.
2. Abra `opera://extensions` e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta que contém `manifest.json` diretamente.
4. Se já instalou uma versão anterior, desative-a para não exibir botões duplicados.
5. Visite uma busca do [arXiv](https://arxiv.org/search/?query=bioinformatics&searchtype=all&size=50) ou [PubMed](https://pubmed.ncbi.nlm.nih.gov/?term=dengue) e atualize a página.
6. Use **BAIXAR BUSCA** para exportação rápida ou a **engrenagem** para escolher formato, limite e biblioteca.

**Desenvolvimento:** é possível carregar **a raiz deste repositório diretamente** como extensão descompactada, sem precisar do ZIP.

## Biblioteca e Zotero

- A biblioteca local é limitada a **12.000 registros únicos**; o histórico mantém as **últimas 80 coletas**.
- A deduplicação utiliza **DOI normalizado**; sem DOI, usa a combinação **fonte + identificador**. Títulos parecidos não são fundidos automaticamente.
- A exportação **RIS/BibTeX** é compatível com a função de importação do Zotero, mas **não sincroniza automaticamente** com uma conta Zotero.
- A biblioteca usa `chrome.storage.local`; nenhuma conta DELTA IA é necessária.

## Testes

Requer [Node.js](https://nodejs.org/) para os testes de lógica (nenhum pacote npm é necessário):

```bash
node --check collector-core.js
node --check background.js
node --check content.js
node tests/test-core.cjs
node tests/test-background.cjs
```

Os testes verificam parsers, URLs, exportação, deduplicação e armazenamento simulado. **Não substituem testes integrados com APIs reais ou uma instalação no Opera GX.**

## Limitações científicas

A ferramenta impõe limites de **50 a 2.000 registros por operação**, conforme a fonte. BioRxiv/medRxiv percorrem metadados por **datas**, e uma busca textual local pode deixar artigos de fora. Em falhas e limites de API, um arquivo pode ser **parcial**. A ferramenta não contorna login, paywalls, CAPTCHA ou restrições de acesso. Consulte [metodologia e limitações](docs/METHODOLOGY.md).

## Organização do projeto

```text
manifest.json             # Manifest V3 — carregável na raiz
content.js                # Botão flutuante e interface
background.js             # Requisições, download e armazenamento
collector-core.js         # Adaptadores, exportadores e deduplicação
icons/                    # Ícones da extensão
tests/                    # Testes de lógica e de navegador
docs/                     # Metodologia e arquitetura
dist/                     # ZIP instalável da versão estável
.github/workflows/        # Verificação automatizada
```

## Contribuição, privacidade e créditos

Leia [CONTRIBUTING.md](CONTRIBUTING.md) e [SECURITY.md](SECURITY.md) antes de enviar alterações. Este projeto foi **inspirado** no [arxivcollector](https://github.com/koenraijer/arxivcollector) de Koen Raijer (GPL-3.0); a implementação apresentada aqui é em JavaScript, voltada a extensões de navegador. Licenciado sob **GPL-3.0-or-later**; consulte [LICENSE](LICENSE).

Desenvolvido como iniciativa **DELTA IA**. Consulte o [histórico de versões](CHANGELOG.md).