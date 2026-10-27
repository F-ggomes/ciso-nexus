---
kind: procedure
code: PRIV-BREACH-01
title: Procedimento e Modelo de Notificação de Violação de Dados Pessoais (Data Breach)
language: pt-PT
---
# Procedimento e Modelo de Notificação de Violação de Dados Pessoais (Data Breach)

| Código | PRIV-BREACH-01 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Definir o procedimento operacional de deteção, contenção, investigação, classificação e notificação de incidentes que resultem na destruição, perda, alteração acidental ou ilícita, ou na divulgação ou acesso não autorizados a dados pessoais, nos termos dos Artigos 33.º e 34.º do RGPD e da Lei n.º 22/11.

## 2. Âmbito
{{SCOPE}}

## 3. Requisitos e Prazos Críticos Regulatórios
| Destinatário da Notificação | Gatilho / Condição | Prazo Máximo Regulatório |
|---|---|---|
| **Autoridade de Controlo (CNPD / APD)** | Violação suscetível de resultar num risco para os direitos e liberdades dos titulares. | **Até 72 horas** após ter conhecimento do incidente. |
| **Titulares dos Dados** | Violação suscetível de implicar um **risco elevado** para os seus direitos e liberdades. | **Sem demora injustificada** (comunicação direta clara e acessível). |
| **Registo Interno de Incidentes** | **Todas as violações**, independentemente do nível de risco. | Imediato (documentando factos, efeitos e medidas corretivas). |

## 4. Fases Operacionais de Resposta
### Fase 1: Deteção e Contenção Imediata (0h - 12h)
- Qualquer colaborador ou terceiro que detete um potencial incidente deve comunicar de imediato ao CISO e ao DPO.
- A equipa técnica isola os sistemas afetados, revoga credenciais comprometidas e bloqueia fluxos não autorizados sem destruir provas digitais.

### Fase 2: Investigação e Avaliação do Risco (12h - 36h)
O CISO e o DPO determinam:
1. Natureza da violação (confidencialidade, integridade ou disponibilidade);
2. Categorias e número aproximado de titulares e de registos de dados pessoais afetados;
3. Se os dados afetados estavam cifrados ou pseudonimizados com chaves seguras;
4. Gravidade das potenciais consequências (roubo de identidade, fraude financeira, dano reputacional).

### Fase 3: Notificação à Autoridade de Controlo (CNPD / APD) (Até 72h)
Se existir risco, o DPO submete o formulário eletrónico oficial contendo:
- Descrição da natureza do incidente;
- Contacto do DPO para obtenção de informações adicionais;
- Consequências prováveis do incidente;
- Medidas adotadas ou propostas para reparar e atenuar os efeitos negativos.
*Nota: Se não for possível prestar todas as informações em simultâneo, a informação pode ser fornecida por fases sem demora injustificada.*

### Fase 4: Comunicação aos Titulares (se aplicável)
Redação de mensagem clara contendo a natureza do incidente, recomendações práticas aos titulares (ex.: alteração de senhas, monitorização de extratos bancários) e medidas já tomadas pela empresa.

### Fase 5: Lições Aprendidas e Registo de Violações
Elaboração de relatório pós-incidente, atualização do Registo de Incidentes de Dados Pessoais e implementação de medidas preventivas permanentes.

## 5. Matriz de Requisitos
| Requisito | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}
