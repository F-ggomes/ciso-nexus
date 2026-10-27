---
kind: plan
code: DORA-TEST-01
title: Programa de Testes de Resiliência Operacional Digital e TLPT (DORA Art. 24 a 27)
language: pt-PT
---
# Programa de Testes de Resiliência Operacional Digital e TLPT (DORA Art. 24 a 27)

| Código | DORA-TEST-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo e Enquadramento
Estabelecer o programa plurianual abrangente de testes de resiliência operacional digital de {{ORG}}, com o objetivo de avaliar a capacidade de prevenção, deteção, contenção e recuperação face a incidentes de segurança de TIC, em estrito cumprimento dos Artigos 24.º a 27.º do Regulamento (UE) 2022/2554 (DORA).

## 2. Tipologia de Testes e Frequência Obrigatória
| Tipo de Teste | Metodologia e Ferramentas | Frequência Mínima | Responsável |
|---|---|---|---|
| **Verificação de Vulnerabilidades Técnicas** | Scanners automatizados internos e externos (EASM), auditoria de configurações de infraestrutura e cloud. | Mensal / Contínua | Equipa de Segurança / SOC |
| **Análise de Código-Fonte e Dependências** | SAST, DAST e SCA integrados no pipeline CI/CD de desenvolvimento de software. | A cada alteração de código (Commit / PR) | DevSecOps |
| **Testes de Penetração Convencionais (Pentest)** | Testes de intrusão externos e internos baseados em metodologias OWASP e OSSTMM. | Anual | Consultora Externa Acreditada |
| **Testes de Recuperação de Desastres (DRP)** | Simulação de indisponibilidade de centros de dados, falha de fornecedores cloud e restauro de backups. | Semestral | Gestor de Continuidade & TI |
| **Testes Avançados Guiados por Ameaças (TLPT)** | Testes Red Team / Purple Team baseados no quadro TIBER-EU cobrindo funções críticas e fornecedores TIC terceiros. | A cada 3 anos (entidades críticas) | Fornecedor Externo Certificado CREST/TIBER |

## 3. Metodologia TLPT (Threat-Led Penetration Testing)
Para testes TLPT ao abrigo do Artigo 26.º do DORA:
1. **Âmbito Alargado:** O teste deve abranger todas as funções críticas ou importantes, incluindo as infraestruturas geridas por fornecedores terceiros de TIC.
2. **Threat Intelligence:** O cenário de ataque é construído a partir de inteligência sobre ameaças reais direcionadas ao setor financeiro (MITRE ATT&CK).
3. **Cooperação de Terceiros:** Os fornecedores de serviços TIC de suporte a funções críticas participam obrigatoriamente no exercício TLPT.
4. **Validação da Autoridade Competente:** O plano do teste, a credenciação da equipa de atacantes e o sumário dos resultados são submetidos e validados pela autoridade de supervisão financeira competente.

## 4. Gestão de Constatações e Plano de Remediação
- Todas as vulnerabilidades identificadas durante os testes são registadas de imediato com respetivo nível de risco.
- A equipa técnica elabora um Plano de Ação Corretiva com prazos mandatórios:
  - Vulnerabilidades Críticas: Remediação ou compensação em até 72 horas;
  - Vulnerabilidades Altas: Remediação em até 14 dias;
  - Vulnerabilidades Médias: Remediação em até 30 dias.
- O CISO apresenta o relatório consolidado de resultados e evolução de mitigação ao Conselho de Administração e ao Comité de Auditoria.

## 5. Matriz de Requisitos
| Requisito DORA | Secção do Programa |
|---|---|
{{REQUIREMENT_MATRIX}}
