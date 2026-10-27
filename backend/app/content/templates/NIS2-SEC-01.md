---
kind: policy
code: NIS2-SEC-01
title: Política de Medidas Técnicas, Operacionais e Organizativas de Cibersegurança (NIS2 / DL 125/2025)
language: pt-PT
---
# Política de Medidas Técnicas, Operacionais e Organizativas de Cibersegurança (NIS2 / DL 125/2025)

| Código | NIS2-SEC-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Compromisso da Administração
A Administração de {{ORG}} aprova a presente política para assegurar a implementação eficaz, proporcional e auditável das medidas de gestão dos riscos de cibersegurança exigidas pelo Artigo 21.º da Diretiva (UE) 2022/2555 (NIS2), pelo Decreto-Lei n.º 125/2025 (Regime Geral de Cibersegurança em Portugal) e pelas diretrizes do Centro Nacional de Cibersegurança (CNCS).

## 2. Responsabilidade Pessoal dos Órgãos de Gestão
Nos termos do Artigo 20.º da NIS2 e legislação nacional:
- Os membros do órgão de administração são pessoalmente responsáveis por aprovar as medidas de gestão de riscos de cibersegurança e supervisionar a sua execução;
- Os administradores frequentam formação regular obrigatória em cibersegurança para adquirir conhecimentos e competências suficientes para avaliar riscos e o respetivo impacto na organização.

## 3. As 10 Medidas Obrigatórias de Cibersegurança (Art. 21.º NIS2)
| # | Medida Obrigatória NIS2 | Implementação Prática em {{ORG}} |
|---|---|---|
| **1** | Políticas relativas à análise de riscos e à segurança dos sistemas de informação | Metodologia formal ISO 27005 / CISO Nexus com atualização anual e análise de impacto operacional. |
| **2** | Tratamento e gestão de incidentes | Procedimento PRC-03 / NIS2-PRC-01 com escalação imediata e reporte em 24h/72h ao CSIRT nacional (CERT.PT / CNCS). |
| **3** | Continuidade de negócio e gestão de crises | Planos BCP/DRP com testes semestrais, gestão de cópias de segurança imutáveis e procedimentos de contingência. |
| **4** | Segurança da cadeia de abastecimento | Avaliação de segurança de fornecedores diretos e prestadores de serviços de desenvolvimento de software e cloud. |
| **5** | Segurança na aquisição, desenvolvimento e manutenção de sistemas | Ciclo de vida de desenvolvimento seguro (SDLC), gestão e divulgação coordenada de vulnerabilidades (CVDP). |
| **6** | Políticas e procedimentos para avaliar a eficácia dos controlos | Auditorias internas semestrais, testes de intrusão anuais e exercícios de simulação de crise. |
| **7** | Práticas básicas de ciber-higiene e formação em cibersegurança | Formação obrigatória semestral para todos os colaboradores e testes periódicos de phishing. |
| **8** | Políticas sobre a utilização de criptografia e cifragem | Cifragem generalizada de dados em trânsito (TLS 1.3) e em repouso (AES-256) de acordo com a POL-11. |
| **9** | Segurança dos recursos humanos e controlo de acessos | Política de controlo de acessos baseada no menor privilégio (POL-02) e gestão rigorosa de ativos (PROC-02). |
| **10** | Autenticação multifator (MFA) e comunicações seguras | MFA obrigatório em todos os acessos remotos e administrativos; canais de voz e texto cifrados em emergência. |

## 4. Matriz de Requisitos
| Requisito Legal NIS2 | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}

## 5. Auditoria e Sanções
O não cumprimento das medidas de cibersegurança sujeita os responsáveis e a organização a sanções administrativas e contraordenacionais severas, incluindo multas até 10 milhões de euros ou 2% do volume de negócios mundial total para entidades essenciais.
