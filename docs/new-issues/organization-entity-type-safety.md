# 🐛 [Bug/Tech Debt] Uso de eslint-disable e manipulação de tipos insegura em OrganizationEntity

## 📋 Descrição

A entidade de domínio `OrganizationEntity` contém práticas de código que comprometem a segurança de tipos do TypeScript:

1. **Uso de `eslint-disable`** para `@typescript-eslint/no-unsafe-call` e `@typescript-eslint/no-unsafe-assignment`
2. **Type assertions inseguras** usando `as Record<string, unknown>` nos métodos `mergeSettings` e `validateSettings`
3. **Conversões manuais de tipo** com múltiplas asserções `as` encadeadas

**Arquivo afetado:** `src/modules/organizations/domain/entities/organization.entity.ts`

## 🔴 Por que isso é um problema

### Impacto na Segurança de Tipo
- **Perde garantias do TypeScript**: As conversões `as` ignoram a verificação de tipos, permitindo erros em tempo de execução
- **Dificulta manutenção**: Mudanças em `OrganizationSettings` podem quebrar o código sem avisos do compilador
- **Viola Clean Architecture**: Entidades de domínio devem ser robustas e fortemente tipadas para garantir integridade dos dados

### Código Problemático

```typescript
// ❌ PROBLEMA 1: Desabilita checagem de segurança
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// ❌ PROBLEMA 2: Type assertions inseguras
private mergeSettings(
  current: OrganizationSettings,
  updates: Partial<OrganizationSettings>,
): OrganizationSettings {
  const currentRecord = current as Record<keyof OrganizationSettings, unknown>;
  const updatesRecord = updates as Record<string, unknown>;

  return {
    timezone: (updatesRecord.timezone as string | undefined) ??
              (currentRecord.timezone as string),
    // ... múltiplas conversões 'as' para cada propriedade
  };
}

// ❌ PROBLEMA 3: Acesso inseguro a propriedades
private static validateSettings(settings: Partial<OrganizationSettings>): void {
  const settingsRecord = settings as Record<string, unknown>;

  if ('alertThreshold' in settingsRecord) {
    const value = settingsRecord.alertThreshold; // tipo: unknown
    if (typeof value !== 'number') { /* ... */ }
  }
}
```

## 🎯 Critérios de Aceitação

- [ ] Remover **todos** os comentários `eslint-disable` do arquivo
- [ ] Eliminar uso de `as Record<string, unknown>` e conversões `as` desnecessárias
- [ ] Métodos `mergeSettings` e `validateSettings` devem usar tipos nativos
- [ ] ESLint deve passar sem warnings ou errors no arquivo
- [ ] TypeScript deve compilar sem `@ts-ignore` ou `@ts-expect-error`
- [ ] Testes existentes devem continuar passando
- [ ] Code review deve confirmar type-safety

## 💡 Solução Proposta

### Opção 1: Spread Operator + Type Assertion Segura (Recomendado)

```typescript
updateSettings(partial: Partial<OrganizationSettings>): void {
  OrganizationEntity.validateSettings(partial);

  // Type-safe merge usando spread operator
  this.settings = {
    ...this.settings,
    ...partial,
  } as OrganizationSettings;

  this.touch();
}
```

**Vantagens:**
- Mais conciso e idiomático
- Type assertion única e controlada
- Menos código para manter

### Opção 2: Atribuição Explícita por Propriedade

```typescript
updateSettings(partial: Partial<OrganizationSettings>): void {
  OrganizationEntity.validateSettings(partial);

  // Merge explícito com inferência de tipos
  this.settings = {
    timezone: partial.timezone ?? this.settings.timezone,
    locale: partial.locale ?? this.settings.locale,
    emociogramaEnabled: partial.emociogramaEnabled ?? this.settings.emociogramaEnabled,
    alertThreshold: partial.alertThreshold ?? this.settings.alertThreshold,
    dataRetentionDays: partial.dataRetentionDays ?? this.settings.dataRetentionDays,
    anonymityDefault: partial.anonymityDefault ?? this.settings.anonymityDefault,
  };

  this.touch();
}
```

**Vantagens:**
- Type-safe sem assertions
- Explícito sobre cada propriedade
- Melhor para code review

**Desvantagens:**
- Mais verboso
- Requer atualização manual ao adicionar novas propriedades

### Opção 3: Factory Function (Mais Type-Safe)

```typescript
import { createOrganizationSettings } from '../types/organization-settings.types';

updateSettings(partial: Partial<OrganizationSettings>): void {
  OrganizationEntity.validateSettings(partial);

  // Usa factory function que já garante tipo correto
  this.settings = createOrganizationSettings({
    ...this.settings,
    ...partial,
  });

  this.touch();
}
```

