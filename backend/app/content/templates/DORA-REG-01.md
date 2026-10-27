---
kind: procedure
code: DORA-REG-01
title: Procedimento de Manutenção do Registo de Informação de Contratos TIC (ITS 2024/2956)
language: pt-PT
---
# Procedimento de Manutenção do Registo de Informação de Contratos TIC (ITS 2024/2956)

| Código | DORA-REG-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Estabelecer o procedimento operacional e regras de validação para preenchimento, validação, atualização e reporte do Registo de Informação sobre todos os acordos contratuais relativos à utilização de serviços TIC prestados por terceiros, em estrito cumprimento do Artigo 28.º(3) do DORA e do Regulamento de Execução (UE) 2024/2956 (ITS).

## 2. Âmbito
Aplica-se a todos os contratos vigentes com prestadores de serviços TIC, internos ao grupo ou externos, abrangendo software, infraestrutura cloud (IaaS/PaaS/SaaS), manutenção, cibersegurança e suporte técnico.

## 3. Requisitos e Estrutura dos Modelos Regulamentares (Templates ITS)
O registo organiza-se através de 4 chaves relacionais fundamentais:
1. **Número de Referência do Acordo Contratual:** Código alfanumérico interno único e consistente ao longo do tempo.
2. **Identificador da Entidade (LEI / EUID):** Legal Entity Identifier de 20 caracteres para entidades jurídicas.
3. **Identificador da Função:** Código único atribuído à função de negócio suportada pelo serviço.
4. **Identificador do Tipo de Serviço TIC:** Código normalizado segundo a taxonomia europeia (S01 a S19).

### Visão dos Modelos Obrigatórios (Annex I):
- **B_01.01 / B_01.02:** Informações gerais sobre a entidade financeira e âmbito do registo.
- **B_02.01 / B_02.02:** Informações contratuais e identificação dos prestadores diretos de serviços TIC.
- **B_03.01:** Identificação e classificação de funções críticas ou importantes suportadas.
- **B_04.01:** Avaliação e riscos decorrentes da dependência de serviços TIC.
- **B_05.01 / B_05.02:** Cadeia de subcontratação de serviços TIC (sub-processors essenciais).
- **B_06.01:** Estratégias de saída e planos de contingência contratuais.

## 4. Fluxo de Atualização e Controlo de Qualidade
1. **Registo no Ato da Contratação:** Sempre que um novo contrato de TIC é assinado, a equipa de compras preenche os dados nos campos correspondentes do CISO Nexus.
2. **Revisão Trimestral de Dados:** O CISO e o departamento Jurídico realizam controlo de qualidade para expurgar dados obsoletos e garantir conformidade com a taxonomia europeia.
3. **Validação Anual Pré-Submissão:** Até 31 de janeiro de cada ano civil, o registo consolidado é auditado e exportado no formato técnico especificado pelas Autoridades Europeias de Supervisão (ESAs) para submissão à autoridade nacional competente.

## 5. Matriz de Requisitos
| Requisito Regulamentar | Secção Operacional |
|---|---|
{{REQUIREMENT_MATRIX}}
