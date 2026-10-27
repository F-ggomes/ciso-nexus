---
kind: procedure
code: DEV-PRC-01
title: Procedimento de Revisão de Código, Análise SAST/DAST e Testes de Penetração
language: pt-PT
---
# Procedimento de Revisão de Código, Análise SAST/DAST e Testes de Penetração

| Código | DEV-PRC-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Estabelecer os requisitos e controlos obrigatórios no ciclo de engenharia de software para garantir que o código desenvolvido por {{ORG}} ou para clientes financeiros e empresariais cumpre os mais elevados padrões de segurança (OWASP Top 10, ASVS nível 2/3), prevenindo vulnerabilidades antes da entrada em produção.

## 2. Fases do Pipeline de Segurança em CI/CD
### Fase 1: Análise Estática de Segurança (SAST) e Linters
- A cada commit e abertura de Pull Request (PR), executam-se ferramentas de análise estática de código;
- O build é bloqueado automaticamente se forem detetadas vulnerabilidades de severidade Crítica ou Alta (ex.: injeção SQL, Cross-Site Scripting, segredos hardcoded).

### Fase 2: Análise de Composição de Software (SCA) e Dependências
- Inspeção automatizada de todas as dependências de terceiros (npm, pip, maven, nuget);
- Bloqueio imediato de bibliotecas com vulnerabilidades conhecidas (CVEs) sem patch ou com licenças de software incompatíveis com uso comercial.

### Fase 3: Revisão por Pares (Peer Code Review Obrigatório)
- Nenhum código pode ser integrado no branch principal (`main` ou `release`) sem aprovação de pelo menos um revisor sénior qualificado (regra dos quatro olhos);
- O revisor verifica expressamente autenticação, autorização granular, validação rigorosa de entradas de dados e ausência de dados confidenciais em logs.

### Fase 4: Análise Dinâmica (DAST) e Testes de Penetração
- Testes automatizados DAST em ambiente de teste ou pré-produção antes de grandes lançamentos;
- Testes de penetração manuais (Pentest) executados anualmente por entidade externa especializada para todas as aplicações críticas.

## 3. Matriz de Requisitos
| Requisito de Desenvolvimento Seguro | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}
