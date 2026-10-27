---
framework_id: cis-v8.1
title: CIS Critical Security Controls v8.1 — Resumo dos 18 controlos
language: pt-PT
doc_type: summary
source_url: https://www.cisecurity.org/controls/v8-1
retrieved: 2026-10-25
licence: Resumo original da CISO Nexus; os CIS Controls estão sob CC BY-NC-ND 4.0 e não são reproduzidos.
---

## [1] Inventário e controlo de activos empresariais

O objectivo é saber, a cada momento, que equipamentos existem na organização — postos de trabalho, servidores, dispositivos móveis, equipamento de rede, IoT e recursos em nuvem — e quem é responsável por cada um. Na prática, mantém-se um inventário actualizado, alimentado por descoberta activa e passiva e por registos de DHCP, e define-se um processo para isolar ou retirar rapidamente dispositivos não autorizados. Sem esta base, nenhum outro controlo consegue ser aplicado de forma completa.

## [2] Inventário e controlo de activos de software

Pretende-se conhecer todo o software instalado e em execução, garantir que apenas aplicações autorizadas e com suporte do fabricante estão em uso e impedir a execução do restante. Implementa-se através de um inventário de software com versões e responsáveis, revisões periódicas, remoção do software não suportado e, nos níveis mais exigentes, listas de permissão para aplicações, bibliotecas e scripts.

## [3] Protecção de dados

Este controlo visa identificar, classificar e proteger a informação ao longo de todo o seu ciclo de vida. Envolve manter um inventário de dados sensíveis, definir regras de retenção e eliminação segura, aplicar controlo de acessos com base na necessidade, cifrar dados em repouso e em trânsito e, nas organizações mais maduras, segmentar o processamento por nível de sensibilidade e usar ferramentas de prevenção de fuga de dados.

## [4] Configuração segura de activos empresariais e software

O propósito é substituir as configurações de fábrica, normalmente permissivas, por linhas de base endurecidas e documentadas para sistemas, aplicações e equipamentos de rede. Deve aplicar-se bloqueio automático de sessão, firewalls locais, gestão segura da infraestrutura (por exemplo, canais cifrados de administração), remoção de contas e serviços por omissão desnecessários e capacidade de apagar remotamente dispositivos portáteis perdidos.

## [5] Gestão de contas

Trata da gestão do ciclo de vida das credenciais de utilizadores, administradores e contas de serviço. A organização deve manter um inventário de contas, exigir palavras-passe únicas e robustas, desactivar contas inactivas em prazo curto, separar contas privilegiadas das de uso quotidiano e centralizar a gestão das identidades num serviço de directório.

## [6] Gestão do controlo de acessos

Complementa o controlo anterior definindo como os direitos de acesso são atribuídos, revistos e revogados segundo o princípio do menor privilégio. Inclui processos formais de concessão e retirada de acessos, autenticação multifactor para acesso remoto, aplicações expostas e contas administrativas, centralização do controlo de acessos e manutenção de um registo dos sistemas de autenticação e autorização existentes.

## [7] Gestão contínua de vulnerabilidades

O objectivo é reduzir de forma contínua a janela de exposição a falhas conhecidas. Implementa-se com um processo documentado de gestão de vulnerabilidades, aplicação automatizada de correcções a sistemas operativos e aplicações, análises periódicas autenticadas a activos internos e externos e um ciclo de remediação com prazos definidos em função do risco.

## [8] Gestão de registos de auditoria

Visa recolher, proteger e analisar os registos de eventos que permitem detectar ataques e reconstruir incidentes. A organização deve definir que eventos registar, garantir armazenamento suficiente, sincronizar relógios, centralizar os registos, conservá-los por um período adequado e revê-los regularmente, alargando a recolha a consultas DNS, pedidos de URL e linhas de comando à medida que a maturidade aumenta.

## [9] Protecções de correio electrónico e navegador web

Como o correio e a navegação são vectores frequentes de engano e de código malicioso, este controlo procura reduzir essa superfície. Recomenda-se usar apenas navegadores e clientes de correio suportados, filtrar DNS e URLs, restringir extensões, aplicar mecanismos de autenticação do domínio de correio (como DMARC) e bloquear tipos de anexos perigosos.

