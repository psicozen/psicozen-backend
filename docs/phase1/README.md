# PsicoZen Backend - Implementação Fase 1

**Status:** 🔴 Não Iniciado
**Cronograma:** 5-6 semanas
**Conclusão Prevista:** [A definir]

---

## Visão Geral

Este diretório contém o plano de implementação completo para **PsicoZen Backend Fase 1**, dividido em 7 marcos detalhados. Cada documento de marco inclui detalhamento de tarefas, exemplos de código, critérios de aceite e requisitos de testes.

**Objetivos da Fase 1:**
1. Arquitetura multi-tenant com isolamento baseado em organização
2. RBAC hierárquico (Admin > Gestor > Colaborador)
3. Módulo core Emociograma com controles de privacidade
4. Sistema de alertas para monitoramento de limiar emocional
5. Recursos de privacidade de dados em conformidade com LGPD

---

## Marcos

### [Marco 1: Multi-Tenant Foundation](MILESTONE_01_Multi-Tenant_Foundation.md)
**Semana 1** | **Dependências:** Nenhuma

Construir arquitetura multi-tenant fundamental com gerenciamento de organizações.

**Entregáveis Principais:**
- Tabela e entidade Organizations
- Repositório de organizações com operações CRUD
- Middleware de contexto de organização (isolamento de tenant)
- Configurações de organização (configuração JSONB)

**Arquivos Críticos:**
- `migrations/CreateOrganizationsTable.ts`
- `modules/organizations/domain/entities/organization.entity.ts`
- `core/presentation/middleware/organization-context.middleware.ts`

---

### [Marco 2: Enhanced RBAC](MILESTONE_02_Enhanced_RBAC.md)
**Semana 1-2** | **Dependências:** M1 (Tabela Organizations)

Transformar RBAC plano em sistema hierárquico de permissões com escopo de organização.

**Entregáveis Principais:**
- Roles hierárquicas (Super Admin > Admin > Gestor > Colaborador)
- Atribuições de role com escopo de organização
- RolesGuard aprimorado com verificações de permissão
- Definições de permissões do Emociograma

**Arquivos Críticos:**
- `migrations/AddOrganizationScopeToRBACTables.ts`
- `roles/domain/enums/role.enum.ts` (com hierarquia)
- `core/presentation/guards/roles.guard.ts` (aprimorado)
- `users/infrastructure/repositories/user.repository.ts` (adicionar `getRolesByOrganization()`)

---

### [Marco 3: Emociograma Core](MILESTONE_03_Emociograma_Core.md)
**Semana 2-3** | **Dependências:** M1 (Organizations), M2 (RBAC)

Recurso core Emociograma: rastreamento emocional diário com controles de privacidade.

**Entregáveis Principais:**
- Tabelas de banco de dados do Emociograma (categorias + submissões)
- Entidade Submission com lógica de negócio
- Repositório com queries de agregação
- Casos de uso Submit e Get Report
- Serviço de moderação de comentários

**Arquivos Críticos:**
- `migrations/CreateEmociogramaTable.ts`
- `emociograma/domain/entities/submission.entity.ts`
- `emociograma/infrastructure/repositories/submission.repository.ts`
- `emociograma/application/use-cases/submit-emociograma.use-case.ts`

---

### [Marco 4: Alert System](MILESTONE_04_Alert_System.md)
**Semana 3** | **Dependências:** M3 (Emociograma Core)

Sistema de alertas automatizado para monitoramento de limiar emocional.

**Entregáveis Principais:**
- Tabela e entidade Alerts
- Serviço de alertas com lógica de notificação
- Templates de email para alertas
- Rastreamento de resolução de alertas

**Arquivos Críticos:**
- `migrations/CreateEmociogramaAlertsTable.ts`
- `emociograma/domain/entities/alert.entity.ts`
- `emociograma/application/services/alert.service.ts`

---

### [Marco 5: API Endpoints](MILESTONE_05_API_Endpoints.md)
**Semana 4** | **Dependências:** M3 (Casos de Uso), M4 (Serviço de Alertas)

Endpoints da API REST com documentação Swagger.

