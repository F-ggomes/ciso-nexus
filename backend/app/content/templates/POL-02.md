---
kind: policy
code: POL-02
title: Política de Controlo de Acessos
language: pt-PT
---
# Política de Controlo de Acessos

| Código | POL-02 | Versão | {{VERSION}} | Proprietário | CISO | Data | {{DATE}} |
|---|---|---|---|---|---|---|---|

## 1. Objectivo
Garantir que apenas utilizadores e sistemas autorizados acedem à informação e aos serviços, segundo o menor privilégio e a necessidade de conhecer (ISO 27001:2022 A.5.15–A.5.18, A.8.2–A.8.5; NIS2 art. 21.º(2)(i)(j)).

## 2. Âmbito
Todas as identidades (colaboradores, prestadores, contas de serviço, clientes de CISO as a Service) em todos os sistemas no âmbito do SGSI, incluindo tenants cloud geridos para clientes.

## 3. Referências
{{REQUIREMENTS}}

## 4. Regras
4.1. Cada utilizador tem uma identidade única e nominal; contas partilhadas são proibidas.
4.2. O acesso é concedido por pedido aprovado pelo proprietário do activo e registado (ticket).
4.3. Autenticação multifactor é obrigatória para todos os acessos remotos, administrativos e a consolas cloud (Entra ID, AWS, GCP, Wazuh).
4.4. Privilégios administrativos são atribuídos a contas separadas, limitados no tempo (PIM/JIT quando disponível) e revistos trimestralmente.
4.5. Revisões de acessos: trimestrais para sistemas críticos, semestrais para os restantes; evidência exportada para o CISO Nexus.
4.6. Offboarding: acessos revogados no próprio dia da cessação (PROC-01).
4.7. Palavras-passe: mínimo 14 caracteres, gestor de palavras-passe corporativo, sem reutilização, bloqueio após 5 tentativas.
4.8. Contas de serviço têm owner, segredo rotativo e sem acesso interactivo.
4.9. Acessos de terceiros expiram na data de fim de contrato e são registados no registo de fornecedores.

## 5. KPIs
| KPI | Meta | Fonte |
|---|---|---|
| Contas privilegiadas sem MFA | 0 | Entra ID (conector azure) |
| Revisões de acessos concluídas no prazo | 100% | Tarefas recorrentes |
| Contas inactivas > 90 dias | 0 | Entra ID / AD |

## 6. Excepções
Ver POL-01 §8; registadas no registo de riscos.

## Anexo A — Matriz requisito → secção
{{REQUIREMENT_MATRIX}}
