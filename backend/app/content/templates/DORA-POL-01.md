---
kind: policy
code: DORA-POL-01
title: Política de Gestão de Riscos de TIC e Resiliência Operacional
language: pt-PT
---
# Política de Gestão de Riscos de TIC e Resiliência Operacional

| Código | DORA-POL-01 | Versão | {{VERSION}} | Proprietário | CISO |
|---|---|---|---|---|---|
| Aprovado por | Órgão de Administração / Conselho de Administração | Data | {{DATE}} | Revisão | Anual |
| Âmbito Legal | Regulamento (UE) 2022/2554 (DORA) Art. 6.º a 16.º · RTS (UE) 2024/1774 · EBA GL 2019/04 |

## 1. Princípio Fundamental e Responsabilidade do Órgão de Gestão (Art. 5.º)
O Órgão de Administração de {{ORG}} detém a responsabilidade final e indelegável pela definição, aprovação e supervisão do Quadro de Gestão de Riscos de TIC. Todos os membros do conselho mantêm formação contínua obrigatória e atualizada sobre os riscos de resiliência operacional digital.

## 2. Estratégia de Resiliência Operacional Digital (Art. 6.º)
A {{ORG}} estabelece um quadro holístico de gestão de risco de TIC alinhado com o princípio da proporcionalidade, dimensionado para o volume, natureza e complexidade das operações financeiras e tecnológicas desenvolvidas para a própria empresa e clientes CISO-as-a-Service.

## 3. Pilares do Quadro de Risco de TIC (RTS 2024/1774)
### 3.1. Identificação Contínua e Gestão de Activos de TIC (Art. 8.º)
1. Manutenção de inventário exaustivo e automatizado de todos os componentes de hardware, servidores em nuvem, sistemas operativos, bases de dados, ligações de rede e dependências aplicacionais.
2. Identificação e classificação explícita de todas as funções empresariais e das **funções críticas ou importantes** suportadas por ativos de TIC.
3. Mapeamento de interconexões, fluxos de dados e pontos únicos de falha (*Single Points of Failure - SPOF*).

### 3.2. Proteção e Prevenção (Art. 9.º)
1. Arquitetura Zero-Trust com segmentação lógica de rede, micro-segmentação de cargas de trabalho na nuvem e inspeção criptográfica de tráfego.
2. Controlo rigoroso de identidade e acessos (IAM): MFA mandatório para todos os acessos administrativos ou remotos, gestão de contas de serviço com rotação automática de segredos.
3. Atualizações e patches de segurança aplicados dentro dos SLAs regulamentares (&lt; 24h para vulnerabilidades críticas no CISA KEV; &lt; 7 dias para altas).

### 3.3. Deteção de Anomalias e Atividades Maliciosas (Art. 10.º)
1. Monitorização contínua 24/7/365 suportada por ferramentas SIEM/SOC e agentes de EDR (Wazuh / Defender).
2. Registo centralizado de eventos e auditoria (*logging*) com carimbos temporais sincronizados por NTP autenticado e retenção mínima de 12 meses.
3. Testes periódicos de alertas de telemetria e validação de regras de deteção de tráfego anómalo.

## 4. Política de Continuidade das TIC e Planos de Recuperação (Art. 11.º e 12.º)
1. Definição formal de Objetivos de Tempo de Recuperação (RTO) e Objetivos de Ponto de Recuperação (RPO) para cada função crítica:
   - RTO para funções críticas de pagamento/bancárias: **≤ 2 horas**.
   - RPO para dados transacionais: **0 minutos (replicação síncrona / quase zero)**.
2. Realização obrigatória de testes anuais de continuidade de negócio e recuperação de desastres (DRP), incluindo comutação efetiva para ambientes secundários em região cloud redundante.

## 5. Revisão Anual pela Gestão e Auditoria Independente
O quadro de risco de TIC é auditado anualmente por auditores internos ou externos qualificados e independentes, sendo o relatório de auditoria apresentado formalmente ao Órgão de Administração.
