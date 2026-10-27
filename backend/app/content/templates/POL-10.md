---
kind: policy
code: POL-10
title: Política de Registo de Eventos (Logging) e Monitorização Contínua SOC / SIEM
language: pt-PT
---
# Política de Registo de Eventos (Logging) e Monitorização Contínua SOC / SIEM

| Código | POL-10 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir os requisitos obrigatórios para a recolha, centralização, proteção, retenção e monitorização contínua de registos de auditoria e telemetria de segurança (logs) em {{ORG}}, em cumprimento do controlo 8.15 e 8.16 da ISO/IEC 27002:2022 e dos requisitos de deteção do DORA e NIS2.

## 2. Eventos de Registo Obrigatório
Devem ser gerados e enviados para o SIEM central os seguintes eventos:
1. Tentativas de autenticação com sucesso e falhadas em qualquer sistema ou aplicação;
2. Elevação de privilégios e utilização de contas com direitos administrativos (root/admin/sudo);
3. Criação, modificação, suspensão e eliminação de contas de utilizador e atribuição de permissões;
4. Alterações em regras de firewalls, políticas de segurança, roteadores e infraestrutura cloud;
5. Acessos, exportações ou modificações de dados classificados como Restritos ou Confidenciais;
6. Alertas e deteções geradas por ferramentas de segurança de endpoint (EDR), firewalls (NGFW) e WAF;
7. Paragens, reinicializações e falhas críticas de serviços e servidores de produção.

## 3. Sincronização Horária e Integridade dos Registos
- Todos os sistemas e equipamentos de rede sincronizam os respetivos relógios com servidores de tempo de referência fidedignos utilizando o protocolo **NTP autenticado (Network Time Protocol)** com desvio máximo tolerável inferior a 100 milissegundos.
- Os registos armazenados no SIEM são protegidos contra alteração ou apagamento por mecanismos de integridade criptográfica e permissões de escrita exclusiva (Append-Only).

## 4. Retenção e Alarmística em Tempo Real (SOC)
- **Retenção Ativa no SIEM (Pesquisável):** Pelo menos 90 dias de retenção com pesquisa imediata.
- **Retenção em Frio (Arquivo Seguro):** Mínimo de **12 meses** para permitir investigações retrospetivas e auditorias regulatórias.
- **Alarmística em Tempo Real:** Casos de uso de correlação de eventos automatizados (ex.: múltiplos logins falhados seguidos de sucesso, acessos fora do horário habitual, comunicação com IPs maliciosos conhecidos) devem disparar alertas 24/7 com SLA de triagem no SOC em até 15 minutos.

## 5. Matriz de Requisitos
| Requisito ISO / DORA / NIS2 | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}
