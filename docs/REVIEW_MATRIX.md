# DELTA — Matriz visual, triagem e auditoria de cobertura (v0.5.0)

## Objetivo

A matriz visual é um **relatório HTML local e interativo** que acompanha os formatos bibliográficos convencionais. O foco é reduzir a carga cognitiva da triagem manual; não é um substituto de plataformas de revisão sistemática validadas.

## Fluxo de trabalho recomendado

1. Registre a busca completa na base, os filtros, a data e o total exibido.
2. Faça a coleta usando o adaptador da extensão. Quando existir exportação oficial da base, prefira importar os dados oficiais; para IEEE Xplore, use **Export Results → CSV** e a função de importação do DELTA.
3. Informe o total da base no campo **Auditoria de cobertura**. Se a API retornar uma contagem, o DELTA registra também a contagem reportada pelo provedor.
4. Escolha **Matriz visual interativa (HTML)** no campo Formato. A extensão exportará a matriz e o arquivo `*_estrategia.json`.
5. Abra a matriz no navegador. Pesquise título, autor, DOI ou resumo; filtre por fonte, acesso e decisão; marque **Incluir / Excluir / Dúvida**; adicione motivo e notas.
6. Exporte **CSV anotado** para uma planilha ou **JSON de decisões** para retomar a triagem. A matriz não envia informações ao servidor DELTA.
7. Arquive os dados originais, o manifesto de estratégia, os arquivos de decisão e as eventuais justificativas de ajustes manuais.

## O que os indicadores significam

| Indicador | Interpretação | Não significa |
|---|---|---|
| Contagem correspondente | Quantidade exportada igual à quantidade informada/retornada | Identidade dos artigos, ordenação ou filtros |
| Abaixo do total | Menos registros exportados que o total de referência | Motivo definitivo da perda |
| Parcial/interrompida | Limite, cancelamento, falha ou modo página visível | Uma pesquisa exaustiva |
| Total não verificado | Não há denominador auditável | Que todos os artigos foram obtidos |
| Acesso aberto | Evidência de cópia aberta indicada por plataforma/índice | Disponibilidade garantida no momento do acesso |
| Sem cópia OA localizada | Índice consultado não identificou localização aberta | Paywall confirmado |

## Limites e fidelidade metodológica

**O DELTA não comprova equivalência do conjunto de resultados.** A nova auditoria documenta:

- URL de pesquisa e expressão capturada;
- parâmetros e chaves de filtros presentes na URL;
- método de recuperação (API, leitura da página, CSV oficial etc.);
- quantidade pedida, quantidade exportada e total exibido (quando informado);
- cobertura numérica, eventuais falhas, cancelamentos e limites;
- estado de reprodução da busca por provedor.

Isso reduz erros de relato, mas **não elimina divergências** de indexação, filtros gerados por JavaScript, atualizações temporais da base, ordenação, limite de API, duplicatas ou diferenças entre páginas e endpoints.

Para minimizar perdas e viés:

- use a **exportação oficial** da base quando disponível;
- registre expressões e filtros manualmente quando não são recuperados da URL;
- divida buscas muito grandes por período/categoria e confira a ausência de sobreposição ou lacunas;
- confronte totais e, quando possível, **identificadores (DOI/PMID/ID arXiv)** com a fonte;
- trate resultados em fontes distintas como conjuntos distintos até a deduplicação;
- faça uma revisão humana de amostras e documente diferenças.

**Observação sobre IEEE:** o botão da página captura somente cartões carregados; o CSV oficial permite maior cobertura, mas a completude continua condicionada ao conteúdo exportado pelo próprio IEEE.

## Privacidade e segurança

- A matriz HTML é gerada no dispositivo e não carrega bibliotecas externas.
- Os textos dos artigos são inseridos como texto, não como HTML executável.
- O estado de triagem é mantido em memória da página e deve ser **exportado antes de fechar**. Arquivos locais podem não ter persistência confiável.
- O arquivo JSON de decisões pode ser reimportado; os registros são associados por DOI ou por fonte e identificador. Sempre confirme a correspondência.
- Dados bibliográficos podem conter termos sensíveis. Não publique histórico ou arquivos de triagem sem inspeção.
- Notas e títulos que se iniciam por símbolos de fórmula recebem tratamento de segurança ao serem exportados para CSV.

## Funcionalidades ainda não existentes

O DELTA **não** faz, nesta versão, comparação automatizada de conjuntos completos entre APIs e interfaces para todas as bases, detecção confiável de paywall em tempo real, co-triagem multiusuário, extração automática de critérios PICO, nem certificação PRISMA. Essas funções precisam de validação e implementações independentes.
