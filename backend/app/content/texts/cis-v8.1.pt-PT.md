---
framework_id: cis-v8.1
title: CIS Critical Security Controls v8.1 — Guia de implementação (redação própria)
language: pt-PT
doc_type: summary
source_url: https://www.cisecurity.org/controls/v8-1
retrieved: 2026-10-25
licence: Guia original da CISO Nexus; os CIS Controls estão sob CC BY-NC-ND 4.0 e não são reproduzidos nem adaptados.
---

## [1] Inventário e controlo de activos empresariais

**Objetivo.** Saber que equipamentos existem, onde estão e quem responde por eles, incluindo dispositivos móveis, IoT e recursos cloud. Sem esta visibilidade, nenhum outro controlo pode ser aplicado de forma completa.

**O que implementar.**

- Básico (IG1): manter uma lista única de equipamentos com dono, localização e função, e revê-la com regularidade.
- Básico (IG1): definir o que acontece quando aparece um equipamento desconhecido na rede: bloquear, isolar ou regularizar.
- Intermédio (IG2): alimentar o inventário automaticamente com descoberta ativa na rede e com dados de DHCP e de gestão de endpoints.
- Avançado (IG2/IG3): acrescentar descoberta passiva para apanhar equipamentos que não respondem a varrimentos.
- Avançado (IG3): integrar o inventário com o controlo de acesso à rede, para que só equipamentos conhecidos se liguem.

**Evidências para auditoria.**

- Exportação do inventário com data de última atualização por equipamento.
- Relatório de equipamentos não autorizados detetados e respetivo tratamento.
- Configuração das ferramentas de descoberta.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.9`; NIS2 `Art. 21(2)(i)`; DORA `Art. 8`; NIST CSF 2.0 `ID.AM-01`.

## [2] Inventário e controlo de activos de software

**Objetivo.** Conhecer o software instalado e garantir que só corre software autorizado e suportado. Software desconhecido ou sem suporte é uma das portas de entrada mais comuns para atacantes.

**O que implementar.**

- Básico (IG1): manter uma lista de software autorizado, com versão e fabricante, e identificar o que já não tem suporte.
- Básico (IG1): remover ou justificar formalmente software não autorizado encontrado nos equipamentos.
- Intermédio (IG2): recolher o inventário de software automaticamente através das ferramentas de gestão de endpoints.
- Intermédio (IG2): impedir a execução de aplicações não aprovadas através de listas de permissão.
- Avançado (IG3): estender o controlo por listas de permissão a bibliotecas e scripts, assinados quando possível.

**Evidências para auditoria.**

- Lista de software autorizado aprovada.
- Relatório de software sem suporte com plano de remoção.
- Política de controlo de aplicações ativa nos endpoints.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.9` e `A.8.19`; NIST CSF 2.0 `ID.AM-02` e `PR.PS-05`; DORA `Art. 8`.

## [3] Protecção de dados

**Objetivo.** Identificar, classificar e proteger os dados ao longo do seu ciclo de vida, de modo a que a proteção seja proporcional à sensibilidade. Os dados são, em última análise, o alvo da maioria dos ataques.

**O que implementar.**

- Básico (IG1): definir um processo de gestão de dados com donos, prazos de conservação e regras de eliminação segura.
- Básico (IG1): cifrar dados em dispositivos portáteis e restringir acessos a dados sensíveis por necessidade de conhecer.
- Intermédio (IG2): adotar um esquema de classificação, mapear fluxos de dados e cifrar dados sensíveis em trânsito e em repouso.
- Intermédio (IG2): registar o acesso a dados sensíveis.
- Avançado (IG3): implementar prevenção de perda de dados e segmentar o tratamento conforme a sensibilidade.

**Evidências para auditoria.**

