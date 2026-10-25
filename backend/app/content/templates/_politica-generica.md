---
kind: policy
title: Modelo genérico de Política
language: pt-PT
---
# {{TITLE}}

| Código | {{CODE}} | Versão | {{VERSION}} | Classificação | Interno |
|---|---|---|---|---|---|
| Proprietário | {{OWNER}} | Aprovado por | {{APPROVER}} | Data de aprovação | {{DATE}} |
| Ciclo de revisão | {{REVIEW_CYCLE}} meses | Próxima revisão | {{NEXT_REVIEW}} | Âmbito | {{ORG}} |

## 1. Objectivo
Esta política estabelece [o que a organização exige / proíbe / garante] para proteger a confidencialidade, integridade e disponibilidade da informação de {{ORG}} e dos seus clientes.

## 2. Âmbito
Aplica-se a todos os colaboradores, prestadores de serviços e terceiros com acesso a sistemas ou informação de {{ORG}}, em todas as localizações (Portugal, Angola e serviços cloud), dentro do âmbito do SGSI aprovado.

## 3. Referências normativas e legais
{{REQUIREMENTS}}

## 4. Definições
| Termo | Definição |
|---|---|
| Informação | Dados em qualquer formato (digital, papel, verbal) |
| Activo | Qualquer recurso com valor para a organização (sistemas, dados, pessoas, serviços, fornecedores) |

## 5. Princípios e regras
As regras seguintes são obrigatórias e verificáveis em auditoria.

5.1. [Regra 1 — formulada de modo testável, p. ex. "Todos os acessos administrativos exigem autenticação multifactor."]
5.2. [Regra 2]
5.3. [Regra 3]

## 6. Responsabilidades (RACI)
| Actividade | CISO | Owner do activo | IT/Operações | Colaboradores | DPO |
|---|---|---|---|---|---|
| Definir e aprovar a política | A | C | C | I | C |
| Implementar controlos | C | R | R | I | I |
| Cumprir as regras | I | R | R | R | I |
| Monitorizar e reportar | R | C | R | I | C |

## 7. Métricas e KPIs
| KPI | Meta | Fonte de evidência | Frequência |
|---|---|---|---|
| [ex.: % de contas com MFA] | 100% | Entra ID / Wazuh | Mensal |

## 8. Excepções
Excepções são pedidas por escrito ao CISO, registadas no registo de riscos com data de expiração (máx. 12 meses) e aprovadas segundo o apetite pelo risco.

## 9. Incumprimento
O incumprimento pode resultar em acção disciplinar nos termos do Código do Trabalho e dos contratos com terceiros.

## 10. Revisão e aprovação
Revista pelo menos a cada {{REVIEW_CYCLE}} meses ou após incidente relevante, alteração legal/regulatória ou alteração significativa do negócio.

## Anexo A — Matriz requisito → secção
| Requisito | Secção desta política |
|---|---|
{{REQUIREMENT_MATRIX}}

## Histórico de versões
| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1 | {{DATE}} | {{AUTHOR}} | Criação a partir do modelo |
