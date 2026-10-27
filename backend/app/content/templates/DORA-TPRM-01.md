---
kind: policy
code: DORA-TPRM-01
title: Política de Gestão do Risco de Terceiros Prestadores de Serviços TIC (DORA TPRM)
language: pt-PT
---
# Política de Gestão do Risco de Terceiros Prestadores de Serviços TIC (DORA TPRM)

| Código | DORA-TPRM-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Enquadramento e Âmbito
A presente política define os princípios e requisitos para a gestão prudente do risco decorrente da dependência de prestadores terceiros de serviços de tecnologias de informação e comunicação (TIC), em cumprimento dos Artigos 28.º a 44.º do Regulamento (UE) 2022/2554 (DORA), do Regulamento Delegado (UE) 2024/1774 e das diretrizes do Banco de Portugal e BNA.

## 2. Princípios Gerais da Gestão de Fornecedores TIC
1. **Responsabilidade Inalienável:** A {{ORG}} permanece plenamente responsável perante os clientes e reguladores pelo cumprimento de todas as obrigações de resiliência e segurança, independentemente do recurso a terceiros.
2. **Proporcionalidade e Abordagem Baseada no Risco:** O rigor da avaliação prévia e da monitorização contínua é calibrado em função do suporte prestado a funções críticas ou importantes.
3. **Prevenção do Risco de Concentração:** Avaliação contínua de dependências excessivas em relação a um único fornecedor TIC ou fornecedores interconectados difíceis de substituir.

## 3. Ciclo de Vida da Relação Contratual com Fornecedores TIC
### 3.1. Due Diligence Pré-Contratual
Antes da celebração de qualquer contrato de serviços TIC, deve ser realizada avaliação que inclui:
- Análise de solidez financeira, reputação no mercado e capacidade técnica do fornecedor;
- Verificação de certificações de segurança válidas (ISO/IEC 27001, SOC 2 Type II, PCI DSS);
- Análise da localização geográfica do tratamento e armazenamento de dados;
- Análise de riscos de subcontratação em cadeia (sub-processamento).

### 3.2. Cláusulas Contratuais Obrigatórias (Art. 30.º DORA)
Todos os contratos de serviços TIC devem conter expressamente:
- Descrição clara de serviços, níveis de serviço (SLAs) e localização de armazenamento de dados;
- Obrigação de apoio e cooperação em caso de incidentes TIC sem custos adicionais;
- Direito incondicional de acesso, inspeção e auditoria pela {{ORG}} e pelas autoridades competentes;
- Prazos de pré-aviso adequados para alterações substanciais ou rescisão;
- Requisitos de continuidade de negócio e realização de testes conjuntos de recuperação.

### 3.3. Serviços que Suportam Funções Críticas ou Importantes
Para fornecedores que suportem funções críticas:
- Devem ser definidos objetivos rigorosos de recuperação (RTO e RPO);
- É obrigatório dispor de uma **Estratégia de Saída (Exit Strategy)** formalizada e testada, assegurando a transição para outro prestador ou a internalização do serviço sem perturbação das operações financeiras;
- O fornecedor deve notificar previamente e obter consentimento para subcontratação de qualquer componente essencial do serviço.

## 4. Registo de Informação e Reporte Regulatório
A organização mantém atualizado o Registo de Informação de acordos contratuais TIC de acordo com o Regulamento de Execução (UE) 2024/2956, disponibilizando-o anualmente às autoridades de supervisão.

## 5. Matriz de Requisitos
| Requisito DORA | Controlo / Secção |
|---|---|
{{REQUIREMENT_MATRIX}}

## 6. Papéis e Responsabilidades
- **Administração:** Aprovação da política, aprovação de contratos para funções críticas e revisão anual da exposição ao risco de terceiros.
- **CISO:** Avaliação técnica de segurança de terceiros, monitorização de vulnerabilidades e supervisão de testes.
- **Gestão de Compras/Contratos:** Manutenção do registo de informação e negociação das cláusulas obrigatórias.
