---
kind: policy
code: POL-13
title: Política de Segurança de Redes, Telecomunicações e Conetividade
language: pt-PT
---
# Política de Segurança de Redes, Telecomunicações e Conetividade

| Código | POL-13 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Estabelecer controlos rigorosos para a arquitetura, segregação, monitorização e proteção das redes de comunicações de {{ORG}}, prevenindo acessos não autorizados, ataques de negação de serviço (DDoS) e espionagem de tráfego, conforme os controlos 8.20, 8.21 e 8.22 da ISO/IEC 27002:2022.

## 2. Princípios de Arquitetura de Rede
1. **Segregação de Redes (Zonamento de Segurança):** A rede é dividida em zonas de segurança lógicas e físicas com base na criticidade e classificação da informação:
   - **DMZ (Demilitarized Zone):** Zonas expostas à Internet apenas para serviços públicos essenciais protegidos por WAF;
   - **Rede de Produção / Aplicações:** Acesso restrito a servidores e bases de dados, sem contacto direto com a Internet;
   - **Rede Corporativa / Utilizadores:** Estações de trabalho de colaboradores com acesso condicionado;
   - **Rede de Gestão Fora-de-Banda (OOB):** VLAN isolada e cifrada exclusivamente para administração de equipamentos;
   - **Rede Wi-Fi de Visitantes:** Isolada da rede corporativa com acesso restrito à Internet mediante termo de responsabilidade.
2. **Defesa em Profundidade e Zero Trust:** Nenhuma ligação ou pacote é considerado confiável por omissão, exigindo-se autenticação e inspeção contínua (Princípio do Mínimo Acesso à Rede).
3. **Cifragem de Tráfego de Rede:** Todas as comunicações através de redes públicas ou não fidedignas devem utilizar protocolos cifrados modernos (TLS 1.3, IPsec, SSHv2) com conjuntos de cifras criptograficamente robustos (Forward Secrecy).

## 3. Gestão de Firewalls e Acesso Remoto
- Todo o tráfego que cruze os limites entre zonas de rede deve ser filtrado por Firewalls de Próxima Geração (NGFW) com inspeção com estado (stateful), IDS/IPS e controlo aplicacional (Layer 7).
- A regra de base de qualquer firewall é **Deny All** (bloqueio por omissão), autorizando apenas tráfego explicitamente justificado por necessidade de negócio.
- O acesso remoto de colaboradores e prestadores de serviços exige ligação via VPN corporativa com Autenticação Multifator (MFA) baseada em tokens dinâmicos ou FIDO2.

## 4. Matriz de Requisitos
| Requisito ISO / NIS2 / DORA | Secção Aplicável |
|---|---|
{{REQUIREMENT_MATRIX}}
