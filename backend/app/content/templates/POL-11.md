---
kind: policy
code: POL-11
title: Política de Governação e Gestão de Risco em Inteligência Artificial
language: pt-PT
---
# Política de Governação e Gestão de Risco em Inteligência Artificial

| Código | POL-11 | Versão | {{VERSION}} | Proprietário | CISO / Responsável de IA |
|---|---|---|---|---|---|
| Aprovado por | Conselho de Administração | Data | {{DATE}} | Revisão | 12 meses |
| Âmbito Legal | Regulamento de IA da UE (EU AI Act 2024/1689) · ISO/IEC 42001:2023 · RGPD |

## 1. Objectivo
Estabelecer os requisitos de transparência, supervisão humana, qualidade de dados e conformidade para todos os modelos de Inteligência Artificial, LLMs locais e sistemas generativos integrados nas operações de {{ORG}} e dos seus clientes.

## 2. Princípios de IA Responsável (ISO/IEC 42001)
1. **Transparência e Explicabilidade:** Os utilizadores e clientes devem ser claramente informados sempre que estejam a interagir com um sistema de IA ou quando um parecer for gerado por IA.
2. **Supervisão Humana (*Human-in-the-loop*):** Nenhum parecer de auditoria, decisão disciplinar, classificação de risco ou submissão regulatória formal pode ser executada por IA sem validação prévia e formal de um analista ou do CISO.
3. **Privacidade e Proteção de Dados (RGPD Art. 25.º):** É terminantemente proibido o envio de dados pessoais não anonimizados, segredos de negócio, código proprietário ou credenciais para APIs de IA públicas ou na nuvem sem garantias de não retenção para treino (*zero-retention policy*). Prioridade absoluta à inferência local em hardware bare-metal próprio (ex.: Apple Metal GPU).

## 3. Classificação de Riscos no Âmbito do EU AI Act
1. **Sistemas de Risco Inaceitável:** Proibição estrita de sistemas de pontuação social ou manipulação subliminar.
2. **Sistemas de Alto Risco (High-Risk AI):** Aplicação de avaliação de impacto sobre direitos fundamentais, validação estatística de datasets de treino contra vieses (*bias*) e registo de auditoria imutável de todas as sessões e inferências.
3. **Sistemas de IA de Finalidade Geral (GPAI / LLMs):** Documentação técnica e conformidade com os requisitos de direitos de autor e transparência de dados de treino.

## 4. Auditoria de IA no CISO Nexus
Todas as interações, tokens processados, chamadas FastMCP e hashes das respostas geradas pelo assistente agêntico são registadas no log de auditoria de IA para efeitos de auditoria independente.
