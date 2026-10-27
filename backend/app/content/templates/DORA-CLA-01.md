---
kind: clause
code: DORA-CLA-01
title: Minuta de Aditamento Contratual para Prestadores de TIC (DORA Art. 30.º)
language: pt-PT
---
# Anexo de Resiliência Operacional e Cláusulas Contratuais Mandatórias DORA
## (Nos termos do Artigo 30.º do Regulamento (UE) 2022/2554)

Entre a **{{ORG}}** (ou cliente assistido no âmbito de CISO-as-a-Service), doravante designada por **Entidade Contratante**, e o **Prestador Terceiro de Serviços de TIC**, doravante designado por **Prestador**, é acordado o presente Aditamento Contratual, que faz parte integrante do Contrato Principal de Prestação de Serviços.

---

### Cláusula 1.ª — Descrição Clara e Níveis de Serviço (Art. 30.º(2)(a))
1. O Prestador compromete-se a fornecer uma descrição exaustiva de todos os serviços de TIC prestados, incluindo a indicação inequívoca se estes suportam uma função crítica ou importante da Entidade Contratante.
2. Os Níveis de Serviço (SLAs) acordados são quantitativos e mensuráveis, fixando-se uma disponibilidade mínima mensal de 99,95% para os serviços nucleares, sob pena de aplicação imediata de créditos de serviço e penalidades contratuais.

### Cláusula 2.ª — Localização de Dados e Criptografia (Art. 30.º(2)(b))
1. O Prestador garante que todo o processamento e armazenamento de dados (incluindo dados pessoais e dados bancários/financeiros) é efetuado estritamente em centros de dados situados no território da União Europeia / Espaço Económico Europeu (ou na jurisdição previamente acordada).
2. Qualquer transferência internacional de dados ou alteração geográfica de servidores está sujeita a notificação prévia por escrito à Entidade Contratante com pelo menos 60 (sessenta) dias de antecedência e aprovação expressa.
3. Os dados devem ser cifrados em trânsito (TLS 1.3) e em repouso (*at-rest*) com algoritmos criptográficos robustos (AES-256 ou equivalente).

### Cláusula 3.ª — Direito Irrestrito de Acesso, Inspeção e Auditoria (Art. 30.º(2)(c) e (3)(e))
1. O Prestador confere à Entidade Contratante, aos seus auditores externos designados e às Autoridades Competentes (nomeadamente o **Banco de Portugal**, o **Banco Central Europeu** e a **EBA**) plenos direitos de acesso a todos os sistemas, instalações físicas, centros de dados, processos, relatórios de auditoria e registos relevantes.
2. O direito de auditoria inclui a realização de inspeções físicas presenciais e auditorias técnicas e operacionais, sem limitação injustificada de âmbito e mediante aviso prévio razoável.
3. O Prestador colabora ativamente e fornece as evidências necessárias aos testes de penetração orientados por ameaças (**TLPT / TIBER-EU**) quando solicitados.

### Cláusula 4.ª — Gestão de Subcontratação em Cadeia / N-th Party (Art. 30.º(2)(a) e Art. 30.º(4))
1. O Prestador não pode subcontratar quaisquer serviços de TIC que suportem funções críticas ou importantes sem a prévia autorização escrita da Entidade Contratante.
2. O Prestador obriga-se a transmitir a toda a cadeia de subcontratantes as mesmas obrigações contratuais em matéria de segurança, auditoria e resiliência previstas no presente anexo.
3. A Entidade Contratante reserva-se o direito de rescindir o contrato caso o Prestador pretenda recorrer a subcontratantes que aumentem o risco de conformidade ou impeçam a supervisão pelas autoridades.

### Cláusula 5.ª — Cooperação e Notificação Imediata de Incidentes (Art. 30.º(2)(f))
1. O Prestador obriga-se a notificar a Entidade Contratante sobre qualquer incidente de segurança com potencial impacto nos serviços contratados no prazo máximo de **2 (duas) horas** após a sua deteção.
2. O Prestador prestará toda a assistência técnica e disponibilizará registos de auditoria e telemetria sem custos adicionais para apoiar o reporte regulamentar da Entidade Contratante ao Banco de Portugal / CNCS.

### Cláusula 6.ª — Estratégias de Saída e Planos de Transição (Art. 30.º(2)(h) e (3)(g))
1. O Prestador assegura a existência de um plano de saída (*Exit Plan*) detalhado e testado, garantindo a continuidade do negócio em caso de resolução contratual.
2. O Prestador prestará serviços de assistência à transição para um novo prestador ou para internalização durante um período mínimo de 180 (cento e oitenta) dias após o termo do contrato, assegurando a devolução e a eliminação segura de todos os dados da Entidade Contratante com certificação formal de destruição.
