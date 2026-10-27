---
kind: policy
code: POL-08
title: Política de Gestão de Vulnerabilidades Técnicas e Gestão de Correções (Patch Management)
language: pt-PT
---
# Política de Gestão de Vulnerabilidades Técnicas e Gestão de Correções (Patch Management)

| Código | POL-08 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Objectivo
Estabelecer os requisitos e prazos obrigatórios para a identificação, classificação, priorização e correção atempada de vulnerabilidades de segurança em sistemas operativos, bases de dados, software de rede, dependências aplicacionais e serviços cloud em {{ORG}}, segundo o controlo 8.8 da ISO/IEC 27002:2022.

## 2. Deteção Contínua e Inteligência de Ameaças
1. **Varreduras Automatizadas Internas:** Scanners autenticados executados pelo menos semanalmente em toda a infraestrutura interna e ambientes cloud.
2. **Gestão da Superfície de Ataque Externa (EASM):** Monitorização diária da superfície exposta na Internet, portas abertas, certificados e subdomínios.
3. **Catálogos de Vulnerabilidades Exploradas (CISA KEV):** Priorização prioritária e automática de qualquer vulnerabilidade listada no catálogo de vulnerabilidades conhecidas e ativamente exploradas (KEV).

## 3. Prazos Máximos de Remediação (SLAs Mandatórios)
| Nível de Severidade | Pontuação CVSS v3.1/v4.0 ou Condição Especial | Prazo Máximo de Aplicação de Correção (SLA) | Ação Alternativa Provisória (Mitigação) |
|---|---|---|---|
| **Crítico (P1)** | CVSS 9.0 - 10.0 OU presença no catálogo CISA KEV | **Até 72 horas** | Isolamento de rede ou regra WAF em até 12 horas |
| **Alto (P2)** | CVSS 7.0 - 8.9 | **Até 14 dias úteis** | Restrição de acessos e monitorização SOC reforçada |
| **Médio (P3)** | CVSS 4.0 - 6.9 | **Até 30 dias de calendário** | Aplicação no ciclo regular de manutenção |
| **Baixo (P4)** | CVSS 0.1 - 3.9 | **Até 90 dias de calendário** | Atualização em versões regulares de software |

## 4. Processo de Testes e Autorização de Exceções
- Antes da entrada em produção, qualquer patch deve ser testado em ambiente de pré-produção/staging para validar estabilidade operacional.
- Caso uma correção não possa ser aplicada no prazo estabelecido por razões de incompatibilidade operacional crítica, deve ser solicitada uma **Exceção de Segurança Formal** no CISO Nexus, fundamentada tecnicamente, com controlos compensatórios e aprovada pelo CISO por prazo máximo de 60 dias.

## 5. Matriz de Requisitos
| Requisito ISO / DORA / NIS2 | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}
