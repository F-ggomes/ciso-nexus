---
kind: procedure
code: AI-PRC-01
title: Procedimento de Avaliação de Impacto e Classificação de Risco de IA (AI Impact Assessment)
language: pt-PT
---
# Procedimento de Avaliação de Impacto e Classificação de Risco de IA (AI Impact Assessment)

| Código | AI-PRC-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir o procedimento operacional estruturado para avaliar a conformidade ética, legal, de segurança e de proteção de dados de qualquer novo sistema de Inteligência Artificial (IA) antes da sua aquisição, desenvolvimento ou implementação em {{ORG}}.

## 2. Âmbito
Aplica-se a todos os projetos que envolvam modelos de machine learning, redes neuronais, modelos fundacionais (LLMs), agentes autónomos ou software analítico preditivo.

## 3. Requisitos de Referência
{{REQUIREMENTS}}

## 4. Fluxo Operacional Passo a Passo
### Passo 1: Submissão do Caso de Uso (Triagem Prévia)
O Promotor do Projeto (Product Owner ou Gestor de TI) preenche o formulário de Pedido de Avaliação de IA no CISO Nexus com:
1. Finalidade pretendida e justificação de negócio;
2. Descrição das entradas (inputs), dados utilizados e saídas (outputs);
3. Identificação do fornecedor (modelo proprietário ou third-party API/SaaS);
4. Indicação se processa dados de clientes, dados pessoais ou segredos comerciais.

### Passo 2: Classificação de Risco Inicial (CISO & Jurídico)
No prazo de 5 dias úteis, o CISO e o Responsável de Conformidade classificam o sistema segundo as 4 categorias do Regulamento de IA:
- Se for identificado risco inadmissível: o projeto é formalmente cancelado.
- Se for classificado como Alto Risco: segue obrigatoriamente para Avaliação Aprofundada (Passo 3).
- Se for Transparência Específica ou Risco Mínimo: segue para Verificação de Segurança Padrão (Passo 4).

### Passo 3: Avaliação de Impacto sobre Direitos Fundamentais e IA (FRIA / AIMS)
Para sistemas de Alto Risco, a equipa multidisciplinar (CISO, DPO, Jurídico e Engenheiro de IA) analisa:
- **Governação de Dados:** Representatividade, integridade e ausência de enviesamento estatístico (bias) nos dados de treino e validação.
- **Transparência Técnica:** Documentação de arquitetura, parâmetros, limitações conhecidas e métricas de desempenho (precisão, recall, F1-score).
- **Cibersegurança e Resiliência:** Testes de robustez contra extração de modelo, ataques de jailbreak e injeção de comandos.
- **Supervisão Humana:** Mecanismos de paragem de emergência (kill switch) e controlo humano sobre decisões automatizadas.
- **Impacto em Direitos Fundamentais:** Verificação de potenciais impactos na privacidade, igualdade de oportunidades e proteção do consumidor.

### Passo 4: Emissão de Parecer e Recomendações
O CISO e o DPO emitem parecer conjunto formal:
- **Aprovado sem reservas;**
- **Aprovado condicionado à implementação de salvaguardas (Action Plan);**
- **Rejeitado por risco inaceitável.**

### Passo 5: Registo e Monitorização Contínua
Sistemas aprovados são adicionados ao Inventário de IA com revisão semestral de desvios (model drift), taxa de erro e novas vulnerabilidades conhecidas.

## 5. Matriz de Requisitos
| Requisito Regulamentar / Normativo | Passo do Procedimento |
|---|---|
{{REQUIREMENT_MATRIX}}

## 6. Critérios de Aprovação e Apetite ao Risco
- Pontuação de risco calculada acima de {{ESCALATE_AT}}: Requer aprovação unânime da Administração e Plano de Mitigação obrigatório.
- Pontuação abaixo de {{ACCEPT_BELOW}}: Aprovação delegada ao CISO e Dono da Aplicação.
