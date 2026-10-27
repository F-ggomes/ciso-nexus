---
kind: guideline
code: INC-SEV-01
title: Matriz de Classificação de Severidade de Incidentes TIC e Segurança
language: pt-PT
---
# Matriz de Classificação de Severidade de Incidentes TIC e Segurança

| Código | INC-SEV-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Estabelecer critérios objetivos e uniformes para determinar a severidade de qualquer incidente de segurança ou tecnologia de informação em {{ORG}}, harmonizando as exigências do Regulamento DORA (Art. 18.º), da Diretiva NIS2 (Art. 23.º), do RGPD (Art. 33.º) e do Banco Nacional de Angola.

## 2. Matriz de Níveis de Severidade
| Nível | Classificação | Critérios de Impacto e Limiares Objetivos | Tempo de Resposta Inicial (SLA) | Escalação Obrigatória |
|---|---|---|---|---|
| **P1** | **Crítico** | Falha de função crítica de negócio afetando mais de 50% dos utilizadores/clientes; perda confirmada de integridade de dados financeiros; ataque de ransomware ativo; potencial prejuízo > 100.000 €; fuga massiva de dados pessoais. | **Até 15 minutos** (24/7) | Administração, CISO, DPO, Autoridades Regulatórias (DORA 4h, CNCS 24h, CNPD 72h). |
| **P2** | **Alto** | Degradação substancial de serviços essenciais sem quebra total; comprometimento de servidores de pré-produção ou contas privilegiadas sem prova de exfiltração; prejuízo estimado entre 25.000 € e 100.000 €. | **Até 1 hora** | CISO, Dono do Serviço, Jurídico. |
| **P3** | **Médio** | Impacto circunscrito a um departamento ou grupo reduzido de utilizadores; malware isolado em estação de trabalho individual por EDR; sem perda de dados confidenciais. | **Até 4 horas** | Gestor de TI, CISO. |
| **P4** | **Baixo** | Anomalia menor sem impacto na operação ou clientes; tentativa falhada de phishing detetada e bloqueada; violação pontual da política de secretária limpa. | **Até 1 dia útil** | Equipa de Suporte / Analista SOC. |
| **P5** | **Informativo** | Evento de segurança sem qualquer impacto adverso; aviso de vulnerabilidade recebido de fornecedor para triagem regular. | Ciclo semanal | Registo no sistema. |

## 3. Matriz de Requisitos
| Requisito Normativo | Secção do Guia |
|---|---|
{{REQUIREMENT_MATRIX}}
