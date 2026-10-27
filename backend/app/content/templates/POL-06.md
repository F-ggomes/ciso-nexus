---
kind: policy
code: POL-06
title: Política de Gestão de Incidentes de Segurança da Informação
language: pt-PT
---
# Política de Gestão de Incidentes de Segurança da Informação

| Código | POL-06 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Objectivo
Estabelecer uma abordagem consistente e estruturada para a deteção, registo, triagem, contenção, erradicação, recuperação e comunicação de eventos e incidentes de segurança da informação em {{ORG}}, alinhada com o controlo 5.24 a 5.28 da ISO/IEC 27002:2022, o Artigo 17.º do DORA e o Artigo 23.º da NIS2.

## 2. Princípios Fundamentais
1. **Dever Universal de Notificação Imediata:** Qualquer colaborador, parceiro ou prestador de serviços que identifique uma anomalia, evento suspeito ou falha de segurança tem o dever estrito de o comunicar de imediato através dos canais oficiais (SOC / Helpdesk / CISO Nexus).
2. **Cultura Não Punitiva (Just Culture):** O reporte de boa-fé é encorajado e protegido; não haverá represálias contra quem reporte incidentes, ainda que involuntariamente causados pelo próprio.
3. **Cadeia de Comando Centralizada:** Durante um incidente ativo, a Equipa de Resposta a Incidentes (CSIRT) sob liderança do CISO tem autoridade operacional para determinar o isolamento de redes, suspensão temporária de acessos ou corte de sistemas críticos.
4. **Preservação de Evidências Digitais:** Todas as ações técnicas devem garantir a integridade e cadeia de custódia de registos (logs), imagens de memória e capturas forenses para eventual investigação disciplinar, criminal ou peritagem de seguros.

## 3. Matriz de Requisitos
| Requisito Normativo | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}

## 4. Comunicações Regulatórias Obrigatórias
Incidentes classificados como graves ou significativos devem ser notificados aos seguintes organismos pelos canais cifrados designados:
- **DORA (Entidades Financeiras):** Notificação inicial em 4h / relatório intercalar em 24h / final em 1 mês à autoridade supervisora (Banco de Portugal / CMVM / ASF / BNA);
- **NIS2 / DL 125/2025:** Alerta precoce em 24h / notificação detalhada em 72h ao CSIRT Nacional (CERT.PT / CNCS);
- **RGPD / Dados Pessoais:** Notificação em até 72h à autoridade de proteção de dados (CNPD / APD) se houver risco para os titulares.

## 5. Análise Pós-Incidente (Lições Aprendidas)
Em até 10 dias úteis após a resolução de qualquer incidente P1 ou P2, a equipa realiza uma sessão formal de Lições Aprendidas (Post-Mortem) para identificar causas-raiz e implementar controlos preventivos.