## [10] Defesas contra malware

Pretende impedir ou limitar a instalação, propagação e execução de software malicioso. Para isso, instala-se e actualiza-se automaticamente protecção anti-malware gerida de forma central, desactiva-se a execução automática a partir de suportes amovíveis, activam-se funcionalidades anti-exploração do sistema operativo e, em ambientes mais maduros, usa-se detecção baseada em comportamento.

## [11] Recuperação de dados

O objectivo é garantir que a organização consegue repor sistemas e dados num estado fiável após um incidente, incluindo ransomware. Envolve um processo documentado de recuperação, cópias de segurança automáticas e regulares, protecção dessas cópias com o mesmo rigor dos dados originais, uma cópia isolada da rede de produção e testes periódicos de restauro.

## [12] Gestão da infraestrutura de rede

Procura manter os equipamentos de rede seguros, actualizados e documentados, de modo a impedir que sejam explorados. Implica manter firmware e software de rede suportados, desenhar uma arquitectura segmentada e documentada, administrar a infraestrutura através de canais seguros e, nos níveis superiores, recorrer a estações dedicadas para tarefas administrativas.

## [13] Monitorização e defesa da rede

Este controlo visa observar o tráfego e os eventos da rede para detectar e travar actividade hostil. Inclui a centralização de alertas de segurança, sistemas de detecção e prevenção de intrusões na rede e nos terminais, segmentação e filtragem entre zonas, controlo de acesso à rede para dispositivos e, em organizações maduras, recolha de dados de fluxo e afinação contínua dos limiares de alerta.

## [14] Sensibilização e formação em segurança

O propósito é que todas as pessoas da organização saibam reconhecer e reagir a ameaças e conheçam as suas responsabilidades. Estabelece-se um programa contínuo que cobre engenharia social, autenticação, tratamento de dados, causas de exposição involuntária e comunicação de incidentes, complementado com formação específica para funções com responsabilidades técnicas ou de segurança.

## [15] Gestão de prestadores de serviços

Visa controlar o risco introduzido por terceiros que tratam dados ou suportam processos críticos. A organização deve inventariar os prestadores, classificá-los por criticidade, incluir requisitos de segurança nos contratos, avaliá-los e monitorizá-los ao longo da relação e garantir a desactivação de acessos e a devolução ou destruição de dados no fim do serviço.

## [16] Segurança do software aplicacional

Aplica-se ao software desenvolvido, adquirido ou alojado pela organização e pretende evitar que falhas de concepção ou programação sejam exploradas. Inclui um ciclo de desenvolvimento seguro, gestão de componentes de terceiros, tratamento estruturado de vulnerabilidades reportadas, separação de ambientes, formação dos programadores, revisão de código, testes de segurança e modelação de ameaças.

## [17] Gestão da resposta a incidentes

O objectivo é dispor de capacidade organizada para preparar, detectar, conter e recuperar de incidentes de segurança. Implica nomear responsáveis e substitutos, manter contactos internos e externos actualizados, definir canais de comunicação e reporte, documentar um plano de resposta, realizar exercícios periódicos e retirar lições após cada incidente.

## [18] Testes de intrusão

Pretende validar, através de ataques simulados, a eficácia real das defesas técnicas, dos processos e das pessoas. A organização define um programa com âmbito e regras claros, realiza testes externos e internos periódicos, corrige as falhas encontradas segundo prioridades de risco e verifica se as medidas de protecção funcionam como esperado.

## [IG] Grupos de Implementação (IG1, IG2, IG3)

As salvaguardas dos 18 controlos estão distribuídas por três grupos cumulativos que orientam a priorização em função do perfil da organização. O IG1 corresponde a uma higiene cibernética essencial, pensada para organizações pequenas com poucos recursos técnicos e dados de baixa sensibilidade, e é o ponto de partida recomendado para todas. O IG2 acrescenta salvaguardas para organizações com equipas de TI dedicadas, múltiplos departamentos e obrigações regulatórias ou dados mais sensíveis. O IG3 inclui todas as salvaguardas e destina-se a organizações que enfrentam adversários sofisticados, onde uma falha teria impacto significativo no interesse público ou no negócio. Cada grupo inclui integralmente o anterior, pelo que a progressão é feita por camadas.