**Entregáveis Principais:**
- Controller do Emociograma (submeter, relatórios, exportar)
- Controller de Alerts (dashboard, resolver)
- Controller de Categories (CRUD)
- Funcionalidade de exportação CSV/Excel

**Arquivos Críticos:**
- `emociograma/presentation/controllers/emociograma.controller.ts`
- `emociograma/presentation/controllers/alerts.controller.ts`
- `emociograma/application/use-cases/export-emociograma.use-case.ts`

---

### [Marco 6: Privacy & LGPD](MILESTONE_06_Privacy_LGPD.md)
**Semana 4-5** | **Dependências:** M3 (Emociograma Core)

Recursos de conformidade com LGPD para privacidade de dados.

**Entregáveis Principais:**
- Serviço de moderação de comentários (detecção de conteúdo inapropriado)
- Serviço de anonimização de dados
- Sistema de logging de auditoria
- Endpoints LGPD (exportar, anonimizar, excluir)
- Documentação da política de privacidade

**Arquivos Críticos:**
- `emociograma/application/services/comment-moderation.service.ts`
- `emociograma/application/services/data-anonymization.service.ts`
- `core/application/services/audit-log.service.ts`
- `users/presentation/controllers/users.controller.ts` (endpoints LGPD)

---

### [Marco 7: Testing & Documentation](MILESTONE_07_Testing_Documentation.md)
**Semana 5-6** | **Dependências:** Todos os marcos anteriores

Testes finais, otimização e documentação.

**Entregáveis Principais:**
- Cobertura de testes ≥80% (unitários + integração + E2E)
- Documentação completa da API Swagger
- Otimização de performance (p95 < 500ms)
- Auditoria de segurança
- Diagrama ERD do banco de dados
- Guia de deployment
- Relatório QA

**Entregáveis Críticos:**
- Todos os testes passando
- Benchmarks de performance atingidos
- Auditoria de segurança aprovada
- Deployment em produção pronto

---

## Sequência de Implementação

```
Semana 1:
  └─ M1: Organizations (foundation)
  └─ M2: Enhanced RBAC (início)

Semana 2:
  └─ M2: Enhanced RBAC (completo)
  └─ M3: Emociograma Core (início)

Semana 3:
  └─ M3: Emociograma Core (completo)
  └─ M4: Alert System

Semana 4:
  └─ M5: API Endpoints
  └─ M6: Privacy & LGPD (início)

Semana 5:
  └─ M6: Privacy & LGPD (completo)
  └─ M7: Testing & Documentation (início)

Semana 6:
  └─ M7: Testing & Documentation (completo)
  └─ QA final e prontidão para produção
```

---

## Grafo de Dependências

```
M1 (Organizations)
  ↓
M2 (Enhanced RBAC) ←─────┐
  ↓                      │
M3 (Emociograma Core)    │
  ↓              ↓       │
M4 (Alerts)    M6 (Privacy)
  ↓              ↓
M5 (API Endpoints)
  ↓
M7 (Testing & Docs)
```

**Caminho Crítico:** M1 → M2 → M3 → M5 → M7

---

## Acompanhamento de Progresso

| Marco | Status | Progresso | Cobertura de Testes | Notas |
|-----------|--------|----------|---------------|-------|
| M1: Multi-Tenant | 🔴 Não Iniciado | 0% | N/A | Foundation - comece por aqui |
| M2: Enhanced RBAC | 🔴 Não Iniciado | 0% | N/A | Depende de M1 |
| M3: Emociograma Core | 🔴 Não Iniciado | 0% | N/A | Depende de M1, M2 |
| M4: Alert System | 🔴 Não Iniciado | 0% | N/A | Depende de M3 |
| M5: API Endpoints | 🔴 Não Iniciado | 0% | N/A | Depende de M3, M4 |
| M6: Privacy & LGPD | 🔴 Não Iniciado | 0% | N/A | Depende de M3 |
| M7: Testing & Docs | 🔴 Não Iniciado | 0% | N/A | Depende de Todos |

**Legenda:**
- 🔴 Não Iniciado
- 🟡 Em Progresso
- 🟢 Completo
- ✅ Totalmente Testado

---

