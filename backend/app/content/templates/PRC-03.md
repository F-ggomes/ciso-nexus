---
kind: procedure
code: PRC-03
title: Procedimento de Resposta a Incidentes e Notificação Regulatória
language: pt-PT
---
# Procedimento de Resposta a Incidentes e Notificação Regulatória

| Código | PRC-03 | Versão | {{VERSION}} | Política-mãe | POL-06 | Proprietário | CISO |
|---|---|---|---|---|---|---|---|

## 1. Objectivo
Detectar, classificar, conter, erradicar, recuperar e reportar incidentes de segurança, cumprindo os prazos do DORA (art. 19.º e RTS 2024/1772), da NIS2/DL 125/2025, do RGPD (art. 33.º/34.º) e da Lei 22/11 (Angola).

## 2. Gatilhos
Alerta do SIEM (Wazuh/Defender) com severidade alta ou crítica; reporte de colaborador, cliente ou fornecedor; notificação de autoridade.

## 3. Referências
{{REQUIREMENTS}}

## 4. Papéis
| Papel | Responsabilidade |
|---|---|
| Handler de incidentes (SOC/IT) | Triagem, contenção, registo no CISO Nexus |
| CISO | Classificação regulatória, decisão de notificação, comunicação à Administração |
| DPO | Avaliação de violação de dados pessoais, notificação CNPD/APD e titulares |
| Jurídico | Revisão das notificações a autoridades e clientes |
| Comunicação | Comunicação externa aprovada |

## 5. Passos
| # | Passo | Responsável | Prazo | Evidência |
|---|---|---|---|---|
| 1 | Registar o incidente (data/hora de detecção, fonte, activos, descrição) | Handler | Imediato | Registo CISO Nexus |
| 2 | Triagem e severidade inicial (baixa/média/alta/crítica) | Handler | 1 h | Registo |
| 3 | Contenção (isolar sistemas, revogar credenciais, bloquear IOC) | Handler/IT | 4 h | Ticket, logs |
| 4 | Classificação regulatória com o agente de classificação e validação pelo CISO: DORA major? NIS2 significativo? Violação de dados pessoais? | CISO + DPO | 4 h após detecção | Classificação e prazos no registo |
| 5 | Notificações: DORA inicial 4 h após classificação (máx. 24 h da detecção), intermédia 72 h, final 1 mês; NIS2/DL 125/2025 alerta precoce 24 h ao CNCS, notificação 72 h, relatório final 1 mês; RGPD CNPD 72 h; Angola APD segundo Lei 22/11; BNA para instituições financeiras angolanas | CISO/DPO | Conforme prazos | Comprovativos de envio |
| 6 | Erradicação e recuperação; validação do restauro | IT | Conforme plano | Evidências |
| 7 | Comunicação a clientes afectados (contratos, DORA art. 14.º, RGPD art. 34.º) | CISO + Jurídico | Conforme contrato/lei | Comunicações |
| 8 | Fecho: causa raiz (técnica/processo/humana), lições aprendidas, acções correctivas como tarefas | CISO | 15 dias após recuperação | Relatório pós-incidente |
| 9 | Actualizar registo de riscos e controlos | CISO | 30 dias | Registo de riscos |

## 6. Critérios de classificação (resumo)
- DORA incidente grave: critério serviços críticos afectados + pelo menos dois outros (clientes/transacções, impacto reputacional, duração/indisponibilidade, dispersão geográfica, perdas de dados, impacto económico) — RTS 2024/1772.
- NIS2 incidente significativo: perturbação operacional grave ou perdas financeiras, ou danos consideráveis a terceiros.
- Violação de dados pessoais: qualquer violação de segurança que provoque destruição, perda, alteração, divulgação ou acesso não autorizado a dados pessoais.

## 7. Registos e retenção
Registo de incidentes e comunicações: 5 anos (ou prazo contratual/regulatório superior).

## 8. Métricas
| Métrica | Meta |
|---|---|
| Tempo de classificação regulatória | ≤ 4 h |
| Notificações dentro do prazo | 100% |
| MTTR incidentes críticos | ≤ 24 h |

## Anexo A — Matriz requisito → passo
{{REQUIREMENT_MATRIX}}