- Inventário de dados com classificação e donos.
- Configuração de cifra em dispositivos e serviços.
- Registos de eliminação segura.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.12`, `A.8.12` e `A.8.24`; RGPD `Art. 32`; NIS2 `Art. 21(2)(h)`; NIST CSF 2.0 `PR.DS-01`.

## [4] Configuração segura de activos empresariais e software

**Objetivo.** Partir de configurações endurecidas e mantê-las ao longo do tempo, porque as configurações de fábrica privilegiam a facilidade de uso e não a segurança.

**O que implementar.**

- Básico (IG1): definir e aplicar linhas de base de configuração para postos, servidores, equipamentos de rede e dispositivos móveis.
- Básico (IG1): ativar firewalls locais, bloqueio automático de sessão e alterar credenciais por defeito.
- Básico (IG1): desativar serviços e contas desnecessários.
- Intermédio (IG2): gerir a configuração de forma centralizada e controlar a infraestrutura através de código versionado.
- Avançado (IG3): detetar desvios de configuração automaticamente e corrigi-los.

**Evidências para auditoria.**

- Documentos de linha de base aprovados.
- Relatórios de conformidade de configuração.
- Histórico de alterações em infraestrutura como código.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.9`; NIS2 `Art. 21(2)(g)`; DORA `Art. 9`; NIST CSF 2.0 `PR.PS-01`.

## [5] Gestão de contas

**Objetivo.** Controlar o ciclo de vida das contas de utilizador, de serviço e de administração, para que cada conta exista por uma razão e tenha um responsável.

**O que implementar.**

- Básico (IG1): manter um inventário de contas e desativar as que não têm uso em prazo definido.
- Básico (IG1): usar palavras-passe únicas e robustas e separar contas de administração das contas de uso diário.
- Intermédio (IG2): centralizar a gestão de contas num serviço de diretório.
- Intermédio (IG2): inventariar e rever contas de serviço, atribuindo-lhes donos.
- Avançado (IG2/IG3): automatizar a criação e remoção de contas a partir do sistema de RH.

**Evidências para auditoria.**

- Inventário de contas com data de último acesso.
- Registos de desativação em saídas.
- Lista de contas de serviço com donos.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.16` e `A.5.18`; NIS2 `Art. 21(2)(i)`; NIST CSF 2.0 `PR.AA-01`.

## [6] Gestão do controlo de acessos

**Objetivo.** Atribuir e retirar acessos com base em processos formais e no princípio do menor privilégio, com autenticação forte onde o risco é maior.

**O que implementar.**

- Básico (IG1): ter processos documentados para conceder e revogar acessos, ligados a entradas e saídas.
- Básico (IG1): exigir autenticação multifator para acesso remoto, aplicações expostas à internet e contas de administração.
- Intermédio (IG2): manter um inventário de sistemas de autenticação e centralizar o controlo de acessos.
- Intermédio (IG2): rever acessos periodicamente com os donos dos sistemas.
- Avançado (IG3): definir acessos por papel e rever os papéis de forma sistemática.

**Evidências para auditoria.**

- Fluxos de pedido e aprovação de acessos.
- Configuração de MFA e taxa de cobertura.
- Relatórios de revisão de acessos.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.15`, `A.5.18` e `A.8.5`; NIS2 `Art. 21(2)(j)`; DORA `Art. 9`; NIST CSF 2.0 `PR.AA-05`.

## [7] Gestão contínua de vulnerabilidades

**Objetivo.** Encontrar e corrigir vulnerabilidades de forma contínua, reduzindo a janela em que podem ser exploradas.

**O que implementar.**

- Básico (IG1): ter um processo de gestão de vulnerabilidades com prazos de correção por criticidade.
- Básico (IG1): aplicar atualizações automáticas a sistemas operativos e aplicações sempre que possível.
- Intermédio (IG2): executar análises de vulnerabilidades autenticadas a equipamentos internos e expostos, com frequência regular.
- Intermédio (IG2): acompanhar a correção até ao fecho, com exceções aprovadas.
- Avançado (IG3): priorizar com base em informação de ameaças e em exploração ativa conhecida.

**Evidências para auditoria.**

