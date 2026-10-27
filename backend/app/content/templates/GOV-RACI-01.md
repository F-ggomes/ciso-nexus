---
kind: guideline
code: GOV-RACI-01
title: Matriz Integrada de Responsabilidades e Governação de Segurança (RACI SGSI / DPO / CISO)
language: pt-PT
---
# Matriz Integrada de Responsabilidades e Governação de Segurança (RACI SGSI / DPO / CISO)

| Código | GOV-RACI-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir com total clareza a atribuição de papéis e responsabilidades para todos os processos e atividades de segurança da informação, privacidade e resiliência operacional em {{ORG}}, eliminando ambiguidades operacionais, de acordo com o controlo 5.3 da ISO/IEC 27002:2022.

## 2. Definições da Metodologia RACI
- **R (Responsible / Responsável pela Execução):** A função que realiza a atividade prática ou desenvolve o trabalho.
- **A (Accountable / Aprovador / Responsável Último):** A função que detém o poder de decisão final (apenas um 'A' por atividade).
- **C (Consulted / Consultado):** As funções especializadas que prestam aconselhamento e parecer prévio.
- **I (Informed / Informado):** As funções que são formalmente notificadas das decisões ou do progresso da ação.

## 3. Matriz Integrada de Governação (Processos Nucleares)
| Atividade / Processo de Segurança | Norma / Referência | Administração | CISO | DPO | Gestor TI / DevOps | Colaboradores |
|---|---|---|---|---|---|---|
| Definição e aprovação da Política de Segurança (POL-01) | ISO 27001 Cl. 5.2 | **A** | R | C | C | I |
| Condução da Avaliação de Riscos de Segurança (RISK-MET-01) | ISO 27001 Cl. 6.1 | I | **A/R** | C | C | I |
| Aprovação formal do Apetite ao Risco e Riscos Residuais | ISO 27001 Cl. 6.1 | **A** | R | C | I | I |
| Gestão de Controlo de Acessos e Perfis de Utilizador | ISO 27002 5.15 | I | A | I | **R** | I |
| Realização de Avaliação de Impacto na Privacidade (AIPD/DPIA) | RGPD Art. 35 | I | C | **A/R** | C | I |
| Notificação de Violação de Dados à CNPD / APD | RGPD Art. 33 | I | C | **A/R** | I | I |
| Gestão e Resposta a Incidentes de Cibersegurança (CSIRT) | DORA Art. 17 / NIS2 | I | **A/R** | C | R | I |
| Notificação de Incidentes TIC às Autoridades Regulatórias | DORA Art. 19 / NIS2 | I | **A/R** | C | I | I |
| Due Diligence e Avaliação de Fornecedores TIC (TPRM) | DORA Art. 28 | I | **A** | C | R | I |
| Execução de Cópias de Segurança e Testes de Restauro | ISO 27002 8.13 | I | A | I | **R** | I |
| Gestão de Vulnerabilidades e Aplicação de Patches | ISO 27002 8.8 | I | A | I | **R** | I |
| Programa Anual de Auditoria Interna ao SGSI | ISO 27001 Cl. 9.2 | **A** | R | C | I | I |
| Revisão Anual pela Gestão de Topo | ISO 27001 Cl. 9.3 | **A** | R | C | I | I |
| Formação e Consciencialização em Cibersegurança | NIS2 / ISO 27002 6.3 | I | **A/R** | C | I | R |

## 4. Matriz de Requisitos
| Requisito de Governação | Secção da Matriz |
|---|---|
{{REQUIREMENT_MATRIX}}
