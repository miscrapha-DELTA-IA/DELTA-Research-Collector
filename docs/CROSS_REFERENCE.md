# DELTA Cross-Reference Engine — v0.6.1

O **Cross-Reference Engine** é um componente compartilhado por todos os adaptadores e pelos importadores CAPES e IEEE. A verificação é **posterior à coleta**, não altera os parâmetros da busca nem adiciona referências ao conjunto de resultados.

## v0.6.1 — cache persistente e continuação auditável

**Fluxo de retomada:** a primeira coleta continua limitada a 30 **novas consultas DOI**. Os demais registros não são descartados. Na seção **Biblioteca e matriz**, use **Verificar próximo lote (30 DOIs)** para consultar os próximos itens pendentes usando os dados da biblioteca local. Não é preciso refazer a busca original da CAPES ou de outras fontes. Cada continuação gera CSV completo da biblioteca e JSON de auditoria, com contagens de requisições novas, cache usado, referências verificadas e pendentes. A biblioteca precisa estar habilitada na coleta original para essa retomada.

**Cache de DOI:** `chrome.storage.local` armazena somente DOI e metadados bibliográficos essenciais do Crossref/DataCite; não guarda cookies, login institucional, título da pesquisa nem PDFs. Um resultado com metadados válidos tem validade de **30 dias**; um DOI não encontrado em ambos os registradores, **3 dias**; erros HTTP/rede não são armazenados. O cache tem limite de **1.200 DOIs** e pode ser apagado em **Gerenciar dados locais → Limpar cache de DOI**, sem eliminar a biblioteca.

**Precisão:** diferenças de `&amp;`/`&`, capitalização e pontuação podem ser classificadas como `cosmetic_differences`. Divergências de um ano plausíveis para publicação online/impressa ficam em `review_differences`, não são corrigidas automaticamente. Diferenças substanciais continuam em `suggested` ou `conflicts`, conforme o critério de identidade.

**Busca assistida para referências sem DOI:** há um botão separado **Candidatos sem DOI (revisão humana)**. Com consentimento explícito via clique, até 5 títulos da biblioteca são consultados no Crossref (`query.bibliographic`), com no máximo 3 candidatos por título. O relatório JSON inclui DOI candidato, título, autoria, ano, similaridade de título e indicadores de divergência. Todos são marcados `UNVERIFIED_CANDIDATE_DO_NOT_AUTO_ASSIGN`; a extensão **não** modifica os registros, não preenche DOI automaticamente e não adiciona nenhum novo estudo. Confirmar identidade é tarefa humana, preferencialmente junto ao artigo publicado/editor.

**Limite operacional:** a retoma funciona em lotes de até 2.000 referências elegíveis por clique, com no máximo 30 consultas novas. Não executa monitoramento automático em segundo plano; cabe ao usuário iniciar cada lote. O cache e a biblioteca são locais à instalação da extensão.

## Limitações futuras

- O mecanismo ainda não prova coincidência independente entre registradores; não incorpora texto completo ou resumos externos e não atribui DOI automaticamente por título.
- Correspondências previamente registradas podem requerer revisão posterior; o cache expirado evita reutilização de respostas antigas quando um DOI é efetivamente reconsultado.
- Ainda faltam testes E2E em sessões reais com todos os provedores, comparação amostral contra fontes oficiais e painel de revisão/aceite humanamente controlado.
- A correspondência de 118/118 artigos na CAPES permanece uma verificação **de contagem**, distinta da integridade individual dos metadados.

---

## Fluxo implementado

1. Coletar da fonte original, com sua URL e filtros.
2. Caso a opção **Verificação cruzada por DOI** esteja ativada (marcada por padrão), enviar ao registrador somente os DOIs dos trabalhos selecionados. Há orçamento de **30 consultas DOI novas por execução**, com retomada manual e cache; consultas idênticas são reutilizadas na aba.
3. Consultar **Crossref** por DOI exato; se o DOI não estiver registrado ali (404), tentar **DataCite**. Esses serviços são **registradores alternativos**, não duas confirmações independentes.
4. Confirmar DOI, comparar título normalizado (limiar estrito 0,92), verificar divergência superior a um ano e incompatibilidade de autores. Divergências bloqueiam qualquer preenchimento automático.
5. Só preencher campos **originalmente vazios**: ano, data, periódico e autores. Jamais substituir título, DOI, autores existentes ou outros metadados da fonte sem revisão. **Resumos de provedores externos não são copiados automaticamente**, por cautela com direitos de reutilização.
6. Guardar `xref.original` (metadados obtidos da fonte), `xref.field_provenance` (URL oficial, data, ação por campo), `xref.suggested` (valores diferentes, não aplicados), status e conflitos. CSV e JSON preservam os detalhes; RIS/BibTeX levam nota resumida.
7. Exportar a biblioteca com a mesma quantidade de registros da busca. Ausência de DOI **não autoriza correspondência por título**, e registros não consultados permanecem `not_checked_budget`.

## Status

| Status | Interpretação |
|---|---|
| `registry_match` | DOI exato e metadados básicos compatíveis com um registrador |
| `conflict` | DOI, título, data ou autoria incompatível; não altera o registro |
| `missing_or_invalid_doi` | Não é seguro verificar por DOI; sem busca difusa automática |
| `not_found` | O DOI não foi localizado nos dois registradores consultados |
| `lookup_error` | Falha de conexão, limite de requisições ou resposta inválida |
| `not_checked_budget` | Não consultado porque o limite por operação foi atingido |
| `cancelled` | Verificação interrompida, com dados originais preservados |

**Importante:** `registry_match` NÃO significa confirmação por fontes independentes, validação de artigo completo, verificação de pertinência à estratégia nem certeza absoluta. O OpenAlex pode integrar metadados de outras fontes e não deve ser contado como confirmação independente sem verificar a origem do registro.

## Integridade, privacidade e performance

- Os DOIs dos registros selecionados são enviados a Crossref ou DataCite **somente quando a opção estiver ativa**. É possível desmarcá-la antes de coletar/importar.
- Não envia consultas privadas, cookies CAFe, PDFs protegidos ou credenciais às APIs de enriquecimento.
- Máximo de 30 consultas DOI novas por execução; duas requisições concorrentes, com pausa entre lotes.
- Resultados não obtidos por limite, falha ou ausência de DOI ficam explicitamente identificados. O status da *cobertura da busca* é calculado separadamente e não é alterado pelo enriquecimento.
- O `xref.original` preserva a visão original do registro e deve ser mantido mesmo em futuras revisões humanas.
- Um registrador bibliográfico pode ter erros, dados incompletos, obras retificadas ou versões distintas. O motor é conservador e não faz reconciliação probabilística automática.

## Próximas etapas

1. Processamento independente da exportação, com fila de retomada automática configurável e limites por provedor.
2. Verificação de ISBN/PMID/arXiv e relações de versão, com regras específicas.
3. Evidências independentes quando realmente disponíveis, sem contar cópias do mesmo registro como consenso.
4. Revisão humana de conflitos; comparação por amostra contra exportação oficial e testes E2E no navegador com múltiplas bases.
5. Auditoria de precisão de correspondências e taxa de falsos positivos antes de ampliar o limite de consultas.

A versão 0.6.0 inicia o núcleo de integridade bibliográfica; não é uma certificação científica de cada metadado.