## Referência Rápida

### Conceitos Principais

**Multi-Tenancy:**
- Tabelas compartilhadas com filtragem por `organization_id`
- Contexto de organização injetado via middleware (header `x-organization-id`)
- Cada usuário pode ter diferentes roles em diferentes organizações

**Hierarquia de Roles:**
```
Super Admin (nível 0) - Administrador da plataforma
  └─ Admin (nível 100) - Proprietário da organização
      └─ Gestor (nível 200) - Gerente de equipe
          └─ Colaborador (nível 300) - Funcionário
```

**Escala Emociograma:**
```
1-5: Emoções positivas (😄 → 😕)
6-10: Emoções negativas (😫 → 😞) [ACIONA ALERTAS]
```

**Modos de Privacidade:**
- **Identificado:** ID do usuário visível para admins
- **Anônimo:** ID do usuário mascarado como "anonymous", apenas dados agregados visíveis

---

## Variáveis de Ambiente Essenciais

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=psicozen

# Supabase (Auth)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@psicozen.com.br
```

---

## Comandos de Teste

```bash
# Executar todos os testes unitários
npm run test

# Executar testes de módulo específico
npm run test -- organizations

# Executar com cobertura
npm run test:cov

# Executar testes E2E
npm run test:e2e

# Modo watch (desenvolvimento)
npm run test:watch
```

---

## Comandos de Banco de Dados

```bash
# Executar todas as migrations
npm run typeorm migration:run

# Reverter última migration
npm run typeorm migration:revert

# Gerar migration (se necessário)
npm run typeorm migration:generate src/core/infrastructure/database/migrations/MigrationName

# Mostrar status das migrations
npm run typeorm migration:show
```

---

## Troubleshooting

### Problemas Comuns

**1. Migration falha com "relation already exists"**
- Solução: Verificar se migration já foi executada com `npm run typeorm migration:show`
- Reverter se necessário: `npm run typeorm migration:revert`

**2. Testes falham com "Cannot find module"**
- Solução: Verificar `tsconfig.json` paths e `jest.config.ts` moduleNameMapper
- Reiniciar Jest: `npm run test:watch`

**3. RolesGuard sempre retorna false**
- Solução: Verificar se header `x-organization-id` está presente
- Verificar se usuário tem role naquela organização
- Verificar query `getRolesByOrganization()`

**4. Queries de agregação estão lentas**
- Solução: Verificar índices com `EXPLAIN ANALYZE`
- Verificar se `submitted_at` está indexado
- Considerar particionamento para >1M registros

---

## Suporte

Para dúvidas ou problemas:
- Verificar documentação do marco para detalhamento de tarefas
- Revisar CLAUDE.md do backend para padrões de arquitetura
- Consultar princípios de Clean Architecture
- Perguntar no chat da equipe de desenvolvimento

---

## Métricas de Sucesso

Fase 1 é bem-sucedida quando:

✅ **Funcional:**
- Colaboradores submetem emoções diariamente
- Gestores recebem alertas automaticamente
- Relatórios mostram dados agregados da equipe
- Exportação funciona para CSV/Excel
- Endpoints LGPD funcionais

✅ **Técnico:**
- Cobertura de testes ≥80%
- Resposta API p95 < 500ms
- Sem vulnerabilidades de segurança críticas
- Isolamento multi-tenant verificado
- Clean Architecture mantida

✅ **Negócio:**
- Reduz rastreamento emocional manual (elimina formulários físicos)
- Possibilita decisões de RH baseadas em dados
- Fornece sistema de alerta precoce para bem-estar de colaboradores
- Garante conformidade regulatória (LGPD)

---

## Prévia da Próxima Fase

Após conclusão da Fase 1, Fase 2 irá adicionar:
- **Pulse Surveys**: Pesquisas rápidas de 4-6 questões
- **e-NPS**: Employee Net Promoter Score
- **Quick Feedback**: Sistema de feedback peer-to-peer
- **Communication**: Anúncios internos e mensagens

Esses recursos serão construídos sobre a base sólida criada na Fase 1, reutilizando a arquitetura multi-tenant, sistema RBAC e controles de privacidade.
