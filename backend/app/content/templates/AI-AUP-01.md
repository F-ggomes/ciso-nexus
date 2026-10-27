---
kind: policy
code: AI-AUP-01
title: Política de Utilização Aceitável de IA Generativa e Modelos LLM
language: pt-PT
---
# Política de Utilização Aceitável de IA Generativa e Modelos LLM

| Código | AI-AUP-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento
Com a proliferação de ferramentas de Inteligência Artificial Generativa (ex.: ChatGPT, Claude, Microsoft Copilot, Gemini, Midjourney, ferramentas de assistência a código), a {{ORG}} reconhece o potencial de produtividade destas tecnologias, mas estabelece regras mandatórias para evitar vazamento de dados confidenciais, violações de direitos de autor, dependência cega e alucinações técnicas.

## 2. Objectivos
1. Estabelecer diretrizes claras para o uso seguro de ferramentas de GenAI no trabalho diário.
2. Proibir o envio de dados classificados como Restritos ou Confidenciais para modelos públicos abertos.
3. Prevenir a introdução de código gerado sem auditoria ou vulnerável em software de produção.

## 3. Âmbito
{{SCOPE}}

## 4. Regras Obrigatórias de Utilização
### 4.1. Classificação das Ferramentas de IA
- **Ferramentas Empresariais Autorizadas (Tier 1):** Plataformas contratadas formalmente por {{ORG}} com acordos de proteção de dados (DPA) que garantem expressamente que as interações e prompts **não** são utilizados para treino de modelos (ex.: instâncias dedicadas de Azure OpenAI, Copilot for M365 corporativo). Uso permitido com dados internos.
- **Ferramentas Públicas Gratuitas ou de Consumo (Tier 2):** Versões de livre acesso onde os termos de serviço concedem à entidade fornecedora o direito de retenção e treino dos prompts. **Estritamente proibido** inserir qualquer dado que não seja de domínio público.

### 4.2. O que é ESTRITAMENTE PROIBIDO introduzir em ferramentas de IA:
- Dados pessoais de colaboradores, clientes ou fornecedores (nomes, NIF, dados de contacto, histórico bancário, dados de saúde);
- Segredos comerciais, planos de negócio, preços confidenciais ou documentos contratuais;
- Credenciais, chaves criptográficas, tokens de API, senhas ou certificados;
- Código-fonte proprietário de aplicações da empresa ou de clientes sem autorização explícita do CISO.

### 4.3. Princípio da Verificação Humana (Human-in-the-Loop)
O colaborador que utiliza ferramentas de IA permanece 100% responsável pelo trabalho final entregue. É obrigatório:
1. Validar rigorosamente a veracidade de factos, números e citações (mitigação de alucinações).
2. Revisar código de software gerado por IA antes de qualquer commit, submetendo-o a análise estática e revisão por pares.
3. Assegurar que os conteúdos gerados não infringem direitos de autor ou propriedade intelectual de terceiros.

## 5. Matriz de Requisitos
| Requisito de Segurança | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}

## 6. Papéis e Responsabilidades
- **Colaborador:** Cumprir as regras de entrada de dados e rever os resultados antes de divulgação.
- **Chefias Diretas:** Supervisionar o uso nos respetivos departamentos e canalizar pedidos de novas ferramentas.
- **CISO:** Avaliar termos de serviço e segurança de novas soluções de IA e monitorizar acessos anómalos.