**Vantagens:**
- Reutiliza lógica existente
- Type-safe garantido pela factory
- Centraliza criação de settings

### Refatoração de `validateSettings`

```typescript
private static validateSettings(settings: Partial<OrganizationSettings>): void {
  const errors: Record<string, string[]> = {};

  // Type-safe usando guards de tipo nativos
  if (settings.alertThreshold !== undefined) {
    if (typeof settings.alertThreshold !== 'number') {
      errors.alertThreshold = ['O limite de alerta deve ser um número'];
    } else if (settings.alertThreshold < 1 || settings.alertThreshold > 10) {
      errors.alertThreshold = ['O limite de alerta deve estar entre 1 e 10'];
    }
  }

  if (settings.dataRetentionDays !== undefined) {
    if (typeof settings.dataRetentionDays !== 'number') {
      errors.dataRetentionDays = ['O período de retenção deve ser um número'];
    } else if (settings.dataRetentionDays < 1 || settings.dataRetentionDays > 3650) {
      errors.dataRetentionDays = ['A retenção de dados deve estar entre 1 e 3650 dias'];
    }
  }

  // Adicionar validações para outras propriedades conforme necessário

  if (Object.keys(errors).length > 0) {
    throw new ValidationException(errors);
  }
}
```

**Mudanças:**
- Remove `as Record<string, unknown>`
- Usa acesso direto às propriedades tipadas: `settings.alertThreshold`
- TypeScript infere corretamente os tipos após `!== undefined`

## 🔧 Tarefas de Implementação

### 1. Análise
- [ ] Revisar código atual e identificar todas as type assertions inseguras
- [ ] Avaliar qual opção de solução (1, 2 ou 3) melhor se adequa ao padrão do projeto
- [ ] Verificar se existem testes unitários para `OrganizationEntity`

### 2. Implementação
- [ ] Remover `eslint-disable` do topo do arquivo
- [ ] Refatorar método `updateSettings` (escolher Opção 1, 2 ou 3)
- [ ] Remover método `mergeSettings` (se aplicar Opção 1 ou 3)
- [ ] Refatorar método `validateSettings` para usar type guards nativos
- [ ] Atualizar imports se necessário (Opção 3)

### 3. Validação
- [ ] Executar `npm run lint` e garantir 0 erros/warnings
- [ ] Executar `npm run build` e confirmar compilação sem erros
- [ ] Executar testes unitários: `npm test organization.entity`
- [ ] Executar testes E2E relacionados a organizações (se existirem)
- [ ] Code review focado em type-safety

### 4. Documentação
- [ ] Atualizar comentários de código se necessário
- [ ] Documentar decisão de design no CLAUDE.md (se aplicável)

## 📚 Referências

- [TypeScript: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript: Type Assertions - When to Avoid](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [ESLint: @typescript-eslint/no-unsafe-assignment](https://typescript-eslint.io/rules/no-unsafe-assignment/)
- [ESLint: @typescript-eslint/no-unsafe-call](https://typescript-eslint.io/rules/no-unsafe-call/)
- [Clean Architecture: Domain Entities Best Practices](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Deep Dive: Type Assertion](https://basarat.gitbook.io/typescript/type-system/type-assertion)

## 🏷️ Labels

`tech-debt` `type-safety` `domain-layer` `refactoring` `high-priority` `typescript` `clean-architecture`

## 📌 Prioridade

**Alta** - Entidades de domínio são o core da aplicação e devem ter type-safety garantido para prevenir bugs em produção e facilitar manutenção.

## 🔗 Arquivos Relacionados

- `src/modules/organizations/domain/entities/organization.entity.ts` - Arquivo principal a ser refatorado
- `src/modules/organizations/domain/types/organization-settings.types.ts` - Tipos e factory function
- `src/modules/organizations/domain/entities/organization.entity.spec.ts` - Testes (se existir)
- `CLAUDE.md` - Documentação do projeto

## 🎓 Contexto Adicional

Esta issue faz parte de um esforço maior para melhorar a type-safety em toda a camada de domínio do projeto PsicoZen Backend. A entidade `OrganizationEntity` é crítica para o funcionamento do sistema de multi-tenancy e hierarquia organizacional.

### Impacto Esperado

- **Antes**: Erros de tipo podem passar despercebidos e causar bugs em runtime
- **Depois**: TypeScript garante segurança de tipos em tempo de compilação
- **Benefício**: Maior confiabilidade, melhor DX (Developer Experience), facilita refactoring futuro

---

**Criado em**: 2025-01-11
**Módulo**: Organizations
**Camada**: Domain (Clean Architecture)
**Estimativa**: 2-4 horas
