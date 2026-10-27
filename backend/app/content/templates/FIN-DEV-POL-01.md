---
kind: policy
code: FIN-DEV-POL-01
title: Política de Desenvolvimento Seguro de Software Financeiro
language: pt-PT
---
# Política de Desenvolvimento Seguro de Software Financeiro

| Código | FIN-DEV-POL-01 | Versão | {{VERSION}} | Proprietário | Head of Engineering / CISO |
|---|---|---|---|---|---|
| Aprovado por | Comissão Executiva / Administração | Data | {{DATE}} | Revisão | 12 meses |
| Âmbito Legal | DORA Art. 16.º a 18.º · PCI-DSS v4.0 Req. 6 · EBA GL 2019/04 · BdP Aviso 3/2020 · BNA |

## 1. Declaração da Gestão e Objectivo
A Administração da {{ORG}} estabelece a presente política para assegurar que todas as aplicações e componentes de software que suportem funções bancárias, de pagamento, de crédito ou de custódia de activos são concebidas, desenvolvidas, testadas e mantidas de acordo com os mais elevados padrões de segurança e resiliência operacional digital.

## 2. Âmbito
Aplica-se a todos os sistemas de software financeiro desenvolvidos internamente ou por prestadores terceiros para {{ORG}} e respetivos clientes de CISO-as-a-Service, abrangendo o código-fonte, APIs bancárias (Open Banking/PSD2), pipelines de CI/CD, bibliotecas de terceiros e dependências de código aberto.

## 3. Requisitos Mandatórios de Desenvolvimento Seguro
### 3.1. Práticas de Codificação Segura (DORA Art. 16.º & PCI-DSS Req. 6.2)
1. É obrigatória a adesão ao padrão OWASP Top 10 e OWASP ASVS (Application Security Verification Standard) Nível 3 para todos os componentes de processamento financeiro.
2. Todas as entradas de utilizador e mensagens interbancárias devem ser validadas contra listas brancas estritas, prevenindo injeções de SQL, manipulação de parâmetros, desserialização insegura e ataques a APIs.
3. Proibição estrita de credenciais, chaves criptográficas de teste, tokens de acesso ou segredos embebidos em repositórios de código (*hardcoded secrets*).

### 3.2. Segregação Absoluta de Ambientes (DORA Art. 17.º & BdP Aviso 3/2020)
1. Os ambientes de Desenvolvimento, Teste/Homologação e Produção devem ser física e logicamente segregados, com redes, contas de nuvem e bases de dados isoladas.
2. É terminantemente proibida a utilização de dados reais de clientes bancários (PAN de cartões, saldos, NIF, dados de transação) em ambientes não produtivos. Dados de teste devem ser sintéticos ou anonimizados irreversivelmente.
3. Os programadores não possuem permissões de escrita ou acesso administrativo direto ao ambiente de produção bancário.

### 3.3. Pipelines de CI/CD e Portas de Qualidade (Quality Gates)
1. **SAST (Static Application Security Testing):** Executado em cada *Pull Request*. Qualquer vulnerabilidade de severidade Crítica ou Alta bloqueia a compilação (*pipeline breaker*).
2. **SCA (Software Composition Analysis) & SBOM:** Inventariação automática de todos os pacotes e dependências (CycloneDX/SPDX). Bloqueio imediato de bibliotecas com CVEs críticas conhecidas (CVSS ≥ 7.0) ou licenças incompatíveis.
3. **DAST & IAST:** Testes dinâmicos e testes de segurança de APIs executados automaticamente no ambiente de homologação.
4. **Assinatura Criptográfica:** Todos os artefactos, contentores Docker e binários libertados para produção devem ser assinados criptograficamente na pipeline (Cosign / Sigstore).

## 4. Testes de Penetração e Avaliação de Ameaças Avançadas (TLPT / TIBER-EU)
Nos termos dos artigos 26.º e 27.º do DORA e do framework TIBER-PT do Banco de Portugal, o software financeiro deve ser sujeito a testes de intrusão anuais independentes e, para funções críticas nucleares, a testes orientados por inteligência de ameaças (Threat-Led Penetration Testing).

## 5. Gestão de Mudanças e Aprovação Quádrupla (SoD)
Nenhuma alteração a software financeiro é promovida a produção sem:
1. Revisão por pares (*Peer Review*) documentada por um segundo engenheiro sénior.
2. Aprovação formal do Product Owner e do Responsável de Segurança Aplicacional.
3. Registo imutável de rastreabilidade (Ticket Jira/Git Commit/SHA-256 do artefacto).

## 6. Revisão e Auditoria
Esta política é auditada semestralmente e revista anualmente ou mediante qualquer alteração relevante nas Orientações da EBA ou Avisos do Banco de Portugal / BNA.
