---
kind: plan
code: BCM-PLN-01
title: Plano de Continuidade de Negócio e Recuperação de Desastres (BCM & DRP)
language: pt-PT
---
# Plano de Continuidade de Negócio e Recuperação de Desastres (BCM & DRP)

| Código | BCM-PLN-01 | Versão | {{VERSION}} | Proprietário | CISO / Gestor de Continuidade |
|---|---|---|---|---|---|
| Aprovado por | Comissão Executiva / Administração | Data | {{DATE}} | Revisão | Anual |
| Âmbito Legal | ISO 22301:2019 · DORA Art. 11.º e 12.º · NIS2 Art. 21.º(2)(c) · BdP Aviso 3/2020 |

## 1. Objectivo
Garantir a capacidade de {{ORG}} e dos seus clientes para manter, restabelecer e recuperar a operação de serviços críticos em caso de interrupção grave, ataque de ransomware, indisponibilidade prolongada de centro de dados ou catástrofe física.

## 2. Parâmetros de Recuperação por Serviço Crítico
| Serviço / Função | Classificação DORA | RTO (Tempo Máx. Recuperação) | RPO (Ponto Máx. Perda de Dados) | Estratégia de Redundância |
|---|---|---|---|---|
| Gateway de Pagamentos & APIs | Crítico (Nuclear) | 2 Horas | 0 Minutos (Quase-zero) | Ativo-Ativo / Multi-Região Cloud |
| Core Bancário / Base de Dados | Crítico (Nuclear) | 4 Horas | 15 Minutos | Replicação Síncrona + WORM |
| Portal Web & Plataforma SaaS | Importante | 8 Horas | 1 Hora | Cópias Diárias Imutáveis |
| Ferramentas Administrativas | Normal | 24 Horas | 24 Horas | Backup em Nuvem Secundária |

## 3. Gestão de Crise e Cadeia de Comando
1. **Ativação do Gabinete de Crise:** Competência do CISO ou do Administrador com o pelouro de operações.
2. **Canais de Comunicação de Emergência:** Utilização de canais de comunicação seguros e alternativos fora de banda (*out-of-band*), independentes do domínio corporativo principal (ex.: Signal dedicado / canais de emergência pré-configurados).
3. **Comutação de Infraestrutura (Failover):** Procedimentos documentados passo a passo com scripts de infraestrutura como código (Terraform / Ansible) para reconstituição automática da infraestrutura numa região alternativa em caso de perda da região principal.

## 4. Testes e Exercícios de Simulação
1. Realização de exercício de simulação de mesa (*Tabletop Exercise*) semestral com o Órgão de Administração.
2. Simulação técnica de recuperação de desastre (*Technical DR Test*) anual com corte real de comunicação e comutação para o centro de dados de contingência.
