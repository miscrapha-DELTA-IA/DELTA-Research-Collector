# DELTA Cross-Reference Engine — v0.6.0 (primeira etapa)

O **Cross-Reference Engine** é um componente compartilhado por todos os adaptadores e pelos importadores CAPES e IEEE. A verificação é **posterior à coleta**, não altera os parâmetros da busca nem adiciona referências ao conjunto de resultados.

## Fluxo implementado

1. Coletar da fonte original, com sua URL e filtros.
2. Caso a opção **Verificação cruzada por DOI** esteja ativada (marcada por padrão), enviar ao registrador somente os DOIs dos trabalhos selecionados. Nesta primeira etapa, há orçamento de **30 DOIs únicos por operação**; consultas idênticas são reutilizadas na aba.
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
- Máximo de 30 DOIs únicos por exportação; duas requisições concorrentes, com pausa entre lotes.
- Resultados não obtidos por limite, falha ou ausência de DOI ficam explicitamente identificados. O status da *cobertura da busca* é calculado separadamente e não é alterado pelo enriquecimento.
- O `xref.original` preserva a visão original do registro e deve ser mantido mesmo em futuras revisões humanas.
- Um registrador bibliográfico pode ter erros, dados incompletos, obras retificadas ou versões distintas. O motor é conservador e não faz reconciliação probabilística automática.

## Próximas etapas

1. Cache persistente com TTL, retomada de lotes e consulta assíncrona sem atrasar a exportação.
2. Verificação de ISBN/PMID/arXiv e relações de versão, com regras específicas.
3. Evidências independentes quando realmente disponíveis, sem contar cópias do mesmo registro como consenso.
4. Revisão humana de conflitos; comparação por amostra contra exportação oficial e testes E2E no navegador com múltiplas bases.
5. Auditoria de precisão de correspondências e taxa de falsos positivos antes de ampliar o limite de consultas.

A versão 0.6.0 inicia o núcleo de integridade bibliográfica; não é uma certificação científica de cada metadado.
