---
kind: process
code: RISK-MET-01
title: Metodologia e Matriz de Avaliação do Risco de Segurança da Informação (ISO 27005)
language: pt-PT
---
# Metodologia e Matriz de Avaliação do Risco de Segurança da Informação (ISO 27005)

| Código | RISK-MET-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo e Enquadramento
Estabelecer a metodologia padronizada de identificação, análise, cálculo e avaliação dos riscos de segurança da informação e resiliência cibernética em {{ORG}}, alinhada com as normas ISO/IEC 27005:2022, ISO 31000:2018 e as diretrizes do NIST CSF 2.0 e DORA.

## 2. Abordagem de Avaliação Baseada em Ativos e Cenários
A avaliação de risco é orientada para:
1. **Ativos Primários:** Processos de negócio, funções críticas, bases de dados e informação confidencial;
2. **Ativos de Suporte:** Servidores, serviços cloud, redes de telecomunicações, aplicações, pessoas e instalações físicas;
3. **Cenários de Ameaça:** Combinação de ameaças ativas (ex.: ransomware, fraude interna, falha de fornecedor) com vulnerabilidades existentes.

## 3. Escala de Impacto (Gravidade: 1 a 5)
O impacto é avaliado pelo pior cenário entre as dimensões de Confidencialidade, Integridade, Disponibilidade, Perda Financeira e Incumprimento Legal:
- **1 - Insignificante:** Sem impacto em clientes; perdas financeiras desprezíveis (< 1.000 €); sem violação legal.
- **2 - Menor:** Pequena perturbação operacional (< 2 horas); perda financeira baixa (< 10.000 €); sem quebra de dados pessoais.
- **3 - Moderado:** Indisponibilidade parcial de serviços (< 8 horas); perda financeira média (< 50.000 €); notificação interna necessária.
- **4 - Grave:** Interrupção de funções críticas (> 8 horas); perda financeira elevada (< 250.000 €); violação de dados pessoais comunicável à CNPD/APD; impacto reputacional público na imprensa.
- **5 - Catastrófico:** Interrupção prolongada com quebra de SLAs regulatórios; multas substanciais (> 250.000 €); ameaça à continuidade do negócio ou revogação de licença bancária/operacional.

## 4. Escala de Probabilidade (Frequência: 1 a 5)
- **1 - Rara:** Concebível mas altamente improvável; histórico nulo na empresa e setor (menos de uma vez em 5 anos).
- **2 - Improvável:** Pouco provável de ocorrer; controlos robustos implementados (uma vez a cada 3 a 5 anos).
- **3 - Possível:** Pode ocorrer ocasionalmente; controlos parciais (uma vez por ano).
- **4 - Provável:** Muito suscetível de ocorrer; controlos fracos ou ausentes (uma vez a cada trimestre).
- **5 - Quase Certa:** Evento contínuo ou iminente; ameaça ativa diária ou semanal (mensal ou mais frequente).

## 5. Matriz de Risco 5x5 e Níveis de Apetite ao Risco
A pontuação de risco resulta da multiplicação: **Nível de Risco = Probabilidade × Impacto (1 a 25)**.

| Nível / Intervalo | Classificação do Risco | Tratamento Obrigatório e Decisão de Gestão | Apetite pelo Risco |
|---|---|---|---|
| **1 a 5** | **Baixo** | Risco aceitável. Monitorização no ciclo anual regular. | Abaixo de {{ACCEPT_BELOW}}: **Aceitável** |
| **6 a 12** | **Médio** | Risco tolerável mediante plano de mitigação com prazos até 6 meses. | Sob monitorização |
| **15 a 25** | **Alto / Extremo** | **Inaceitável.** Exige escalação imediata à Administração (acima de {{ESCALATE_AT}}), plano de ação urgente (30 dias) ou interrupção da atividade. | **Excede o Apetite** |

## 6. As 4 Opções de Tratamento do Risco
1. **Mitigar / Reduzir:** Aplicação de controlos técnicos e organizativos para diminuir a probabilidade ou o impacto;
2. **Evitar:** Descontinuação do processo, sistema ou relação com o terceiro que origina o risco;
3. **Transferir / Partilhar:** Contratação de seguro de ciber-risco ou transferência contratual de responsabilidade;
4. **Aceitar:** Decisão formal e fundamentada da Administração quando o custo do controlo excede o impacto potencial.

## 7. Matriz de Requisitos
| Requisito ISO 27005 | Secção Correspondente |
|---|---|
{{REQUIREMENT_MATRIX}}
