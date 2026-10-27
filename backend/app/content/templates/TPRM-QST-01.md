---
kind: guideline
code: TPRM-QST-01
title: Questionário Padrão de Avaliação de Segurança de Terceiros e Fornecedores
language: pt-PT
---
# Questionário Padrão de Avaliação de Segurança de Terceiros e Fornecedores

| Código | TPRM-QST-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Este documento constitui o questionário padrão de due diligence de segurança da informação e conformidade regulamentar que deve ser preenchido por prestadores de serviços e fornecedores de tecnologia antes da sua contratação por {{ORG}}.

## 2. Domínios de Avaliação e Questões de Verificação
### Secção 1: Governação e Certificações
1. A organização possui um Sistema de Gestão de Segurança da Informação (SGSI) formalmente certificado segundo a ISO/IEC 27001 ou relatório SOC 2 Tipo II emitido nos últimos 12 meses? (Sim/Não - Anexar cópia do certificado válido).
2. Existe um CISO ou responsável designado pela segurança da informação com reporte à Administração?

### Secção 2: Proteção de Dados e RGPD
3. Em que jurisdições e centros de dados geográficos serão armazenados ou tratados os dados da {{ORG}}?
4. A organização assume contratualmente as cláusulas do Artigo 28.º do RGPD através de Data Processing Agreement (DPA)?
5. Qual é o procedimento e prazo máximo para notificação da {{ORG}} em caso de violação de dados pessoais (ex.: limite máximo de 24 horas)?

### Secção 3: Controlo de Acessos e Criptografia
6. A Autenticação Multifator (MFA) é obrigatória para todos os colaboradores que acedam à infraestrutura e ambientes que suportam o serviço?
7. Os dados são cifrados em repouso (mínimo AES-256) e em trânsito (mínimo TLS 1.3)? Quem detém a custódia das chaves de encriptação?

### Secção 4: Gestão de Vulnerabilidades e Desenvolvimento Seguro
8. Com que frequência são realizados testes de intrusão independentes (Penetration Testing) à aplicação e infraestrutura?
9. Os ambientes de desenvolvimento, teste e produção estão estritamente segregados com proibição de uso de dados reais de produção em testes?

### Secção 5: Continuidade de Negócio e Gestão de Incidentes
10. O fornecedor possui Plano de Continuidade de Negócio (BCP) e Recuperação de Desastres (DRP) testado nos últimos 12 meses? Quais são os RTO e RPO garantidos contratualmente?
11. Em caso de rescisão, o fornecedor compromete-se a prestar apoio na transição para outro fornecedor e a emitir certificado de destruição irreversível dos dados?

## 3. Matriz de Requisitos
| Domínio de Avaliação | Requisito DORA / ISO 27001 |
|---|---|
{{REQUIREMENT_MATRIX}}
