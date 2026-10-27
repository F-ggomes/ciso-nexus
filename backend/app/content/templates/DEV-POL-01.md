---
kind: policy
code: DEV-POL-01
title: Política de Ciclo de Vida de Desenvolvimento Seguro (SDLC)
language: pt-PT
---
# Política de Ciclo de Vida de Desenvolvimento Seguro (SDLC)

| Código | DEV-POL-01 | Versão | {{VERSION}} | Proprietário | Tech Lead / Security Champion |
|---|---|---|---|---|---|
| Aprovado por | Direção de Tecnologia / CISO | Data | {{DATE}} | Revisão | 12 meses |
| Âmbito Legal | Regulamento Ciber-Resiliência (CRA 2024/2847) · NIS2 · NIST SSDF (SP 800-218) · ISO 27001 A.8.25 |

## 1. Objectivo
Garantir que todos os produtos digitais, aplicações web, móveis, serviços SaaS e componentes de software desenvolvidos pela {{ORG}} incorporam segurança por conceção (*Security by Design*) e segurança por defeito (*Security by Default*), em cumprimento dos requisitos essenciais de cibersegurança do Cyber Resilience Act da União Europeia e das melhores práticas do NIST SSDF.

## 2. Âmbito
Aplica-se ao desenvolvimento de produtos e software não financeiro comercializados, licenciados ou operados para clientes pela {{ORG}}, abrangendo equipas de engenharia interna, prestadores em regime de *nearshoring* e mantenedores de código aberto.

## 3. Requisitos do Regulamento de Ciber-Resiliência (CRA 2024/2847)
1. **Segurança por Defeito (Art. 10.º):** Os produtos com elementos digitais devem ser fornecidos sem vulnerabilidades conhecidas exploráveis, com configurações seguras ativadas por omissão, sem palavras-passe de fábrica partilhadas e com interfaces de depuração estritamente desativadas em produção.
2. **Software Bill of Materials (SBOM):** É obrigatória a geração automática de um ficheiro SBOM legível por máquina no formato padronizado CycloneDX ou SPDX para cada versão lançada, identificando todos os componentes diretos e transitórios.
3. **Prazo de Suporte de Segurança:** A equipa técnica deve definir e publicar o período de suporte durante o qual serão fornecidas atualizações de segurança gratuitas (mínimo legal: 5 anos ou a vida útil prevista do produto).
4. **Divulgação Coordenada de Vulnerabilidades:** É obrigatória a existência de um canal público e seguro (ex.: ficheiro `security.txt` e endereço de contacto) para reporte de vulnerabilidades por investigadores externos, com triagem inicial em menos de 48 horas.

## 4. Fases do Ciclo de Vida de Desenvolvimento Seguro (SDLC)
### 4.1. Modelação de Ameaças (Threat Modeling)
Na fase de desenho de arquitetura de cada nova funcionalidade relevante, a equipa realiza uma sessão de modelação de ameaças (metodologia STRIDE ou MITRE ATT&CK) para identificar vetores de risco e estabelecer controlos atenuantes antes da escrita de código.

### 4.2. Codificação Segura e Análise Estática
1. Adoção das regras do OWASP ASVS v4.0 Nível 2.
2. Verificação estática diária de código (SAST) integrada no Git, inspecionando memory safety, validação de inputs e autorização segura.
3. Gestão estrita de segredos: chaves de API, credenciais e certificados devem ser injetados exclusivamente em tempo de execução via gestor de segredos (HashiCorp Vault / AWS Secrets Manager / Azure Key Vault).

### 4.3. Testes Dinâmicos e Aceitação
1. Execução de testes de regressão de segurança e DAST nos pipelines de homologação.
2. Varimento contínuo de contentores Docker e imagens base contra a base de dados do CISA KEV (Known Exploited Vulnerabilities).

## 5. Auditorias e Conformidade
A conformidade desta política é verificada através de auditorias de código semestrais e testes de intrusão externos anuais.
