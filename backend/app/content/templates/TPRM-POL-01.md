---
kind: policy
code: TPRM-POL-01
title: Política de Gestão de Risco de Terceiros e Registo de Informação (TPRM)
language: pt-PT
---
# Política de Gestão de Risco de Terceiros e Registo de Informação (TPRM)

| Código | TPRM-POL-01 | Versão | {{VERSION}} | Proprietário | CISO / Procurement |
|---|---|---|---|---|---|
| Aprovado por | Conselho de Administração | Data | {{DATE}} | Revisão | Anual |
| Âmbito Legal | DORA Art. 28.º a 31.º · ITS (UE) 2024/2956 · NIS2 Art. 21.º(2)(d) · EBA Outsourcing GL |

## 1. Princípio Fundamental
A {{ORG}} e as instituições suas clientes mantêm a total responsabilidade pela conformidade regulatória e segurança das suas operações, mesmo quando estas são fornecidas ou operadas por prestadores terceiros de serviços de TIC (*Third-Party Risk Management - TPRM*).

## 2. Ciclo de Vida do Risco de Terceiros
### 2.1. Fase Pré-Contratual (Avaliação e Due Diligence)
1. Antes de qualquer contratação de serviços de TIC, é obrigatório classificar o serviço quanto ao seu suporte a **funções críticas ou importantes**.
2. Análise da localização geográfica dos dados, certificações de segurança ativas (ISO 27001, SOC 2 Tipo II, PCI-DSS AoC) e capacidade de resposta a incidentes.
3. Avaliação do risco de concentração e dependência excessiva em prestadores dominantes (*cloud hyperscalers*).

### 2.2. Formalização Contratual
Nenhum contrato de TIC que suporte funções críticas pode ser assinado sem conter integralmente as cláusulas obrigatórias do Artigo 30.º do DORA (minuta DORA-CLA-01), com especial destaque para direitos irrestritos de auditoria e prazos de notificação de incidentes.

### 2.3. Monitorização Contínua e Risco de Subcontratação em Cadeia (N-th Party)
1. Monitorização contínua da postura de segurança dos fornecedores através de auditorias anuais e varimentos de perímetros externos (EASM).
2. Mapeamento detalhado de toda a cadeia de subcontratação crítica (prestadores de 4.ª e 5.ª parte), com proibição de alterações unilaterais da cadeia pelo fornecedor principal sem autorização prévia.

## 3. Registo Oficial de Informação (ITS 2024/2956)
A {{ORG}} mantém na plataforma CISO Nexus o Registo de Informação oficial de todos os contratos de TIC, estruturado nas tabelas padronizadas pelas Autoridades Europeias de Supervisão (EBA, EIOPA, ESMA):
1. **Registo B_01:** Lista de todas as entidades e códigos LEI do grupo.
2. **Registo B_02:** Inventário exaustivo de prestadores e acordos contratuais de TIC.
3. **Registo B_03:** Identificação de funções críticas e graus de dependência.
4. **Registo B_04:** Mapeamento da cadeia de subcontratantes que suportam funções críticas.
O registo é atualizado continuamente e exportado anualmente nos formatos XLSX e CSV padronizados para entrega ao Banco de Portugal.
