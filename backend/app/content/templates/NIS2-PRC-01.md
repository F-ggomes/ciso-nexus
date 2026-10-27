---
kind: procedure
code: NIS2-PRC-01
title: Procedimento de Notificação de Incidentes ao CNCS (NIS2 / DL 125/2025)
language: pt-PT
---
# Procedimento de Notificação de Incidentes ao CNCS

| Código | NIS2-PRC-01 | Versão | {{VERSION}} | Proprietário | CISO / Equipa de Incidentes |
|---|---|---|---|---|---|
| Aprovado por | CISO / Direção Jurídica | Data | {{DATE}} | Revisão | Anual |
| Âmbito Legal | Decreto-Lei n.º 125/2025 Artigo 23.º · Diretiva NIS2 Artigo 23.º |

## 1. Objectivo
Definir o procedimento de reporte de incidentes significativos ao Centro Nacional de Cibersegurança (CNCS) e aos destinatários dos serviços em Portugal.

## 2. Critérios de Incidente Significativo
Um incidente é considerado significativo se:
1. Causou ou é suscetível de causar uma perturbação operacional grave dos serviços ou perdas financeiras substanciais para a entidade; OU
2. Afetou ou é suscetível de afetar outras pessoas singulares ou coletivas, causando prejuízos materiais ou imateriais consideráveis.

## 3. Calendário Determinístico de Reporte ao CNCS
O fluxo de reporte processa-se em três etapas obrigatórias com contagem decrescente registada na plataforma CISO Nexus:

```
[Deteção de Incidente Significativo]
         │
         ├──► ⏱️ PRAZO 24 HORAS: Alerta Precoce (Early Warning)
         │      └─ Canal: Portal de Notificação do CNCS (CERT.PT)
         │      └─ Conteúdo: Indicação se o incidente é causado por ato ilícito ou malicioso
         │                   e se tem potencial impacto transfronteiriço na UE.
         │
         ├──► ⏱️ PRAZO 72 HORAS: Notificação do Incidente
         │      └─ Atualização do alerta inicial com avaliação inicial da severidade,
         │         impacto, indicadores de compromisso (IoCs) e medidas mitigadoras.
         │
         └──► ⏱️ PRAZO 1 MÊS: Relatório Final
                └─ Descrição detalhada do incidente, causa-raiz, medidas de mitigação
                   adotadas e impacto financeiro ou operacional definitivo.
```

## 4. Alerta Intermédio a Pedido da Autoridade
A pedido expresso do CNCS ou do CSIRT nacional, a entidade deve fornecer relatórios intercalares adicionais sobre o estado de mitigação da ameaça.

## 5. Notificação aos Utilizadores e Clientes
Caso o incidente possa afetar a segurança dos dados ou a continuidade do serviço prestado aos clientes, a {{ORG}} deve notificá-los sem demora indevida sobre o incidente e sobre as eventuais medidas preventivas que devam adotar.