- Política de correção com prazos.
- Relatórios de análise e tendência de vulnerabilidades em aberto.
- Registo de exceções aprovadas.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.8`; NIS2 `Art. 21(2)(e)`; DORA `Art. 9`; NIST CSF 2.0 `ID.RA-01`.

## [8] Gestão de registos de auditoria

**Objetivo.** Recolher, guardar e analisar registos que permitam detetar ataques e reconstruir o que aconteceu. Sem registos completos e centralizados, a investigação de um incidente fica limitada a suposições.

**O que implementar.**

- Básico (IG1): definir que eventos registar e ativar registos nos sistemas relevantes.
- Básico (IG1): garantir espaço de armazenamento suficiente e retenção definida.
- Intermédio (IG2): sincronizar relógios, centralizar registos e revê-los com regularidade.
- Intermédio (IG2): registar eventos detalhados, como consultas DNS, pedidos URL e linha de comandos, quando relevantes.
- Avançado (IG3): recolher registos de prestadores de serviços e correlacioná-los com os internos.

**Evidências para auditoria.**

- Política de registos com eventos e retenção.
- Configuração do SIEM ou repositório central.
- Evidência de revisão periódica de registos.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.15` e `A.8.17`; DORA `Art. 10`; NIST CSF 2.0 `PR.PS-04` e `DE.AE-03`.

## [9] Protecções de correio electrónico e navegador web

**Objetivo.** Reduzir o risco dos dois canais mais usados para entregar ataques aos utilizadores: o correio eletrónico e a navegação web. A maioria das intrusões começa com uma mensagem de phishing ou uma página comprometida visitada por um utilizador.

**O que implementar.**

- Básico (IG1): usar apenas navegadores e clientes de correio suportados e atualizados.
- Básico (IG1): usar resolução DNS com filtragem de domínios maliciosos.
- Intermédio (IG2): aplicar filtragem de URL e restringir extensões de navegador.
- Intermédio (IG2): implementar SPF, DKIM e DMARC e bloquear tipos de anexos perigosos.
- Avançado (IG3): analisar anexos em ambiente isolado antes da entrega.

**Evidências para auditoria.**

- Configuração de filtragem DNS e URL.
- Registos DMARC e política aplicada.
- Política de extensões de navegador.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.23`; NIS2 `Art. 21(2)(g)`; NIST CSF 2.0 `PR.PS-01`.

## [10] Defesas contra malware

**Objetivo.** Impedir a instalação e a propagação de código malicioso nos equipamentos da organização. A proteção no endpoint é a última barreira quando as defesas de perímetro e de correio falham.

**O que implementar.**

- Básico (IG1): instalar proteção contra malware em todos os equipamentos e manter assinaturas atualizadas.
- Básico (IG1): desativar execução automática a partir de suportes amovíveis.
- Intermédio (IG2): gerir a proteção de forma centralizada e analisar automaticamente suportes amovíveis.
- Intermédio (IG2): ativar funcionalidades anti-exploração do sistema operativo.
- Avançado (IG2/IG3): usar deteção baseada em comportamento e integrá-la na monitorização.

**Evidências para auditoria.**

- Consola central com taxa de cobertura e estado de atualização.
- Políticas de execução automática aplicadas.
- Alertas de malware e respetivo tratamento.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.7`; NIS2 `Art. 21(2)(g)`; NIST CSF 2.0 `DE.CM-09`.

## [11] Recuperação de dados

**Objetivo.** Conseguir repor dados e sistemas num estado fiável após um incidente, em particular após ransomware. Cópias que nunca foram testadas, ou que o atacante consegue cifrar, dão uma falsa sensação de segurança.

**O que implementar.**

- Básico (IG1): definir um processo de cópias de segurança com âmbito, frequência e retenção.
- Básico (IG1): fazer cópias automáticas e protegê-las com controlos equivalentes aos dados originais.
- Básico (IG1): manter pelo menos uma cópia isolada da rede principal.
- Intermédio (IG2): testar restauros regularmente com amostras representativas.
- Avançado (IG2/IG3): definir objetivos de recuperação e validar o restauro de sistemas completos.

**Evidências para auditoria.**

