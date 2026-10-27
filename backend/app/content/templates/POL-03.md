---
kind: policy
code: POL-03
title: Política de Classificação, Rotulagem e Manuseamento da Informação
language: pt-PT
---
# Política de Classificação, Rotulagem e Manuseamento da Informação

| Código | POL-03 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Objectivo
A informação é um dos ativos mais críticos de {{ORG}}. A presente política estabelece o modelo de classificação de segurança da informação, regras de rotulagem e procedimentos para o seu armazenamento, transmissão e destruição segura, alinhada com os controlos 5.12 e 5.13 da ISO/IEC 27002:2022 e a Decisão do Conselho 2013/488/UE.

## 2. Níveis de Classificação da Informação
| Nível | Rótulo / Classificação | Descrição e Critérios de Impacto | Exemplos Típicos | Mapeamento TLP 2.0 |
|---|---|---|---|---|
| **1** | **Pública** | Informação cuja divulgação não causa qualquer prejuízo à organização nem aos seus clientes ou parceiros. | Comunicados de imprensa, brochuras comerciais, documentação pública de produtos. | TLP:CLEAR |
| **2** | **Interna (Uso Interno)** | Informação para circulação exclusiva entre colaboradores e parceiros autorizados; a divulgação pública pode causar desconforto operacional menor. | Políticas internas, organogramas, procedimentos operacionais, atas de reuniões gerais. | TLP:GREEN |
| **3** | **Restrita** | Informação sensível cuja divulgação indevida pode causar danos financeiros, regulatórios ou reputacionais significativos. | Dados pessoais de clientes, contratos comerciais, planos de projeto, relatórios financeiros trimestrais. | TLP:AMBER |
| **4** | **Confidencial / Secreta** | Informação crítica de valor estratégico supremo cuja divulgação causa danos catastróficos, perda de vantagens competitivas ou infração penal. | Chaves privadas criptográficas, credenciais de produção, segredos comerciais, código-fonte proprietário sensível. | TLP:RED |

## 3. Regras Obrigatórias de Rotulagem
- **Documentos Digitais:** Cabeçalho ou rodapé em todas as páginas com a menção da classificação em maiúsculas (ex.: `[CONFIDENCIAL - {{ORG}}]`);
- **Assuntos de Correio Eletrónico:** Inclusão do rótulo no assunto quando o conteúdo for Restrito ou Confidencial (ex.: `[RESTRICTED] Relatório de Auditoria`);
- **Repositórios de Código e Ficheiros:** Metadados e etiquetas automáticas de classificação no sistema de armazenamento cloud e nos repositórios Git.

## 4. Regras de Manuseamento e Transmissão
1. **Transmissão Externa de Informação Restrita e Confidencial:** Deve ser sempre protegida por encriptação forte em trânsito (TLS 1.3 / ficheiros cifrados com chave trocada fora-de-banda).
2. **Armazenamento:** Informação Confidencial deve ser obrigatoriamente cifrada em repouso (AES-256) com controlo de acessos granular estrito (Need-to-Know).
3. **Impressão:** Proibida a impressão de informação Confidencial sem autorização expressa do respetivo proprietário. Documentos impressos devem ser recolhidos de imediato da impressora e guardados sob chave.
4. **Desclassificação:** A reclassificação para um nível inferior de segurança só pode ser autorizada pelo respetivo Proprietário do Ativo de Informação.

## 5. Matriz de Requisitos
| Requisito ISO 27001 | Secção da Política |
|---|---|
{{REQUIREMENT_MATRIX}}
