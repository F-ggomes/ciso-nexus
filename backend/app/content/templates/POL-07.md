---
kind: policy
code: POL-07
title: Política de Continuidade de Negócio e Resiliência das TIC
language: pt-PT
---
# Política de Continuidade de Negócio e Resiliência das TIC

| Código | POL-07 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Compromisso da Administração
A Administração de {{ORG}} assume o compromisso de garantir a resiliência operacional digital e a continuidade dos seus serviços essenciais face a interrupções graves, falhas catastróficas de infraestrutura, ciberataques ou desastres naturais, em conformidade com a ISO 22301:2019, o Artigo 11.º do DORA e a NIS2.

## 2. Parâmetros Críticos de Resiliência
Para cada serviço e processo de negócio, a organização define formalmente através de Análise de Impacto no Negócio (BIA):
- **MTPD (Maximum Tolerable Period of Disruption):** Tempo máximo que uma função pode permanecer inoperacional antes de causar danos irreparáveis à viabilidade da organização;
- **RTO (Recovery Time Objective):** Tempo alvo aprovado para restabelecimento da operação do serviço após um desastre;
- **RPO (Recovery Point Objective):** Quantidade máxima tolerável de perda de dados medida em tempo (ex.: perda máxima de transações dos últimos 15 minutos).

## 3. Requisitos Obrigatórios de Infraestrutura e Redundância
1. **Alta Disponibilidade e Redundância Geográfica:** Serviços críticos devem ser alojados em centros de dados ou zonas de disponibilidade (Availability Zones) redundantes e geograficamente separadas.
2. **Resiliência de Telecomunicações:** Operadores de telecomunicações distintos com rotas físicas independentes para acesso à Internet e comunicações inter-instalações.
3. **Imutabilidade e Segregação de Cópias de Segurança:** Backups críticos devem estar protegidos contra encriptação por ransomware através de políticas de imutabilidade (WORM) e segregação de credenciais.

## 4. Testes e Exercícios Periódicos
Os planos de continuidade (BCP) e recuperação de desastres (DRP) são submetidos a testes práticos pelo menos semestralmente, incluindo simulações de falha de centro de dados e exercícios de mesa (tabletop exercises) com a Administração.

## 5. Matriz de Requisitos
| Requisito Regulamentar / Normativo | Secção Correspondente |
|---|---|
{{REQUIREMENT_MATRIX}}
