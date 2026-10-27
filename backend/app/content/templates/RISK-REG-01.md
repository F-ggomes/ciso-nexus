---
kind: procedure
code: RISK-REG-01
title: Procedimento de Registo e Tratamento de Riscos de Segurança (Risk Register)
language: pt-PT
---
# Procedimento de Registo e Tratamento de Riscos de Segurança (Risk Register)

| Código | RISK-REG-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Normatizar a manutenção, atualização periódica e governação do Registo Central de Riscos de Segurança da Informação e Resiliência Operacional (Risk Register) em {{ORG}}, suportado pela plataforma CISO Nexus.

## 2. Campos Obrigatórios do Registo de Riscos
Cada risco identificado no inventário deve conter obrigatoriamente:
1. **Identificador Único:** Código no formato `RSK-AAAA-NNN`;
2. **Ativo Primário e Dono do Ativo (Asset Owner):** Sistema, base de dados ou processo afetado;
3. **Descrição da Ameaça e Vulnerabilidade:** Fator desencadeante e fraqueza explorada;
4. **Controlos Existentes:** Medidas preventivas ou detetivas atualmente em vigor;
5. **Avaliação do Risco Inerente:** Probabilidade (1-5), Impacto (1-5) e Pontuação Inerente;
6. **Decisão de Tratamento:** Mitigar, Evitar, Transferir ou Aceitar;
7. **Plano de Tratamento (Ações de Mitigação):** Descrição das medidas a implementar com respetivo Dono da Ação (Action Owner) e data limite;
8. **Avaliação do Risco Residual:** Projeção da Probabilidade e Impacto após a implementação eficaz das medidas;
9. **Estado de Implementação:** Em Análise, Em Execução, Concluído, Em Monitorização.

## 3. Ciclo de Revisão e Atualização
- **Revisão Contínua:** Atualização pelos donos dos riscos e analistas de segurança sempre que uma ação de mitigação é concluída ou surge nova vulnerabilidade;
- **Revisão Trimestral:** Sessão de alinhamento com o CISO e comités de risco dos clientes operados;
- **Relatório Anual à Administração:** Apresentação formal do mapa térmico (Heatmap) consolidado e evolução do perfil de risco residual no âmbito da Revisão pela Gestão.

## 4. Matriz de Requisitos
| Requisito Normativo | Passo Operacional |
|---|---|
{{REQUIREMENT_MATRIX}}
