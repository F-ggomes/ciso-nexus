---
kind: procedure
code: PRC-01
title: Procedimento de Gestão de Risco (ISO 27005)
language: pt-PT
---
# Procedimento de Gestão de Risco

| Código | PRC-01 | Versão | {{VERSION}} | Proprietário | CISO | Data | {{DATE}} |
|---|---|---|---|---|---|---|---|

## 1. Objectivo
Identificar, analisar, avaliar e tratar riscos de segurança da informação de forma consistente (ISO/IEC 27001:2022 cl. 6.1.2–6.1.3 e 8.2–8.3; ISO/IEC 27005:2022; DORA art. 6.º e RTS 2024/1774 quando aplicável).

## 2. Método
- Escalas de 1 a 5 para probabilidade e impacto; risco inerente = P × I (1–25).
- Apetite pelo risco (aprovado pela Administração): aceitar abaixo de {{ACCEPT_BELOW}}; escalar à Administração a partir de {{ESCALATE_AT}}.
- Risco residual calculado após eficácia dos controlos.
- Critérios de impacto: confidencialidade, integridade, disponibilidade, legal/regulatório, financeiro, reputacional, segurança de pessoas.

## 3. Referências
{{REQUIREMENTS}}

## 4. Passos
| # | Passo | Responsável | Periodicidade | Evidência |
|---|---|---|---|---|
| 1 | Estabelecer contexto e critérios (âmbito, apetite, escalas) | CISO | Anual | Âmbito do SGSI aprovado |
| 2 | Identificar activos, ameaças e vulnerabilidades (inventário, Wazuh, Azure, auditorias, incidentes, fornecedores) | Owners + CISO | Contínuo / trimestral | Inventário, vulnerabilidades |
| 3 | Analisar e avaliar (P, I, nível) — rascunho pelo agente de risco, validação pelo owner | Owners | Ao identificar | Registo de riscos |
| 4 | Decidir tratamento (mitigar, aceitar, transferir, evitar) e plano com acções, owners e prazos | Owner + CISO | Ao avaliar | Plano de tratamento (tarefas) |
| 5 | Aceitação de risco: baixo pelo owner; médio/alto pelo CISO; crítico pela Administração; validade máx. 12 meses | Conforme nível | Quando aplicável | Registo com justificação |
| 6 | Actualizar a Declaração de Aplicabilidade | CISO | Após tratamento | SoA |
| 7 | Monitorizar e rever (crítico 3 m, alto 6 m, médio/baixo 12 m) | CISO | Conforme nível | Revisões registadas |
| 8 | Reportar à Administração (heat map, top riscos, aceitações) | CISO | Trimestral | CISO brief |

## 5. Registos
Registo de riscos, plano de tratamento, SoA, actas de revisão pela gestão — no CISO Nexus.

## Anexo A — Matriz requisito → passo
{{REQUIREMENT_MATRIX}}
