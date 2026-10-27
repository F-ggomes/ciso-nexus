---
kind: procedure
code: DORA-PRC-01
title: Procedimento de Notificação de Incidentes Graves de TIC (DORA)
language: pt-PT
---
# Procedimento de Notificação de Incidentes Graves de TIC (DORA)

| Código | DORA-PRC-01 | Versão | {{VERSION}} | Proprietário | Equipa de Resposta a Incidentes (CSIRT) / CISO |
|---|---|---|---|---|---|
| Aprovado por | CISO / Compliance Officer | Data | {{DATE}} | Revisão | 12 meses |
| Âmbito Legal | DORA Art. 17.º a 23.º · RTS (UE) 2024/1772 · Circular Banco de Portugal |

## 1. Objectivo
Estabelecer o protocolo operacional estrito e os prazos legais de reporte de incidentes graves de TIC e de ameaças significativas às autoridades competentes (Banco de Portugal, BCE e Autoridades Europeias de Supervisão - ESAs), cumprindo os prazos determinísticos fixados no RTS (UE) 2024/1772.

## 2. Critérios de Classificação de Incidente Grave (RTS 2024/1772)
Um incidente de TIC é mandatoriamente classificado como **GRAVE** se preencher o critério de afetação de **funções críticas ou importantes** E pelo menos dois dos seguintes limiares:
1. **Clientes e Contrapartes Financeiras Afetadas:** Impacto em mais de 10% dos clientes ativos da entidade ou mais de 100.000 clientes.
2. **Duração do Incidente e Indisponibilidade:** Indisponibilidade do serviço superior a 2 horas, ou interrupção de processos nucleares superior ao RTO aprovado.
3. **Extensão Geográfica:** Impacto transfronteiriço em mais de dois Estados-Membros da União Europeia.
4. **Perdas de Dados e Integridade:** Fuga, corrupção ou perda não recuperável de dados de clientes, transações ou relatórios prudenciais.
5. **Impacto Económico Direto:** Custos diretos ou perdas estimadas superiores a 100.000 EUR.

## 3. Prazos e Calendário Determinístico de Notificação
Assim que um incidente for classificado como grave pela equipa do CISO, o relógio regulamentar inicia a contagem decrescente com os seguintes prazos improrrogáveis:

```
[Detetado & Classificado como Grave]
         │
         ├──► ⏱️ PRAZO 4 HORAS: Notificação Inicial (Art. 19.º(4)(a))
         │      └─ Envio ao Banco de Portugal / BCE via portal BPnet
         │      └─ Conteúdo: Descrição sumária, afetação de serviços e medidas de contenção
         │
         ├──► ⏱️ PRAZO 72 HORAS: Relatório Intermédio (Art. 19.º(4)(b))
         │      └─ Atualização do impacto financeiro, causa provável e IoCs (Indicadores de Compromisso)
         │
         └──► ⏱️ PRAZO 1 MÊS: Relatório Final Conclusivo (Art. 19.º(4)(c))
                └─ Causa-raiz forense (RCA), reconciliação de dados, perdas totais e melhorias implementadas
```

## 4. Notificação a Clientes Afetados (DORA Art. 19.º(3))
Em caso de incidente grave de TIC que tenha impacto direto nos interesses financeiros dos clientes, a {{ORG}} deve notificá-los sem demora injustificada, indicando as medidas tomadas para mitigar os efeitos adversos.

## 5. Ferramentas e Registo no CISO Nexus
1. Toda a cadeia temporal de eventos, evidências forenses e minutas submetidas às autoridades são arquivadas na plataforma CISO Nexus com carimbo temporal e hash SHA-256 de integridade.
2. Os relógios de notificação encontram-se integrados no Dashboard da Torre CISOaaS para alertas automáticos à equipa de segurança via Microsoft Teams e e-mail de emergência.