- Política de cópias de segurança.
- Relatórios de execução de cópias.
- Registos de testes de restauro com resultado.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.13`; NIS2 `Art. 21(2)(c)`; DORA `Art. 12`; NIST CSF 2.0 `PR.DS-11`.

## [12] Gestão da infraestrutura de rede

**Objetivo.** Manter os equipamentos e serviços de rede atualizados, documentados e administrados de forma segura. Equipamentos de rede esquecidos, com firmware antigo, são alvos frequentes e difíceis de detetar.

**O que implementar.**

- Básico (IG1): manter o firmware e o software dos equipamentos de rede atualizados.
- Intermédio (IG2): documentar a arquitetura de rede e mantê-la atualizada.
- Intermédio (IG2): centralizar autenticação e administração dos equipamentos de rede.
- Intermédio (IG2): usar protocolos seguros de gestão e comunicação.
- Avançado (IG2/IG3): administrar a rede a partir de estações dedicadas e segregar a infraestrutura de gestão.

**Evidências para auditoria.**

- Diagramas de rede atualizados.
- Inventário de versões de firmware.
- Configuração de autenticação centralizada nos equipamentos.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.20` e `A.8.21`; NIS2 `Art. 21(2)(e)`; NIST CSF 2.0 `PR.IR-01`.

## [13] Monitorização e defesa da rede

**Objetivo.** Detetar e conter atividade maliciosa na rede através de monitorização centralizada e de capacidades de defesa ativas.

**O que implementar.**

- Intermédio (IG2): centralizar alertas de segurança e definir regras de correlação.
- Intermédio (IG2): implementar deteção de intrusões na rede e nos equipamentos.
- Intermédio (IG2): controlar o acesso remoto e garantir que equipamentos remotos cumprem requisitos mínimos.
- Avançado (IG3): filtrar tráfego entre segmentos e recolher fluxos de rede para análise.
- Avançado (IG3): afinar limiares de alerta com base na experiência operacional. Este controlo está fora do IG1.

**Evidências para auditoria.**

- Arquitetura de monitorização e cobertura de sensores.
- Regras de deteção e exemplos de alertas tratados.
- Registos de fluxos de rede.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.16` e `A.8.22`; NIS2 `Art. 21(2)(b)`; DORA `Art. 10`; NIST CSF 2.0 `DE.CM-01`.

## [14] Sensibilização e formação em segurança

**Objetivo.** Dar aos colaboradores conhecimento e hábitos que reduzam o risco humano, adaptados à função de cada um.

**O que implementar.**

- Básico (IG1): ter um programa de sensibilização com conteúdos sobre engenharia social, autenticação e tratamento de dados.
- Básico (IG1): ensinar a reconhecer e reportar incidentes e a evitar exposição acidental de dados.
- Básico (IG1): abordar riscos de redes inseguras e de atualizações em falta.
- Intermédio (IG2): formar funções específicas, como programadores e administradores, em temas técnicos.
- Avançado (IG2/IG3): medir eficácia com simulações e ajustar o programa.

**Evidências para auditoria.**

- Plano anual de sensibilização.
- Taxas de conclusão por equipa.
- Resultados de simulações.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.6.3`; NIS2 `Art. 21(2)(g)`; DORA `Art. 13`; NIST CSF 2.0 `PR.AT-01`.

## [15] Gestão de prestadores de serviços

**Objetivo.** Avaliar e acompanhar os prestadores que tratam dados ou suportam processos críticos, porque o seu risco passa a ser risco da organização.

**O que implementar.**

- Básico (IG1): manter um inventário de prestadores de serviços com contacto e serviço prestado.
- Intermédio (IG2): definir uma política de gestão de prestadores e classificar cada um por criticidade.
- Intermédio (IG2): incluir requisitos de segurança nos contratos.
- Avançado (IG3): avaliar e monitorizar prestadores críticos de forma contínua.
- Avançado (IG3): garantir a desativação de acessos e eliminação de dados no fim da relação.

**Evidências para auditoria.**

