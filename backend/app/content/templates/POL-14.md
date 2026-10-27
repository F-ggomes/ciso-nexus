---
kind: policy
code: POL-14
title: Política de Teletrabalho, Trabalho Remoto e Dispositivos Móveis (BYOD)
language: pt-PT
---
# Política de Teletrabalho, Trabalho Remoto e Dispositivos Móveis (BYOD)

| Código | POL-14 | Versão | {{VERSION}} | Proprietário | {{OWNER}} |
|---|---|---|---|---|---|
| Aprovado por | {{APPROVER}} | Data | {{DATE}} | Revisão | {{REVIEW_CYCLE}} meses |

## 1. Objectivo
Assegurar que as atividades exercidas em regime de teletrabalho, trabalho remoto e a utilização de dispositivos móveis corporativos ou pessoais autorizados (BYOD) mantêm o mesmo nível de segurança, confidencialidade e resiliência que o trabalho presencial nas instalações de {{ORG}}, em linha com os controlos 6.7 e 8.1 da ISO/IEC 27002:2022.

## 2. Requisitos Técnicos para Equipamentos Corporativos
1. **Gestão Centralizada (MDM/EDR):** Todos os computadores portáteis e telemóveis fornecidos pela empresa estão registados no sistema central de MDM, que assegura a aplicação de políticas de segurança, atualizações automáticas e capacidade de bloqueio e limpeza remota em caso de furto ou perda.
2. **Cifragem Integral de Armazenamento:** Obrigatória a ativação de encriptação total de disco (BitLocker com TPM no Windows, FileVault no macOS) com chaves de recuperação custodiadas centralmente.
3. **Proteção de Redes Wi-Fi Domésticas e Públicas:**
   - É obrigatório o uso contínuo de VPN corporativa ao aceder a sistemas internos;
   - É estritamente proibido utilizar redes Wi-Fi públicas abertas (sem senha) sem ativação imediata de VPN antes do envio de qualquer tráfego.

## 3. Política de Dispositivos Pessoais (BYOD - Bring Your Own Device)
Quando autorizado o acesso a correio eletrónico ou comunicações corporativas a partir de telemóveis pessoais:
- É obrigatória a instalação de perfil empresarial (Container / Work Profile) que segrega totalmente os dados corporativos dos dados pessoais;
- O dispositivo deve dispor de PIN/bloqueio biométrico ativo e sistema operativo sem desbloqueio de segurança (proibido Root ou Jailbreak);
- Em caso de cessação de funções ou perda do telemóvel, a organização executará a limpeza seletiva remota apenas dos dados e contas corporativas, sem afetar fotografias ou dados pessoais do colaborador.

## 4. Matriz de Requisitos
| Requisito ISO / DORA | Secção da Política |
|---|---|
{{REQUIREMENT_MATRIX}}
