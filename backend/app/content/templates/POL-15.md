---
kind: policy
code: POL-15
title: Política de Retenção, Arquivo e Destruição Segura de Dados e Suportes
language: pt-PT
---
# Política de Retenção, Arquivo e Destruição Segura de Dados e Suportes

| Código | POL-15 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir os princípios, prazos e métodos normalizados para a retenção controlada, arquivo e eliminação irreversível de dados digitais e suportes físicos de armazenamento em {{ORG}}, assegurando o cumprimento dos prazos legais aplicáveis e evitando a retenção desnecessária ou o descarte negligente de informações sensíveis, de acordo com os controlos 8.10 e 8.14 da ISO/IEC 27002:2022 e com o RGPD.

## 2. Princípios Gerais de Retenção e Conservação
1. **Minimização da Conservação:** Os dados pessoais não devem ser conservados por mais tempo do que o estritamente necessário para as finalidades para as quais foram recolhidos (Art. 5.º(1)(e) do RGPD).
2. **Cumprimento de Prazos Legais Obrigatórios:**
   - Documentação fiscal, contabilística e faturas: 10 anos (Código Comercial / Código do IRC);
   - Registos de relações laborais e recursos humanos: 5 anos após a cessação do contrato;
   - Registos de logs e eventos de cibersegurança: mínimo de 12 meses (NIS2 / DORA);
   - Imagens de videovigilância (CCTV): máximo estrito de 30 dias (Lei 58/2019 / Lei 22/11).

## 3. Métodos Normalizados de Destruição Segura
| Suporte / Meio | Classificação da Informação | Método de Destruição Obrigatório | Norma / Padrão Aplicável |
|---|---|---|---|
| **Papel e Documentos Físicos** | Interna, Restrita ou Confidencial | Trituração mecânica em fragmentos cruzados | Norma DIN 66399 nível P-4 ou superior |
| **Discos Rígidos Magnéticos (HDD)** | Restrita ou Confidencial | Desmagnetização por Degausser profissional e/ou perfuração mecânica física | NIST SP 800-88 Rev. 1 (Purge/Destroy) |
| **Unidades de Estado Sólido (SSD / Flash)** | Restrita ou Confidencial | Comando de Apagamento Criptográfico Seguro (Cryptographic Erase) e trituração física | NIST SP 800-88 Rev. 1 (Destroy) |
| **Armazenamento em Nuvem / Ficheiros Digitais** | Todos os níveis | Sobrescrita lógica irrecuperável e destruição de chaves de cifra de envelope | Padrão Zero-Fill / Crypto-Shredding |

## 4. Certificado de Destruição Segura e Registo
Qualquer operação de abate físico de equipamentos de armazenamento de dados deve ser executada por empresa certificada ou pelo gestor de TI interno, com emissão e arquivo de **Certificado de Destruição Segura**, contendo o número de série dos equipamentos, método utilizado, data e assinatura dos responsáveis.

## 5. Matriz de Requisitos
| Requisito Legal / Normativo | Secção Correspondente |
|---|---|
{{REQUIREMENT_MATRIX}}
