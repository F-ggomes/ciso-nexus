---
kind: plan
code: INC-PLN-01
title: Plano Operacional de Resposta a Incidentes de Segurança e Contactos de Emergência
language: pt-PT
---
# Plano Operacional de Resposta a Incidentes de Segurança e Contactos de Emergência

| Código | INC-PLN-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo e Ativação
Este Plano de Resposta a Incidentes (Incident Response Plan - IRP) define as ações operacionais imediatas que devem ser executadas pela Equipa de Resposta a Incidentes de Segurança (CSIRT) de {{ORG}} perante um ciberataque, infeção por malware, fuga de dados ou indisponibilidade crítica de sistemas.

## 2. Composição da Equipa de Resposta a Incidentes (CSIRT Core Team)
- **Comandante do Incidente (Incident Commander):** CISO (liderança operacional e ligação ao Conselho de Administração);
- **Líder Técnico de Investigação (Lead Investigator):** Especialista Sénior de Segurança / Analista SOC (coordenação forense e contenção);
- **Responsável de Proteção de Dados (DPO):** Análise de impacto na privacidade e notificações à CNPD/APD;
- **Assessoria Jurídica e Conformidade:** Validação de obrigações contratuais e regulatórias (DORA, NIS2, seguradora de risco cibernético);
- **Comunicação e Relações Públicas:** Gestão de comunicados a clientes, colaboradores e imprensa.

## 3. Fases Operacionais do Incidente (NIST SP 800-61 / ISO 27035)
1. **Deteção e Análise Preliminar:** Confirmação do falso positivo vs. incidente real, identificação de vetores de ataque e atribuição de nível de severidade (P1 a P5).
2. **Contenção Imediata:** Isolamento lógico de máquinas da rede, corte de túneis VPN, suspensão de contas comprometidas e preservação de memória RAM e logs.
3. **Erradicação:** Remoção completa de artefactos maliciosos, anulação de canais de persistência (backdoors), alteração global de senhas administrativas e reparação de vulnerabilidades exploradas.
4. **Recuperação e Validação:** Restauro controlado de sistemas a partir de cópias de segurança limpas e verificadas, reforço de regras de monitorização e reabertura gradual do tráfego.
5. **Atividades Pós-Incidente:** Sessão de lições aprendidas em até 10 dias úteis e atualização do plano IRP.

## 4. Diretório de Contactos de Emergência Fora-de-Banda (Out-of-Band)
*Nota: Em caso de comprometimento da rede corporativa ou email, utilizar exclusivamente canais cifrados de emergência (Signal / Chamada telefónica direta).*
| Função / Entidade Externa | Contacto Primário | Contacto Alternativo / Canal de Emergência |
|---|---|---|
| **CISO / Comandante do Incidente** | ciso@{{ORG}} | Telefone de Emergência 24/7 |
| **DPO (Encarregado de Proteção de Dados)** | dpo@{{ORG}} | Telefone Direto |
| **CERT.PT / CNCS (Portugal)** | cert@cert.pt | +351 210 497 400 |
| **Banco de Portugal / DORA Supervision** | dora.supervision@bportugal.pt | Portal Oficial de Comunicação |
| **Banco Nacional de Angola (BNA)** | ciberseguranca@bna.ao | Linha de Emergência BNA |
| **Polícia Judiciária (UNC3T - Cibercrime)** | ciber.pj@pj.pt | +351 211 967 000 |
| **Linha de Sinistros da Seguradora Cyber** | sinistros.cyber@seguradora.pt | Linha 24/7 de Resposta a Incidentes |

## 5. Matriz de Requisitos
| Requisito Regulamentar | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}
