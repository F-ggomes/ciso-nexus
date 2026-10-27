---
kind: procedure
code: PRIV-DPIA-01
title: Procedimento e Modelo de Avaliação de Impacto sobre a Proteção de Dados (AIPD / DPIA)
language: pt-PT
---
# Procedimento e Modelo de Avaliação de Impacto sobre a Proteção de Dados (AIPD / DPIA)

| Código | PRIV-DPIA-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Estabelecer a metodologia para identificar, analisar e mitigar os riscos para os direitos e liberdades dos titulares de dados em operações de tratamento suscetíveis de implicar um risco elevado, em cumprimento do Artigo 35.º do RGPD, das orientações da CNPD e da Lei n.º 22/11 de Angola.

## 2. Âmbito
{{SCOPE}}

## 3. Requisitos Normativos
{{REQUIREMENTS}}

## 4. Gatilhos de Obrigatoriedade de AIPD (Critérios CNPD / EDPB)
A realização de AIPD é obrigatória sempre que o tratamento satisfaça 2 ou mais dos seguintes critérios:
1. Avaliação ou pontuação (profiling e predição);
2. Tomada de decisões automatizadas com efeitos jurídicos ou com impacto significativo similar;
3. Monitorização sistemática (videovigilância extensiva, monitorização telemática de colaboradores);
4. Tratamento de categorias especiais de dados (saúde, dados biométricos, dados judiciais);
5. Tratamento de dados em grande escala;
6. Cruzamento ou combinação de conjuntos de dados provenientes de fontes distintas;
7. Dados relativos a titulares vulneráveis (menores, colaboradores, idosos);
8. Utilização inovadora ou aplicação de novas tecnologias (IA, reconhecimento facial, IoT);
9. Tratamento que impeça os titulares de exercer um direito ou de utilizar um serviço.

## 5. Etapas do Processo de Avaliação
### Etapa 1: Descrição Detalhada do Tratamento
- Natureza, âmbito, contexto e finalidades do tratamento;
- Categorias de titulares e categorias de dados pessoais recolhidos;
- Fluxo de dados (mapa de recolha, armazenamento, processadores e transferências internacionais);
- Prazos de conservação previstos.

### Etapa 2: Avaliação de Necessidade e Proporcionalidade
- Verificação da base de licitude (Art. 6.º e 9.º do RGPD);
- Princípio da minimização: demonstração de que a finalidade não pode ser alcançada com menos dados;
- Medidas de transparência e informação aos titulares.

### Etapa 3: Identificação e Avaliação dos Riscos
Análise de cenários de ameaça (acesso não autorizado, perda de integridade, indisponibilidade temporária, uso indevido) e cálculo do risco:
- **Gravidade do Impacto nos Titulares:** Baixa (desconforto mínimo), Média (inconveniência significativa), Alta (perda financeira grave, discriminação ou dano à reputação).
- **Probabilidade de Ocorrência:** Rara, Improvável, Provável, Quase Certa.

### Etapa 4: Medidas de Mitigação Planeadas
- Técnicas: Cifragem (AES-256), pseudonimização, MFA, controlo de acessos por perfil (RBAC), logs auditáveis;
- Organizativas: Políticas internas, acordos de confidencialidade, formação de colaboradores, acordos de subcontratação (DPA).

### Etapa 5: Parecer do DPO e Aprovação
O Encarregado de Proteção de Dados (DPO) emite parecer formal obrigatório. Se após a aplicação das medidas de mitigação o risco residual permanecer elevado, a organização é obrigada a consultar previamente a autoridade de controlo competente (CNPD / APD) nos termos do Artigo 36.º do RGPD.

## 6. Matriz de Requisitos
| Requisito Legal | Secção Correspondente |
|---|---|
{{REQUIREMENT_MATRIX}}
