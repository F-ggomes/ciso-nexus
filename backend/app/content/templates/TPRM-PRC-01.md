---
kind: process
code: TPRM-PRC-01
title: Processo de Avaliação de Risco, Due Diligence e Qualificação de Fornecedores
language: pt-PT
---
# Processo de Avaliação de Risco, Due Diligence e Qualificação de Fornecedores

| Código | TPRM-PRC-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir o fluxo de ponta-a-ponta para a qualificação, avaliação do risco, due diligence de segurança e supervisão contínua de fornecedores e terceiros prestadores de serviços, conforme a ISO/IEC 27036:2022, o Artigo 28.º do DORA e a NIS2.

## 2. As 5 Fases do Ciclo de Vida do Fornecedor
### Fase 1: Triagem de Criticidade (Tiering)
Antes do contacto comercial aprofundado, o promotor da compra e o CISO classificam o fornecedor:
- **Tier 1 (Crítico):** Acede a dados confidenciais de clientes, aloja infraestrutura de produção ou suporta funções críticas de negócio.
- **Tier 2 (Alto Risco):** Acede a dados internos restritos ou presta serviços de suporte técnico remoto.
- **Tier 3 (Médio Risco):** Fornece software comercial de uso geral (COTS) sem acesso a dados confidenciais.
- **Tier 4 (Baixo Risco):** Prestadores de serviços gerais (material de escritório, catering).

### Fase 2: Due Diligence de Segurança e Privacidade
Para fornecedores Tier 1 e Tier 2:
1. Envio obrigatório do Questionário Padrão de Segurança (TPRM-QST-01);
2. Verificação de certificados de auditoria independentes (ISO 27001, SOC 2 Type II);
3. Avaliação da superfície externa de ataque através de ferramentas de Security Ratings (CISO Nexus EASM);
4. Análise de risco geopolítico e concentração de fornecedores.

### Fase 3: Formalização Contratual
Inclusão mandatória do Anexo de Segurança e Cláusulas DORA/RGPD:
- SLAs de segurança e notificação de incidentes em até 24 horas;
- Direitos incondicionais de auditoria;
- Compromissos de continuidade de negócio e estratégias de saída.

### Fase 4: Monitorização Contínua e Reavaliação
- Monitorização contínua de vulnerabilidades e notícias de incidentes em terceiros;
- Reavaliação anual formal de conformidade para todos os fornecedores Tier 1.

### Fase 5: Desvinculação e Encerramento (Offboarding)
- Revogação imediata de todos os acessos lógicos e físicos no dia da cessação contratual;
- Devolução de equipamentos e receção de Certificado de Destruição Segura de todos os dados retidos pelo fornecedor.

## 3. Matriz de Requisitos
| Requisito ISO 27036 / DORA | Fase do Processo |
|---|---|
{{REQUIREMENT_MATRIX}}
