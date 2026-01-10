# Marco 4: Sistema de Alertas

**Cronograma:** Semana 3
**Dependências:** Marco 3 (Emociograma Core - método `shouldTriggerAlert()`)
**Status:** 🔴 Não Iniciado

---

## Visão Geral

Construir sistema automatizado de alertas que dispara notificações quando colaboradores submetem estados emocionais negativos (emotion_level ≥ 6). Alertas notificam gestores e admins, com níveis de severidade e rastreamento de resolução.

**Entregável Principal:** Alertas automáticos enviados aos gestores quando colaboradores estão enfrentando dificuldades emocionais.

---

## Detalhamento de Tarefas

### Tarefa 4.1: Migração do Banco de Dados - Tabela de Alertas

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo de migration: `src/core/infrastructure/database/migrations/[timestamp]-CreateEmociogramaAlertsTable.ts`
- [ ] Criar tabela `emociograma_alerts` com todos os campos
- [ ] Criar indexes para performance:
  - [ ] `idx_alerts_organization` em `organization_id`
  - [ ] `idx_alerts_submission` em `submission_id`
  - [ ] `idx_alerts_unresolved` índice parcial WHERE `is_resolved = false`
- [ ] Adicionar foreign keys para organizations, submissions, users
- [ ] Testar migration e rollback

**Migração SQL:**
```sql
CREATE TABLE emociograma_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES emociograma_submissions(id) ON DELETE CASCADE,

  -- Detalhes do alerta
  alert_type VARCHAR(50) NOT NULL, -- 'threshold_exceeded', 'pattern_detected'
  severity VARCHAR(20) NOT NULL,   -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,

  -- Tratamento/resolução
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,

  -- Rastreamento de notificação
  notified_users UUID[], -- Array de IDs de usuários que foram notificados
  notification_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_alerts_organization ON emociograma_alerts(organization_id);
CREATE INDEX idx_alerts_submission ON emociograma_alerts(submission_id);

-- Índice parcial apenas para alertas ativos
CREATE INDEX idx_alerts_unresolved ON emociograma_alerts(organization_id, is_resolved)
  WHERE is_resolved = false;
```

**Critérios de Aceite:**
- ✅ Tabela criada com todas as colunas
- ✅ Todos os indexes criados
- ✅ Foreign keys aplicadas
- ✅ Migration pode ser revertida

---

### Tarefa 4.2: Entidade de Domínio - EmociogramaAlert

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/domain/entities/alert.entity.ts`
- [ ] Estender `BaseEntity`
- [ ] Definir propriedades: `organizationId`, `submissionId`, `alertType`, `severity`, `message`, `isResolved`, etc.
- [ ] Implementar método factory estático `create()`
- [ ] Implementar método `resolve()`
- [ ] Implementar lógica de negócio `calculateSeverity()` (baseado no nível emocional)
- [ ] Implementar helper `generateAlertMessage()`

**Código da Entidade:**
```typescript
import { BaseEntity } from '@/core/domain/entities/base.entity';
import { EmociogramaSubmissionEntity } from './submission.entity';

export type AlertType = 'threshold_exceeded' | 'pattern_detected';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CreateAlertData {
  organizationId: string;
  submissionId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
}

export class EmociogramaAlertEntity extends BaseEntity {
  organizationId: string;
  submissionId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  notifiedUsers: string[];
  notificationSentAt?: Date;

