---
kind: policy
code: AI-POL-01
title: Política de Governação e Uso Responsável de Inteligência Artificial
language: pt-PT
---
# Política de Governação e Uso Responsável de Inteligência Artificial

| Código | AI-POL-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Compromisso da Gestão
A Administração de {{ORG}} estabelece a presente Política de Governação de Inteligência Artificial para assegurar que qualquer conceção, desenvolvimento, aquisição, integração ou utilização de sistemas de Inteligência Artificial (IA) é conduzida de forma ética, segura, transparente e em estrita conformidade com o Regulamento (UE) 2024/1689 (Regulamento da Inteligência Artificial / EU AI Act), a norma ISO/IEC 42001:2023 (Sistema de Gestão de IA - AIMS), o RGPD (Regulamento UE 2016/679) e os requisitos regulamentares sectoriais (DORA, NIS2, BNA).

## 2. Objectivos
1. Estabelecer princípios éticos obrigatórios para a utilização de IA em produtos, serviços e operações internas.
2. Implementar um processo sistemático de classificação de risco e avaliação de conformidade de modelos e ferramentas de IA.
3. Garantir a protecção de dados pessoais, direitos fundamentais, segredos de negócio e propriedade intelectual contra fugas ou utilização abusiva em modelos algorítmicos.
4. Definir papéis, responsabilidades e supervisão humana (Human-in-the-Loop) em decisões apoiadas por IA.

## 3. Âmbito de Aplicação
{{SCOPE}}

Aplica-se a todos os colaboradores, consultores, prestadores de serviços, fornecedores de software e plataformas de terceiros que interajam com ou desenvolvam sistemas de IA para ou em nome de {{ORG}}.

## 4. Requisitos e Referências Normativas
{{REQUIREMENTS}}

## 5. Princípios Éticos e de Segurança em IA
1. **Dignidade Humana e Direitos Fundamentais:** Os sistemas de IA não devem violar direitos humanos, promover discriminação ou restringir indevidamente a autonomia individual.
2. **Supervisão Humana (Human-in-the-Loop):** Decisões que impactem direitos de colaboradores, clientes ou operações críticas devem ter sempre possibilidade de revisão e validação humana.
3. **Transparência e Explicabilidade:** Utilizadores e titulares de dados devem ser informados de forma clara quando interagem com um sistema de IA ou quando um conteúdo é gerado por IA.
4. **Robustez Técnica e Cibersegurança:** Os modelos devem ser protegidos contra ataques adversariais, envenenamento de dados (data poisoning), inversão de modelos e injeção de prompts (prompt injection).
5. **Privacidade e Governação de Dados:** Proibido o treino de modelos públicos com dados pessoais ou confidenciais sem consentimento expresso ou base legal fundamentada.
6. **Prestação de Contas (Accountability):** Todos os sistemas de IA em produção devem ter um proprietário designado e registo documental atualizado.

## 6. Classificação de Risco de Sistemas de IA (EU AI Act)
| Categoria | Descrição e Exemplos | Requisitos Obrigatórios em {{ORG}} |
|---|---|---|
| **Risco Inadmissível** | Manipulação cognitiva/comportamental, pontuação social (social scoring), identificação biométrica remota em tempo real em espaços públicos. | **Proibição Absoluta.** Nenhum sistema desta categoria pode ser concebido, contratado ou utilizado. |
| **Alto Risco** | Gestão de infraestruturas críticas, avaliação de crédito financeiro, triagem de recrutamento/RH, biometria, componentes de segurança em produtos regulados. | Registo obrigatório, Avaliação de Risco e Impacto nos Direitos Fundamentais (FRIA), dados de treino auditados, supervisão humana contínua, marcação CE e conformidade ISO 42001. |
| **Transparência Específica** | Chatbots de suporte, agentes conversacionais, sistemas de geração de imagem/áudio/vídeo (Deepfakes / Conteúdo Sintético). | Obrigação de divulgação transparente ao utilizador final ("Este conteúdo foi gerado por IA"); etiquetagem legível por máquina. |
| **Risco Mínimo / Nulo** | Filtros de spam em email, ferramentas de apoio à tradução interna, otimização de consultas de base de dados, corretores ortográficos. | Adesão aos princípios gerais de segurança e uso aceitável desta política; inventariação simplificada. |

## 7. Inventário de Ativos de IA e Ciclo de Vida
Todo e qualquer modelo, pipeline ou ferramenta de IA externa deve ser registado no Catálogo de Sistemas de IA do CISO Nexus antes da sua colocação em ambiente de teste ou produção, contendo:
- Nome do modelo, fornecedor e versão;
- Caso de uso e finalidade de negócio aprovada;
- Classificação de risco regulatória e nível de criticidade;
- Fontes de dados de treino e verificação de licenças;
- Responsável técnico (AI Engineer/Data Scientist) e Responsável de Negócio (Owner).

## 8. Matriz de Requisitos
| Requisito Normativo | Secção / Controlo Aplicado |
|---|---|
{{REQUIREMENT_MATRIX}}

## 9. Papéis e Responsabilidades (RACI)
| Atividade | Administração | CISO | DPO | Head of AI / Tech | Colaboradores |
|---|---|---|---|---|---|
| Aprovação da Política e Apetite pelo Risco de IA | A | C | C | C | I |
| Avaliação de Cibersegurança e Robustez dos Modelos | I | A/R | C | C | I |
| Avaliação de Impacto na Proteção de Dados (AIPD/FRIA) | I | C | A/R | C | I |
| Desenvolvimento e Validação de Algoritmos | I | C | C | A/R | I |
| Reporte de Alucinações, Desvios Éticos ou Incidentes | I | R | R | R | A/R |

## 10. Sanções e Revisão
O não cumprimento desta política constitui infração grave sujeita a medidas disciplinares e legais. Revisão bienal ou imediata sempre que ocorram alterações regulatórias relevantes ou incidentes graves de IA.
