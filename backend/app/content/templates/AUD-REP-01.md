---
kind: guideline
code: AUD-REP-01
title: Modelo de Relatório de Auditoria Interna e Registo de Não-Conformidades
language: pt-PT
---
# Modelo de Relatório de Auditoria Interna e Registo de Não-Conformidades

| Código | AUD-REP-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Estrutura do Relatório de Auditoria Interna
O Relatório Final de Auditoria Interna de {{ORG}} constitui a evidência documental oficial da avaliação independente do sistema de segurança, devendo conter as secções padronizadas abaixo.

## 2. Cabeçalho e Dados Gerais da Auditoria
- **Código da Auditoria:** AUD-AAAA-NN
- **Data de Realização:** {{DATE}}
- **Âmbito Auditado:** {{SCOPE}}
- **Critérios de Auditoria:** ISO/IEC 27001:2022, DORA, NIS2, RGPD, Políticas Internas
- **Equipa Auditora:** Auditor Líder e Auditores Acompanhantes
- **Entidades e Interlocutores Auditados:** Donos de Processo e Direções Envolvidas

## 3. Sumário Executivo
Breve síntese destinada à Administração contendo:
- Grau global de maturidade e conformidade do sistema auditado;
- Principais pontos fortes evidenciados durante a auditoria;
- Quantitativo de constatações por categoria (Maiores, Menores, Oportunidades de Melhoria).

## 4. Tabela de Constatações e Ações Corretivas
| ID Constatação | Requisito Normativo | Descrição Objetiva da Evidência / Desvio | Classificação | Responsável (Dono) | Data Limite | Estado |
|---|---|---|---|---|---|---|
| NC-01 | ISO 27001 Anexo A 8.8 | Servidores de produção com patches de segurança pendentes há mais de 90 dias sem exceção aprovada. | Menor | Gestor de Infraestrutura | 30 dias | Aberta |
| NC-02 | DORA Art. 28.º | Ausência de registo formal de direitos de auditoria em adenda contratual de prestador cloud crítico. | Maior | Direção Jurídica / CISO | 15 dias | Aberta |
| OM-01 | ISO 27001 Cl. 7.3 | Taxa de conclusão de formação de cibersegurança em novos colaboradores aos 60 dias é inferior a 85%. | Oportunidade | Recursos Humanos | 60 dias | Aberta |

## 5. Conclusão e Parecer do Auditor Líder
Declaração formal sobre se o sistema auditado se encontra em conformidade substancial e apto para recomendação de certificação ou manutenção de certificação externa.

## 6. Matriz de Requisitos
| Requisito Normativo | Secção do Modelo |
|---|---|
{{REQUIREMENT_MATRIX}}