- Inventário classificado de prestadores.
- Cláusulas de segurança em contratos.
- Avaliações de risco periódicas.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.19`, `A.5.20` e `A.5.22`; NIS2 `Art. 21(2)(d)`; DORA `Art. 28`; NIST CSF 2.0 `GV.SC-04`.

## [16] Segurança do software aplicacional

**Objetivo.** Prevenir, detetar e corrigir vulnerabilidades em software desenvolvido ou adquirido pela organização.

**O que implementar.**

- Intermédio (IG2): ter um processo de desenvolvimento seguro e um processo para receber e tratar vulnerabilidades reportadas.
- Intermédio (IG2): manter inventário de componentes de terceiros e atualizá-los.
- Intermédio (IG2): separar ambientes de produção e não produção.
- Avançado (IG2/IG3): integrar análise estática e dinâmica nos pipelines e formar programadores.
- Avançado (IG3): realizar modelação de ameaças e testes de intrusão aplicacionais. Este controlo está fora do IG1.

**Evidências para auditoria.**

- Procedimento de desenvolvimento seguro.
- Resultados de análise de código e componentes.
- Registo de vulnerabilidades reportadas e corrigidas.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.25`, `A.8.28` e `A.8.29`; NIS2 `Art. 21(2)(e)`; NIST CSF 2.0 `PR.PS-06`.

## [17] Gestão da resposta a incidentes

**Objetivo.** Preparar a organização para detetar, responder e recuperar de incidentes de forma organizada. A qualidade da resposta depende sobretudo do que foi preparado antes, e não da improvisação durante o incidente.

**O que implementar.**

- Básico (IG1): designar quem coordena a resposta e manter contactos internos e externos atualizados.
- Básico (IG1): definir como os colaboradores reportam incidentes.
- Intermédio (IG2): documentar o processo de resposta com papéis, comunicação e critérios de classificação.
- Intermédio (IG2): realizar exercícios e análises pós-incidente.
- Avançado (IG3): definir limiares de severidade e integrar lições aprendidas de forma sistemática.

**Evidências para auditoria.**

- Plano de resposta aprovado.
- Lista de contactos de emergência.
- Relatórios de exercícios e pós-incidente.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.5.24` a `A.5.27`; NIS2 `Art. 21(2)(b)` e `Art. 23`; DORA `Art. 17`; NIST CSF 2.0 `RS.MA-01`.

## [18] Testes de intrusão

**Objetivo.** Testar a resistência real das defesas simulando ataques, para identificar falhas que os controlos de rotina não revelam.

**O que implementar.**

- Intermédio (IG2): definir um programa de testes com âmbito, frequência e regras de envolvimento.
- Intermédio (IG2): realizar testes externos periódicos e corrigir as constatações.
- Avançado (IG3): realizar testes internos e validar medidas de segurança após correção.
- Avançado (IG3): usar os resultados para melhorar deteção e resposta.
- Avançado (IG3): considerar exercícios de equipa vermelha em organizações maduras. Este controlo está fora do IG1.

**Evidências para auditoria.**

- Programa de testes aprovado.
- Relatórios de testes com constatações.
- Seguimento das correções.

**Relação com outros referenciais.** ISO/IEC 27001:2022 `A.8.29`; NIS2 `Art. 21(2)(f)`; DORA `Art. 24` e `Art. 26`; NIST CSF 2.0 `ID.IM-02`.

## [IG] Grupos de Implementação (IG1, IG2, IG3)

**Objetivo.** Usar os Grupos de Implementação para priorizar o esforço conforme o perfil de risco e os recursos da organização, em vez de tentar implementar tudo ao mesmo tempo.

**O que implementar.**

- IG1: higiene cibernética essencial, dirigida a organizações com poucos recursos de TI; agrupa 56 medidas e é o ponto de partida para todas.
- IG2: acrescenta 74 medidas para organizações com equipas de TI dedicadas e dados mais sensíveis.
- IG3: acrescenta 23 medidas para organizações com especialistas de segurança e exposição a ataques sofisticados.
- Classificar a organização num grupo com base na sensibilidade dos dados, regulação aplicável e capacidade interna.
- Medir a cobertura por grupo e planear a progressão de forma faseada.

**Evidências para auditoria.**

- Justificação documentada do grupo-alvo.
- Avaliação de cobertura por grupo.
- Roteiro de progressão aprovado.

**Relação com outros referenciais.** NIS2 `Art. 21(2)(g)`; NIST CSF 2.0 `GV.RM-01`.
