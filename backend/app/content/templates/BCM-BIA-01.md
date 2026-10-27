---
kind: procedure
code: BCM-BIA-01
title: Procedimento e Metodologia de Análise de Impacto no Negócio (BIA - ISO 22317)
language: pt-PT
---
# Procedimento e Metodologia de Análise de Impacto no Negócio (BIA - ISO 22317)

| Código | BCM-BIA-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Estabelecer o processo operacional para conduzir a Análise de Impacto no Negócio (Business Impact Analysis - BIA) em {{ORG}}, quantificando e qualificando os impactos operacionais, financeiros, legais e reputacionais decorrentes da interrupção das funções de negócio, em conformidade com a ISO/TS 22317:2021 e ISO 22301:2019.

## 2. Etapas de Condução do BIA
### Etapa 1: Identificação das Funções e Serviços de Negócio
Mapeamento de todas as atividades desenvolvidas pela organização e identificação dos processos de suporte e serviços prestados a clientes.

### Etapa 2: Entrevistas de Avaliação de Impacto ao Longo do Tempo
Condução de entrevistas com os donos de processos (Process Owners) para determinar o agravamento do impacto em janelas temporais críticas:
- Primeiras 4 horas;
- 24 horas (1 dia);
- 72 horas (3 dias);
- 1 semana;
- Mais de 1 mês.

### Etapa 3: Definição de Limiares e Parâmetros de Recuperação
| Parâmetro de Continuidade | Definição Operacional | Exemplo Típico em {{ORG}} |
|---|---|---|
| **MTPD** (Maximum Tolerable Period of Disruption) | Período máximo de paragem antes de causar dano irreversível à viabilidade do negócio. | 24 horas para o Core Bancário / Plataforma de Pagamentos |
| **RTO** (Recovery Time Objective) | Meta temporal aprovada para restabelecimento do serviço após declaração de desastre. | 2 horas para processamento de transações críticas |
| **RPO** (Recovery Point Objective) | Limite máximo aceitável de perda de dados transacionais. | 15 minutos de transações |
| **MBCO** (Minimum Business Continuity Objective) | Nível mínimo aceitável de capacidade de produção durante a contingência. | 70% do volume transacional regular |

### Etapa 4: Mapeamento de Dependências Críticas
Para cada função crítica, documentar:
1. Recursos humanos chave e competências mínimas de contingência;
2. Aplicações de software, bases de dados e infraestruturas tecnológicas indispensáveis;
3. Fornecedores e prestadores de serviços terceiros críticos (cloud, telecomunicações, hosting);
4. Instalações físicas e equipamentos de trabalho essenciais.

### Etapa 5: Aprovação pela Gestão de Topo
O Relatório Consolidado de BIA é submetido à Administração para aprovação formal, servindo de base vinculativa para o desenho e dimensionamento dos planos BCP e DRP.

## 3. Matriz de Requisitos
| Requisito ISO 22301 | Secção do BIA |
|---|---|
{{REQUIREMENT_MATRIX}}
