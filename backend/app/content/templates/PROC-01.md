---
kind: process
code: PROC-01
title: Processo de Onboarding e Offboarding de Colaboradores
language: pt-PT
---
# Processo de Onboarding e Offboarding de Colaboradores

| Código | PROC-01 | Versão | {{VERSION}} | Dono do processo | RH + CISO | Data | {{DATE}} |
|---|---|---|---|---|---|---|---|

## 1. Finalidade
Assegurar que colaboradores e prestadores recebem acessos, equipamento e formação adequados ao entrar, e que tudo é revogado e devolvido ao sair (ISO 27001:2022 A.6.1–A.6.6, A.5.11, A.5.18; NIS2 art. 21.º(2)(i)).

## 2. SIPOC
| Fornecedores | Entradas | Etapas | Saídas | Clientes |
|---|---|---|---|---|
| RH, gestor | Contrato, função, data | Verificação → contrato/NDA → conta e acessos → equipamento → formação → (saída) revogação → devolução → confirmação | Colaborador operacional / saída limpa | Colaborador, IT, CISO |

## 3. Referências
{{REQUIREMENTS}}

## 4. Fluxo
```mermaid
flowchart LR
  A[Pedido RH] --> B[Verificação de antecedentes proporcional]
  B --> C[Contrato + NDA + aceitação de políticas]
  C --> D[Criação de identidade e acessos por função]
  D --> E[Equipamento gerido (Intune) + MFA]
  E --> F[Formação de segurança nos primeiros 30 dias]
  F --> G{Saída?}
  G -- sim --> H[Revogação no próprio dia]
  H --> I[Devolução de activos e confirmação]
```

## 5. Etapas e controlos
| Etapa | Responsável | Controlo | Evidência |
|---|---|---|---|
| Verificação | RH | A.6.1 | Registo RH |
| Contrato/NDA/atestação de políticas | RH | A.6.2, A.6.6 | Documentos assinados, atestação no CISO Nexus |
| Acessos por perfil de função | IT | A.5.18, POL-02 | Ticket aprovado |
| Equipamento gerido e cifrado | IT | A.8.1, A.8.24 | Intune compliance |
| Formação inicial | CISO | A.6.3 | Certificado |
| Revogação de acessos e devolução | IT/RH | A.6.5, A.5.11 | Checklist de saída |

## 6. KPIs
| KPI | Meta |
|---|---|
| Acessos revogados no dia da saída | 100% |
| Formação concluída em 30 dias | 100% |
| Equipamentos devolvidos | 100% |

## Anexo A — Matriz requisito → etapa
{{REQUIREMENT_MATRIX}}
