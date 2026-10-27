---
kind: policy
code: POL-09
title: Política de Cópias de Segurança e Salvaguarda de Dados (Backup & Recovery)
language: pt-PT
---
# Política de Cópias de Segurança e Salvaguarda de Dados (Backup & Recovery)

| Código | POL-09 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Garantir que todas as informações críticas, bases de dados, configurações de sistemas e código-fonte de {{ORG}} e dos seus clientes são salvaguardados de forma fiável, cifrada e imutável, permitindo o restauro rápido em caso de incidente ou desastre, conforme o controlo 8.13 da ISO/IEC 27002:2022.

## 2. A Estratégia de Salvaguarda 3-2-1
Todas as cargas de trabalho críticas devem obedecer rigorosamente à regra 3-2-1:
- **3 Cópias:** Manter pelo menos 3 cópias de todos os dados essenciais (1 de produção primária e 2 de salvaguarda);
- **2 Suportes Distintos:** Utilizar pelo menos dois tipos de armazenamento ou tecnologias diferentes (ex.: armazenamento em bloco local e armazenamento de objetos cloud);
- **1 Cópia Externa / Imutável (Offsite & WORM):** Manter pelo menos uma cópia fora das instalações primárias, em região geográfica distinta, protegida por imutabilidade de escrita (Write Once, Read Many / Object Lock) e isolamento lógico (Air-Gap lógico) para imunidade contra ransomware.

## 3. Esquema de Rotação GFS (Grandfather-Father-Son)
- **Son (Filho - Diário):** Cópias incrementais ou diferenciais diárias mantidas por 14 a 30 dias;
- **Father (Pai - Semanal):** Cópias completas semanais executadas ao fim de semana e mantidas por 8 a 12 semanas;
- **Grandfather (Avô - Mensal/Anual):** Cópias completas mensais e anuais mantidas para efeitos fiscais e regulatórios pelo prazo legal aplicável (5 a 10 anos).

## 4. Cifragem e Proteção de Acessos a Backups
- Todas as cópias de segurança devem ser cifradas com algoritmo forte **AES-256** em trânsito e em repouso.
- As credenciais administrativas dos sistemas de backup devem ser exclusivas, utilizar MFA obrigatório baseado em hardware/FIDO2 e estar estritamente segregadas das credenciais do domínio de produção (Active Directory / IAM).

## 5. Testes Obrigatórios de Restauro
- Testes automatizados diários de integridade de checksum das cópias;
- Teste prático de restauro completo em ambiente isolado realizado pelo menos **trimestralmente**, com medição e registo do tempo efetivo de restauro face ao RTO estipulado.

## 6. Matriz de Requisitos
| Requisito Normativo | Secção Correspondente |
|---|---|
{{REQUIREMENT_MATRIX}}