  static create(data: CreateAlertData): EmociogramaAlertEntity {
    return new EmociogramaAlertEntity({
      ...data,
      isResolved: false,
      notifiedUsers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Criar alerta a partir da entidade de submissão
   */
  static fromSubmission(submission: EmociogramaSubmissionEntity): EmociogramaAlertEntity {
    const severity = this.calculateSeverity(submission.emotionLevel);
    const message = this.generateAlertMessage(submission);

    return this.create({
      organizationId: submission.organizationId,
      submissionId: submission.id!,
      alertType: 'threshold_exceeded',
      severity,
      message,
    });
  }

  /**
   * Marcar alerta como resolvido
   */
  resolve(resolvedBy: string, notes?: string): void {
    this.isResolved = true;
    this.resolvedAt = new Date();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
    this.touch();
  }

  /**
   * Registrar notificação enviada
   */
  recordNotification(userIds: string[]): void {
    this.notifiedUsers = userIds;
    this.notificationSentAt = new Date();
    this.touch();
  }

  /**
   * Calcular severidade baseado no nível emocional
   * - 9-10: critical
   * - 7-8: high
   * - 6: medium
   */
  private static calculateSeverity(emotionLevel: number): AlertSeverity {
    if (emotionLevel >= 9) return 'critical';
    if (emotionLevel >= 7) return 'high';
    if (emotionLevel >= 6) return 'medium';
    return 'low';
  }

  /**
   * Gerar mensagem legível de alerta
   */
  private static generateAlertMessage(submission: EmociogramaSubmissionEntity): string {
    const emojiMap: Record<number, string> = {
      6: 'Cansado 😫',
      7: 'Triste 😢',
      8: 'Estressado 😣',
      9: 'Ansioso 😟',
      10: 'Muito triste 😞',
    };

    const emotionDescription = emojiMap[submission.emotionLevel] || 'Negativo';
    const location = submission.team
      ? `Equipe: ${submission.team}`
      : submission.department
      ? `Departamento: ${submission.department}`
      : 'Localização não especificada';

    return `Colaborador reportou estado emocional ${emotionDescription} (Nível ${submission.emotionLevel}/10). ${location}.`;
  }
}
```

**Critérios de Aceite:**
- ✅ Entity estende BaseEntity
- ✅ Método factory cria alerta válido
- ✅ `fromSubmission()` gera alerta a partir da submissão
- ✅ Severidade calculada corretamente
- ✅ Mensagem gerada adequadamente

---

### Tarefa 4.3: Interface do Repositório - Alert

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 1 hora
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/domain/repositories/alert.repository.interface.ts`
- [ ] Estender `IBaseRepository<EmociogramaAlertEntity>`
- [ ] Definir métodos customizados:
  - [ ] `findUnresolved()` - Obter alertas ativos
  - [ ] `findByOrganization()` - Todos os alertas da org
  - [ ] `findBySubmission()` - Alertas para submissão específica
  - [ ] `countUnresolvedBySeverity()` - Estatísticas
- [ ] Criar token de injeção

**Código da Interface:**
```typescript
import { IBaseRepository } from '@/core/domain/repositories/base.repository.interface';
import { EmociogramaAlertEntity, AlertSeverity } from '../entities/alert.entity';

export interface AlertStatistics {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  unresolved: number;
  resolvedToday: number;
}

export interface IEmociogramaAlertRepository extends IBaseRepository<EmociogramaAlertEntity> {
  /**
   * Encontrar todos os alertas não resolvidos de uma organização
   */
  findUnresolved(organizationId: string): Promise<EmociogramaAlertEntity[]>;

  /**
   * Encontrar todos os alertas de uma organização com paginação
   */
  findByOrganization(
    organizationId: string,
    options?: { skip?: number; take?: number },
  ): Promise<{ data: EmociogramaAlertEntity[]; total: number }>;

  /**
   * Encontrar alerta por ID de submissão
   */
  findBySubmission(submissionId: string): Promise<EmociogramaAlertEntity | null>;

  /**
   * Obter estatísticas de alertas para o dashboard
   */
  getStatistics(organizationId: string): Promise<AlertStatistics>;
}

export const EMOCIOGRAMA_ALERT_REPOSITORY = Symbol('IEmociogramaAlertRepository');
```

**Critérios de Aceite:**
- ✅ Interface estende IBaseRepository
- ✅ Todos os métodos de query definidos
- ✅ Tipo de estatísticas definido

---

### Tarefa 4.4: Serviço de Alertas - Disparar e Notificar

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 5 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/services/alert.service.ts`
- [ ] Criar arquivo de interface: `alert.service.interface.ts`
- [ ] Injetar repositories: `ALERT_REPOSITORY`, `USER_REPOSITORY`
- [ ] Injetar `EmailService` do módulo de emails
- [ ] Implementar método `triggerEmotionalAlert()`:
  - [ ] Criar entidade de alerta a partir da submissão
  - [ ] Persistir alerta
  - [ ] Encontrar usuários para notificar (Gestores + Admins na organização)
  - [ ] Enviar notificações por email (async)
  - [ ] Atualizar alerta com detalhes de notificação
- [ ] Implementar método `resolveAlert()`
- [ ] Implementar geração de template de email

**Interface do Serviço de Alertas:**
```typescript
import { EmociogramaSubmissionEntity } from '../entities/submission.entity';
import { EmociogramaAlertEntity } from '../entities/alert.entity';

export interface IAlertService {
  /**
   * Disparar alerta para submissão emocional
   * @param submission - A submissão que disparou o alerta
   */
  triggerEmotionalAlert(submission: EmociogramaSubmissionEntity): Promise<EmociogramaAlertEntity>;

  /**
   * Resolver um alerta
   * @param alertId - ID do alerta
   * @param resolvedBy - ID do usuário que resolveu
   * @param notes - Notas de resolução opcionais
   */
  resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<EmociogramaAlertEntity>;
}

export const ALERT_SERVICE = Symbol('IAlertService');
```

**Implementação do Serviço:**
```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IAlertService } from './alert.service.interface';
import { IEmociogramaAlertRepository, EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import { IEmailService, EMAIL_SERVICE } from '@/modules/emails/domain/services/email.service.interface';
import { EmociogramaSubmissionEntity } from '../../domain/entities/submission.entity';
import { EmociogramaAlertEntity } from '../../domain/entities/alert.entity';
import { Role } from '@/modules/roles/domain/enums/role.enum';

@Injectable()
export class EmociogramaAlertService implements IAlertService {
  constructor(
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async triggerEmotionalAlert(submission: EmociogramaSubmissionEntity): Promise<EmociogramaAlertEntity> {
    // 1. Criar entidade de alerta
    const alert = EmociogramaAlertEntity.fromSubmission(submission);

    // 2. Persistir alerta
    const savedAlert = await this.alertRepository.create(alert);

    // 3. Encontrar usuários para notificar (Gestores + Admins nesta organização)
    const usersToNotify = await this.userRepository.findByRoles(submission.organizationId, [
      Role.ADMIN,
      Role.GESTOR,
    ]);

    // 4. Enviar notificações assincronamente (não bloquear)
    this.sendNotifications(savedAlert, usersToNotify, submission).catch(error => {
      console.error('Failed to send alert notifications:', error);
    });

    return savedAlert;
  }

  async resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<EmociogramaAlertEntity> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    alert.resolve(resolvedBy, notes);
    return this.alertRepository.update(alertId, alert);
  }

  private async sendNotifications(
    alert: EmociogramaAlertEntity,
    users: UserEntity[],
    submission: EmociogramaSubmissionEntity,
  ): Promise<void> {
    const emailPromises = users.map(user =>
      this.emailService.sendEmail({
        to: user.email,
        subject: `⚠️ Alerta Emocional - ${alert.severity.toUpperCase()}`,
        template: 'emociograma-alert',
        data: {
          severity: alert.severity,
          emotionLevel: submission.emotionLevel,
          emotionEmoji: submission.emotionEmoji,
          department: submission.department,
          team: submission.team,
          isAnonymous: submission.isAnonymous,
          message: alert.message,
          timestamp: submission.submittedAt.toLocaleString('pt-BR'),
        },
      }),
    );

    await Promise.all(emailPromises);

    // Atualizar alerta com detalhes de notificação
    alert.recordNotification(users.map(u => u.id));
    await this.alertRepository.update(alert.id!, alert);
  }
}
```

**Template de Email (`emociograma-alert.html`):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Alerta Emocional - PsicoZen</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: {{ severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : '#f59e0b' }};">
      ⚠️ Alerta Emocional - {{ severity | uppercase }}
    </h2>

    <p><strong>{{ message }}</strong></p>

    <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px; background: #f3f4f6;"><strong>Nível Emocional:</strong></td>
        <td style="padding: 10px;">{{ emotionEmoji }} {{ emotionLevel }}/10</td>
      </tr>
      <tr>
        <td style="padding: 10px; background: #f3f4f6;"><strong>Equipe:</strong></td>
        <td style="padding: 10px;">{{ team || 'Não especificado' }}</td>
      </tr>
      <tr>
        <td style="padding: 10px; background: #f3f4f6;"><strong>Departamento:</strong></td>
        <td style="padding: 10px;">{{ department || 'Não especificado' }}</td>
      </tr>
      <tr>
        <td style="padding: 10px; background: #f3f4f6;"><strong>Horário:</strong></td>
        <td style="padding: 10px;">{{ timestamp }}</td>
      </tr>
      <tr>
        <td style="padding: 10px; background: #f3f4f6;"><strong>Identificação:</strong></td>
        <td style="padding: 10px;">{{ isAnonymous ? 'Anônimo' : 'Identificado' }}</td>
      </tr>
    </table>

    <div style="margin-top: 30px; padding: 15px; background: #eff6ff; border-left: 4px solid #3b82f6;">
      <p style="margin: 0;"><strong>Ação Recomendada:</strong></p>
      <p style="margin: 5px 0 0 0;">
        {{ severity === 'critical'
          ? 'Intervenção imediata recomendada. Considere contato direto com o colaborador ou RH.'
          : severity === 'high'
          ? 'Monitoramento próximo recomendado. Considere conversa individual.'
          : 'Acompanhamento sugerido nos próximos dias.' }}
      </p>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
      Esta é uma mensagem automática do PsicoZen. Para mais informações, acesse o dashboard.
    </p>
  </div>
</body>
</html>
```

**Critérios de Aceite:**
- ✅ Service cria e persiste alerta
- ✅ Encontra usuários corretos para notificar (Gestores + Admins)
- ✅ Envia notificações por email
- ✅ Atualiza alerta com detalhes de notificação
- ✅ `resolveAlert()` marca alerta como resolvido

---

### Tarefa 4.5: Implementação do Repositório - Alert

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/infrastructure/repositories/alert.repository.ts`
- [ ] Estender `TypeOrmBaseRepository`
- [ ] Implementar métodos de mapeamento
- [ ] Implementar todos os métodos de query customizados
- [ ] Otimizar queries com indexes

**Critérios de Aceite:**
- ✅ Repository estende classe base
- ✅ Todos os métodos implementados
- ✅ Mappers lidam com todos os campos

---

### Tarefa 4.6: Caso de Uso - Obter Dashboard de Alertas

**Prioridade:** 🟢 Média
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/use-cases/get-alert-dashboard.use-case.ts`
- [ ] Injetar `EMOCIOGRAMA_ALERT_REPOSITORY`
- [ ] Obter estatísticas de alertas
- [ ] Obter alertas não resolvidos recentes
- [ ] Retornar dados do dashboard

**Código do Caso de Uso:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IEmociogramaAlertRepository, EMOCIOGRAMA_ALERT_REPOSITORY } from '../../domain/repositories/alert.repository.interface';

export interface AlertDashboardResponse {
  statistics: {
    total: number;
    unresolved: number;
    resolvedToday: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  recentAlerts: EmociogramaAlertEntity[];
}

@Injectable()
export class GetAlertDashboardUseCase {
  constructor(
    @Inject(EMOCIOGRAMA_ALERT_REPOSITORY)
    private readonly alertRepository: IEmociogramaAlertRepository,
  ) {}

  async execute(organizationId: string): Promise<AlertDashboardResponse> {
    const [statistics, recentAlerts] = await Promise.all([
      this.alertRepository.getStatistics(organizationId),
      this.alertRepository.findUnresolved(organizationId),
    ]);

    return {
      statistics: {
        total: statistics.total,
        unresolved: statistics.unresolved,
        resolvedToday: statistics.resolvedToday,
        bySeverity: statistics.bySeverity,
      },
      recentAlerts: recentAlerts.slice(0, 10), // Últimos 10
    };
  }
}
```

**Critérios de Aceite:**
- ✅ Use case retorna dados do dashboard
- ✅ Estatísticas calculadas
- ✅ Alertas recentes incluídos

---

### Tarefa 4.7: Testes Unitários - Entidade de Alerta

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `alert.entity.spec.ts`
- [ ] Testar `fromSubmission()` cria alerta corretamente
- [ ] Testar cálculo de severidade (critical, high, medium)
- [ ] Testar geração de mensagem
- [ ] Testar `resolve()` marca como resolvido

**Critérios de Aceite:**
- ✅ Todos os testes da entity passam
- ✅ Cobertura ≥80%

---

### Tarefa 4.8: Testes Unitários - Serviço de Alertas

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `alert.service.spec.ts`
- [ ] Mockar repositories e email service
- [ ] Testar `triggerEmotionalAlert()`:
  - [ ] Alerta criado e persistido
  - [ ] Usuários encontrados e notificados
  - [ ] Email service chamado
  - [ ] Notificação registrada
- [ ] Testar `resolveAlert()` atualiza corretamente

**Critérios de Aceite:**
- ✅ Todos os testes do service passam
- ✅ Mocks configurados corretamente

---

### Tarefa 4.9: Testes de Integração - Fluxo de Alertas

**Prioridade:** 🟢 Média
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `alert-flow.integration.spec.ts`
- [ ] Criar organização de teste, usuários, submissão
- [ ] Disparar alerta e verificar:
  - [ ] Alerta criado no banco de dados
  - [ ] Email enviado aos usuários corretos
  - [ ] Detalhes de notificação registrados
- [ ] Resolver alerta e verificar atualização

**Critérios de Aceite:**
- ✅ Teste de integração passa
- ✅ Fluxo completo de alerta verificado

---

## Definição de Pronto

O Marco 4 está completo quando:

- ✅ **Database:** Tabela de alertas criada com indexes
- ✅ **Entity:** Entidade de alerta com cálculo de severidade
- ✅ **Repository:** Repository de alertas com queries de estatísticas
- ✅ **Service:** Service de alertas dispara e envia notificações
- ✅ **Email:** Template de email criado e funcionando
- ✅ **Use Cases:** Use case de dashboard de alertas funcional
- ✅ **Tests:** Cobertura ≥80% (unit + integration)
- ✅ **Validation:** Alertas disparados para emotion >= 6, usuários corretos notificados

---

## Dependências para Próximos Marcos

- **Marco 5 (Endpoints da API):** Requer serviço de alertas para endpoint de dashboard

---

## Recursos

- [NestJS Email](https://docs.nestjs.com/techniques/email)
- [TypeORM Array Columns](https://typeorm.io/entities#column-types-for-postgres)
- [Async Operations Best Practices](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
