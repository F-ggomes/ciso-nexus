# Connectors

Secrets are entered in the UI (Connectors page) or via environment variables for the operator organisation; they
are stored encrypted. `config_schema` in each connector lists the fields.

| Key | System | Auth | Minimum permissions | Produces |
|---|---|---|---|---|
| `wazuh` | Wazuh 4.x manager API (55000) + indexer (9200) | API user/password; indexer basic auth | Manager: read-only role (`agents:read`, `vulnerability:read`, `sca:read`); indexer: read on `wazuh-alerts-*`, `wazuh-states-vulnerabilities-*` | Findings (rule.level >= 10), vulnerabilities, SCA (CIS) evidence, agent inventory |
| `azure` | Microsoft Graph + Azure Resource Manager | App registration, client credentials | Graph app perms: Directory.Read.All, Policy.Read.All, AuditLog.Read.All, SecurityEvents.Read.All, IdentityRiskyUser.Read.All; ARM: Reader | Defender alerts, risky users, Conditional Access/MFA evidence, privileged roles, user inventory, Secure Score, Policy compliance, resources as assets |
| `m365` | Microsoft Graph (Intune, Purview, Secure Score) | same app registration | DeviceManagementManagedDevices.Read.All, DeviceManagementConfiguration.Read.All, InformationProtectionPolicy.Read.All | Device compliance and encryption evidence, sensitivity labels, Microsoft Secure Score, devices as assets |
| `ciso_assistant` | CISO Assistant REST API | Personal Access Token (`Authorization: Token`) | Read on risk scenarios, applied controls, TPRM entities, incidents; write to create/update | Mirror risks and vendors; push risks and vendors |
| `simplerisk` | SimpleRisk API v2 (API Extra) | `X-Api-Key` | Risk read/write | Mirror and push risks |
| `eramba` | Eramba JSON API | Bearer API key | Read risks, third parties, incidents, controls | Mirror risks, vendors |
| `onetrust` | OneTrust public API (Vendor Risk, Assessments) | Bearer token | Vendor and assessment read | Mirror vendors; fetch assessments |
| `archer` | Archer RESTful API | Session token (login) | Read/write on configured application ids | Mirror and push risks/vendors/incidents |
| `jira` | Jira Cloud REST v3 | email + API token | Create issues in project, transition | Tickets for incidents and regulatory deadlines |
| `servicenow` | ServiceNow Table API | basic auth integration user | Create on `incident` or `sn_si_incident` | Tickets |
| `teams` | Teams Workflows incoming webhook | webhook URL | n/a | Adaptive Card notifications |

Sync schedule: `EVIDENCE_SYNC_CRON` (default every 6 h) for all configured connectors; reminders daily 07:00 UTC;
regulatory watch weekly Monday 06:00 UTC. Trigger manually from the Connectors page or `POST /connectors/{key}/sync`.

Adding a connector: subclass `SecurityConnector`, `GRCConnector` or `ITSMConnector` in `app/connectors/<family>/`,
decorate with `@register`, declare `key`, `display_name`, `capabilities`, `config_schema`, implement `configured()`,
`health()` and the capability methods, then import the module in `registry.load_default_connectors`.
