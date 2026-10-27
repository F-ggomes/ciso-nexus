---
kind: procedure
code: AUD-PRC-01
title: Procedimento de Gestão de Auditorias Internas e Não-Conformidades
language: pt-PT
---
# Procedimento de Gestão de Auditorias Internas e Não-Conformidades

| Código | AUD-PRC-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir o procedimento operacional passo-a-passo para o planeamento detalhado, execução em campo, comunicação de resultados e encerramento de auditorias internas ao SGSI de {{ORG}}, bem como a gestão eficaz de ações corretivas decorrentes de não-conformidades identificadas (Cláusulas 9.2 e 10.2 da ISO/IEC 27001:2022).

## 2. As Fases da Auditoria Interna
### Fase 1: Preparação e Plano Individual de Auditoria
Com 2 semanas de antecedência, o Auditor Líder:
- Elabora o Plano de Auditoria específico contendo objetivos, âmbito detalhado, critérios, calendário de reuniões e amostragem documental;
- Envia o plano aos auditados (process owners) para confirmação de disponibilidade de interlocutores.

### Fase 2: Execução da Auditoria (Trabalho de Campo)
1. **Reunião de Abertura:** Apresentação da equipa, confirmação do âmbito e esclarecimento de dúvidas;
2. **Recolha de Evidências:** Entrevistas com colaboradores, observação direta de atividades, recolha de amostras de configurações e evidências no CISO Nexus;
3. **Reunião de Encerramento:** Apresentação sumária das constatações preliminares antes da elaboração do relatório final.

### Fase 3: Classificação das Constatações
| Categoria | Definição | Prazo Máximo de Ação Corretiva |
|---|---|---|
| **Não-Conformidade Maior** | Ausência total ou quebra sistémica de um requisito normativo ou legal com risco grave e imediato para a segurança da informação. | **Até 30 dias** (exige validação prévia de contenção em 5 dias) |
| **Não-Conformidade Menor** | Falha pontual ou isolada na aplicação de um controlo sem comprometer a eficácia global do sistema. | **Até 60 dias** |
| **Oportunidade de Melhoria** | Situação em conformidade formal, mas onde se identifica potencial de aperfeiçoamento preventivo. | Revisão no ciclo seguinte |

### Fase 4: Análise de Causa-Raiz e Ações Corretivas
Para cada não-conformidade, o auditado deve:
1. Realizar análise de causa-raiz formal utilizando a metodologia dos **5 Porquês** ou diagrama de Ishikawa;
2. Registar o Plano de Ação Corretiva (CAPA) com Dono e data de conclusão;
3. O auditor reavalia e encerra formalmente a não-conformidade apenas após comprovação da eficácia da medida corretiva implementada.

## 3. Matriz de Requisitos
| Requisito ISO 27001 | Passo Operacional |
|---|---|
{{REQUIREMENT_MATRIX}}
