# Marco 6: Privacidade & Conformidade LGPD

**Cronograma:** Semana 4-5
**Dependências:** Marco 3 (Emociograma Core)
**Status:** 🔴 Não Iniciado

---

## Visão Geral

Implementar recursos de conformidade com a LGPD (Lei Geral de Proteção de Dados - GDPR do Brasil): anonimização de dados, exportação, exclusão, moderação de comentários e registro de auditoria. Garantir que os usuários tenham controle total sobre seus dados pessoais.

**Entregável Principal:** Controles de privacidade de dados em conformidade com a LGPD para colaboradores.

---

## Detalhamento de Tarefas

### Tarefa 6.1: Serviço de Moderação de Comentários

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/services/comment-moderation.service.ts`
- [ ] Definir padrões de palavras inapropriadas (regex)
- [ ] Implementar método `moderateComment()`
- [ ] Implementar método `sanitize()` (substituir com ***)
- [ ] Retornar resultado de moderação com flag
- [ ] Tornar padrões configuráveis (futuro: configurações da organização)

**Código do Serviço (Aprimorado do M3):**
```typescript
import { Injectable } from '@nestjs/common';

export interface ModerationResult {
  isFlagged: boolean;
  sanitizedComment: string;
  reason?: 'inappropriate_language' | 'excessive_caps' | 'spam' | 'personal_info';
}

@Injectable()
export class CommentModerationService {
  // Padrões inapropriados (palavrões em português + termos ofensivos genéricos)
  private inappropriatePatterns: RegExp[] = [
    // Palavrões em português (exemplos - personalize conforme necessário)
    /\b(merda|porra|caralho|fdp|filho da puta)\b/gi,
    // Ofensivos genéricos
    /\b(hate|kill|die|stupid|idiot|moron|retard)\b/gi,
  ];

  // Padrão de caps excessivos (gritaria)
  private excessiveCapsPattern = /[A-Z]{10,}/g;

  // Padrão de spam (caracteres repetidos)
  private spamPattern = /(.)\1{5,}/g;

  // Padrões de informações pessoais (email, telefone, CPF)
  private personalInfoPatterns: RegExp[] = [
    /\b[\w.-]+@[\w.-]+\.\w{2,}\b/gi, // Email
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{2}\b/g, // Telefone brasileiro
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, // Formato CPF
  ];

  async moderateComment(comment: string): Promise<ModerationResult> {
    if (!comment || comment.trim().length === 0) {
      return {
        isFlagged: false,
        sanitizedComment: comment,
      };
    }

    // Verificar linguagem inapropriada
    if (this.hasInappropriateLanguage(comment)) {
      return {
        isFlagged: true,
        sanitizedComment: this.sanitizeInappropriateLanguage(comment),
        reason: 'inappropriate_language',
      };
    }

    // Verificar caps excessivos
    if (this.excessiveCapsPattern.test(comment)) {
      return {
        isFlagged: true,
        sanitizedComment: this.sanitizeExcessiveCaps(comment),
        reason: 'excessive_caps',
      };
    }

    // Verificar spam
    if (this.spamPattern.test(comment)) {
      return {
        isFlagged: true,
        sanitizedComment: this.sanitizeSpam(comment),
        reason: 'spam',
      };
    }

    // Verificar informações pessoais (proteção LGPD)
    if (this.hasPersonalInfo(comment)) {
      return {
        isFlagged: true,
        sanitizedComment: this.sanitizePersonalInfo(comment),
        reason: 'personal_info',
      };
    }

    return {
      isFlagged: false,
      sanitizedComment: comment,
    };
  }

  private hasInappropriateLanguage(comment: string): boolean {
    return this.inappropriatePatterns.some(pattern => pattern.test(comment));
  }

  private hasPersonalInfo(comment: string): boolean {
    return this.personalInfoPatterns.some(pattern => pattern.test(comment));
  }

  private sanitizeInappropriateLanguage(comment: string): string {
    let sanitized = comment;
    this.inappropriatePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, match => '*'.repeat(match.length));
    });
    return sanitized;
  }

  private sanitizeExcessiveCaps(comment: string): string {
    return comment.replace(this.excessiveCapsPattern, match => {
      return match.charAt(0) + match.slice(1).toLowerCase();
    });
  }

  private sanitizeSpam(comment: string): string {
    return comment.replace(this.spamPattern, '$1$1$1'); // Máximo 3 repetições
  }

  private sanitizePersonalInfo(comment: string): string {
    let sanitized = comment;
    this.personalInfoPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[INFORMAÇÃO PESSOAL REMOVIDA]');
    });
    return sanitized;
  }
}
```

**Critérios de Aceite:**
- ✅ Serviço detecta linguagem inapropriada
- ✅ Serviço detecta informações pessoais (email, telefone, CPF)
- ✅ Sanitização substitui com *** ou remove
- ✅ Retorna razão da flag

---

### Tarefa 6.2: Serviço de Anonimização de Dados

**Prioridade:** 🔴 Crítica
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/modules/emociograma/application/services/data-anonymization.service.ts`
- [ ] Implementar `anonymizeUserData()` - Definir todas as submissões como anônimas
- [ ] Implementar `exportUserData()` - Direito LGPD à portabilidade de dados
- [ ] Implementar `deleteUserData()` - Direito LGPD ao apagamento
- [ ] Injetar repositórios: `EMOCIOGRAMA_SUBMISSION_REPOSITORY`, `USER_REPOSITORY`, `AUDIT_LOG_SERVICE`
- [ ] Adicionar logging de auditoria para todas as operações de dados

**Código do Serviço:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IEmociogramaSubmissionRepository, EMOCIOGRAMA_SUBMISSION_REPOSITORY } from '../../domain/repositories/submission.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '@/modules/users/domain/repositories/user.repository.interface';
import { IAuditLogService, AUDIT_LOG_SERVICE } from '@/core/application/services/audit-log.service.interface';

export interface UserDataExport {
  profile: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    department?: string;
    team?: string;
    createdAt: Date;
  };
  submissions: {
    submittedAt: Date;
    emotionLevel: number;
    emotionEmoji: string;
    category: string;
    comment?: string;
    isAnonymous: boolean;
  }[];
  exportedAt: Date;
  format: 'json';
}

@Injectable()
export class DataAnonymizationService {
  constructor(
    @Inject(EMOCIOGRAMA_SUBMISSION_REPOSITORY)
    private readonly submissionRepository: IEmociogramaSubmissionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: IAuditLogService,
  ) {}

  /**
   * Anonimizar todas as submissões do usuário (LGPD Artigo 18, II)
   * Define todas as submissões como anônimas e remove comentários
   */
  async anonymizeUserData(userId: string, organizationId: string): Promise<void> {
    // 1. Anonimizar todas as submissões
    await this.submissionRepository.anonymizeByUser(userId, organizationId);

    // 2. Log de auditoria
    await this.auditLogService.log({
      action: 'user_data_anonymized',
      userId,
      organizationId,
      metadata: {
        timestamp: new Date(),
        reason: 'LGPD_compliance',
      },
    });
  }

  /**
   * Exportar dados do usuário (LGPD Artigo 18, IV - Direito à Portabilidade de Dados)
   * Retorna todos os dados pessoais em formato legível por máquina
   */
  async exportUserData(userId: string, organizationId: string): Promise<UserDataExport> {
    // 1. Obter perfil do usuário
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Obter todas as submissões (incluindo anônimas)
    const submissionsResult = await this.submissionRepository.findByUser(userId, organizationId, {
      limit: 10000, // Limite máximo
      offset: 0,
    });

    // 3. Formatar dados para exportação
    const exportData: UserDataExport = {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        team: user.team,
        createdAt: user.createdAt,
      },
      submissions: submissionsResult.data.map(sub => ({
        submittedAt: sub.submittedAt,
        emotionLevel: sub.emotionLevel,
        emotionEmoji: sub.emotionEmoji,
        category: sub.categoryId,
        comment: sub.comment,
        isAnonymous: sub.isAnonymous,
      })),
      exportedAt: new Date(),
      format: 'json',
    };

    // 4. Log de auditoria
    await this.auditLogService.log({
      action: 'user_data_exported',
      userId,
      organizationId,
      metadata: {
        submissionsCount: exportData.submissions.length,
        timestamp: new Date(),
      },
    });

    return exportData;
  }

  /**
   * Excluir dados do usuário (LGPD Artigo 18, VI - Direito ao Apagamento)
   * Exclui permanentemente todas as submissões (hard delete, não soft delete)
   */
  async deleteUserData(userId: string, organizationId: string): Promise<void> {
    // 1. Excluir todas as submissões
    await this.submissionRepository.deleteByUser(userId, organizationId);

    // 2. Log de auditoria (importante para conformidade)
    await this.auditLogService.log({
      action: 'user_data_deleted',
      userId,
      organizationId,
      metadata: {
        timestamp: new Date(),
        reason: 'LGPD_right_to_erasure',
      },
    });
  }
}
```

**Critérios de Aceite:**
- ✅ Anonimização define todas as submissões como anônimas
- ✅ Exportação retorna dados completos do usuário em JSON
- ✅ Exclusão remove todas as submissões
- ✅ Todas as operações registradas em trilha de auditoria

---

### Tarefa 6.3: Serviço de Log de Auditoria

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo: `src/core/application/services/audit-log.service.ts`
- [ ] Criar interface: `audit-log.service.interface.ts`
- [ ] Criar migration para tabela `audit_logs`
- [ ] Implementar método `log()`
- [ ] Implementar método `getAuditTrail()` para visualizar logs
- [ ] Adicionar limpeza automática de logs antigos (política de retenção)

**Migration de Audit Logs:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL, -- 'user_data_exported', 'user_data_deleted', etc.
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45), -- IPv4 ou IPv6
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

**Interface do Serviço:**
```typescript
export interface AuditLogEntry {
  action: string;
  userId: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuditLogService {
  /**
   * Registrar uma ação na trilha de auditoria
   */
  log(entry: AuditLogEntry): Promise<void>;

  /**
   * Obter trilha de auditoria para usuário
   */
  getAuditTrail(userId: string, organizationId?: string): Promise<AuditLogEntity[]>;
}

export const AUDIT_LOG_SERVICE = Symbol('IAuditLogService');
```

**Implementação do Serviço:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuditLogService, AuditLogEntry } from './audit-log.service.interface';
import { AuditLogSchema } from '../../infrastructure/persistence/audit-log.schema';

@Injectable()
export class AuditLogService implements IAuditLogService {
  constructor(
    @InjectRepository(AuditLogSchema)
    private readonly auditLogRepository: Repository<AuditLogSchema>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.auditLogRepository.save({
      action: entry.action,
      userId: entry.userId,
      organizationId: entry.organizationId,
      metadata: entry.metadata || {},
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      createdAt: new Date(),
    });
  }

  async getAuditTrail(userId: string, organizationId?: string): Promise<AuditLogEntity[]> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_logs')
      .where('audit_logs.user_id = :userId', { userId });

    if (organizationId) {
      queryBuilder.andWhere('audit_logs.organization_id = :organizationId', { organizationId });
    }

    queryBuilder.orderBy('audit_logs.created_at', 'DESC').limit(100);

    return queryBuilder.getMany();
  }

  /**
   * Limpar logs antigos (executar via cron job)
   * Retenção: 2 anos (conformidade LGPD)
   */
  async cleanupOldLogs(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 2);

    await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :retentionDate', { retentionDate })
      .execute();
  }
}
```

**Critérios de Aceite:**
- ✅ Tabela de logs de auditoria criada
- ✅ `log()` persiste entradas de auditoria
- ✅ `getAuditTrail()` recupera logs
- ✅ Método de limpeza remove logs antigos

---

### Tarefa 6.4: Endpoints LGPD - Controller de Usuários

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Atualizar arquivo: `src/modules/users/presentation/controllers/users.controller.ts`
- [ ] Adicionar endpoints LGPD:
  - [ ] `GET /users/data-export` - Exportar dados do usuário (COLABORADOR)
  - [ ] `POST /users/data-anonymize` - Anonimizar dados (COLABORADOR)
  - [ ] `DELETE /users/data-deletion` - Solicitar exclusão (COLABORADOR)
  - [ ] `GET /users/audit-trail` - Visualizar log de auditoria (COLABORADOR)
- [ ] Adicionar mecanismos de confirmação (confirmação por email para exclusão)
- [ ] Adicionar documentação Swagger

**Código dos Endpoints LGPD:**
```typescript
import { Controller, Get, Post, Delete, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/presentation/guards/roles.guard';
import { Roles } from '@/core/presentation/decorators/roles.decorator';
import { CurrentUser } from '@/core/presentation/decorators/current-user.decorator';
import { Role } from '@/modules/roles/domain/enums/role.enum';
import { ApiResponseDto } from '@/core/application/dtos/api-response.dto';
import { DataAnonymizationService } from '@/modules/emociograma/application/services/data-anonymization.service';
import { UserDataExport } from '@/modules/emociograma/application/services/data-anonymization.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Users - LGPD')
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly dataAnonymizationService: DataAnonymizationService,
    private readonly auditLogService: IAuditLogService,
  ) {}

  @Get('data-export')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Exportar meus dados pessoais (LGPD Artigo 18, IV)',
    description: 'Baixar todos os dados pessoais em formato JSON legível por máquina. Inclui perfil e todas as submissões.',
  })
  @ApiResponse({ status: 200, description: 'Dados exportados com sucesso', type: UserDataExport })
  async exportMyData(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<UserDataExport>> {
    const data = await this.dataAnonymizationService.exportUserData(userId, organizationId);
    return ApiResponseDto.success(data, 'Dados pessoais exportados com sucesso');
  }

  @Post('data-anonymize')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Anonimizar meus dados (LGPD Artigo 18, II)',
    description: 'Anonimizar todas as submissões definindo-as como anônimas e removendo comentários. Esta ação é irreversível.',
  })
  @ApiResponse({ status: 200, description: 'Dados anonimizados com sucesso' })
  async anonymizeMyData(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.dataAnonymizationService.anonymizeUserData(userId, organizationId);
    return ApiResponseDto.success(null, 'Todas as submissões foram anonimizadas');
  }

  @Delete('data-deletion')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Solicitar exclusão de dados (LGPD Artigo 18, VI)',
    description: 'Excluir permanentemente todas as submissões. Esta ação é irreversível. Requer confirmação por email.',
  })
  @ApiResponse({ status: 200, description: 'Exclusão de dados solicitada. Verifique seu email para link de confirmação.' })
  async requestDataDeletion(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<void>> {
    // Enviar email de confirmação
    await this.emailService.sendDataDeletionConfirmation(userEmail, userId, organizationId);

    return ApiResponseDto.success(
      null,
      'Exclusão de dados solicitada. Por favor, verifique seu email para confirmar esta ação.',
    );
  }

  @Get('audit-trail')
  @Roles(Role.COLABORADOR, Role.GESTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Visualizar minha trilha de auditoria',
    description: 'Ver todas as operações de dados realizadas na minha conta (exportações, anonimizações, exclusões).',
  })
  @ApiResponse({ status: 200, description: 'Trilha de auditoria recuperada' })
  async getMyAuditTrail(
    @CurrentUser('id') userId: string,
    @Headers('x-organization-id') organizationId: string,
  ): Promise<ApiResponseDto<AuditLogEntity[]>> {
    const logs = await this.auditLogService.getAuditTrail(userId, organizationId);
    return ApiResponseDto.success(logs);
  }
}
```

**Critérios de Aceite:**
- ✅ Todos os 4 endpoints LGPD implementados
- ✅ Exportação retorna dados JSON
- ✅ Anonimização marca todas as submissões como anônimas
- ✅ Exclusão requer confirmação por email
- ✅ Trilha de auditoria visualizável pelo usuário

---

### Tarefa 6.5: Confirmação por Email para Exclusão de Dados

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar template de email: `data-deletion-confirmation.html`
- [ ] Gerar token seguro para link de confirmação
- [ ] Armazenar token no Redis ou banco de dados com TTL (1 hora)
- [ ] Criar endpoint: `GET /users/confirm-deletion?token=xxx`
- [ ] Verificar token e executar exclusão
- [ ] Enviar email de confirmação final após exclusão

**Endpoint de Confirmação:**
```typescript
@Get('confirm-deletion')
@Public()
@ApiOperation({ summary: 'Confirmar exclusão de dados via link de email' })
@ApiResponse({ status: 200, description: 'Dados excluídos com sucesso' })
async confirmDataDeletion(@Query('token') token: string): Promise<ApiResponseDto<void>> {
  // 1. Verificar token
  const payload = await this.tokenService.verify(token);
  if (!payload) {
    throw new UnauthorizedException('Token de confirmação inválido ou expirado');
  }

  // 2. Excluir dados
  await this.dataAnonymizationService.deleteUserData(payload.userId, payload.organizationId);

  // 3. Enviar email de confirmação final
  await this.emailService.sendDataDeletionComplete(payload.email);

  return ApiResponseDto.success(null, 'Todos os dados pessoais foram permanentemente excluídos');
}
```

**Template de Email:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Confirme a Exclusão de Dados - PsicoZen</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">⚠️ Confirmação de Exclusão de Dados</h2>

    <p>Você solicitou a exclusão permanente de todos os seus dados pessoais no PsicoZen.</p>

    <div style="margin: 30px 0; padding: 20px; background: #fef2f2; border-left: 4px solid #dc2626;">
      <p style="margin: 0; font-weight: bold;">Esta ação é IRREVERSÍVEL.</p>
      <p style="margin: 10px 0 0 0;">Ao confirmar, todos os seus dados serão permanentemente excluídos:</p>
      <ul style="margin: 10px 0 0 20px;">
        <li>Todas as submissões emocionais</li>
        <li>Comentários e histórico</li>
        <li>Configurações e preferências</li>
      </ul>
    </div>

    <p>Se você realmente deseja excluir seus dados, clique no botão abaixo:</p>

    <a href="{{ confirmationUrl }}" style="display: inline-block; margin: 20px 0; padding: 15px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
      CONFIRMAR EXCLUSÃO DE DADOS
    </a>

    <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
      Este link expira em 1 hora. Se você não solicitou esta exclusão, ignore este e-mail.
    </p>
  </div>
</body>
</html>
```

**Critérios de Aceite:**
- ✅ Email enviado com token seguro
- ✅ Token expira após 1 hora
- ✅ Endpoint de confirmação verifica token
- ✅ Dados excluídos após confirmação
- ✅ Email final enviado

---

### Tarefa 6.6: Documentação da Política de Privacidade

**Prioridade:** 🟢 Média
**Tempo Estimado:** 2 horas
**Responsável:** Desenvolvedor Backend + Jurídico

**Subtarefas:**
- [ ] Criar arquivo: `docs/PRIVACY_POLICY.md`
- [ ] Documentar medidas de conformidade LGPD
- [ ] Listar dados coletados e finalidades
- [ ] Explicar direitos do usuário (acesso, anonimização, exclusão)
- [ ] Documentar políticas de retenção de dados
- [ ] Fornecer contato do DPO (Data Protection Officer)

**Estrutura da Política de Privacidade:**
```markdown
# Política de Privacidade - PsicoZen

## 1. Dados Coletados
- Estado emocional diário (nível 1-10)
- Categoria da emoção
- Comentários opcionais
- Departamento e equipe (para relatórios agregados)
- Email e nome (para autenticação)

## 2. Finalidade do Tratamento
- Monitoramento do bem-estar emocional dos colaboradores
- Geração de relatórios agregados para gestores
- Identificação de padrões de estresse organizacional
- Acionamento de alertas para intervenção precoce

## 3. Direitos do Titular (LGPD Art. 18)
Você tem direito a:
- **Acesso**: Visualizar todos os seus dados
- **Portabilidade**: Exportar seus dados em formato JSON
- **Anonimização**: Tornar suas submissões anônimas
- **Exclusão**: Solicitar a exclusão permanente de seus dados
- **Auditoria**: Visualizar histórico de operações em seus dados

## 4. Anonimato
- Você pode escolher submeter emoções anonimamente
- Submissões anônimas não revelam sua identidade para gestores
- Departamento e equipe são preservados para análise agregada

## 5. Retenção de Dados
- Dados retidos por até 365 dias (configurável por organização)
- Logs de auditoria retidos por 2 anos (conformidade LGPD)
- Dados excluídos permanentemente após solicitação

## 6. Segurança
- Criptografia em trânsito (HTTPS)
- Criptografia em repouso (banco de dados)
- Controle de acesso baseado em função (RBAC)
- Logs de auditoria para todas as operações sensíveis

## 7. Contato do DPO
Email: dpo@psicozen.com.br
Telefone: +55 (XX) XXXX-XXXX
```

**Critérios de Aceite:**
- ✅ Política de privacidade documentada
- ✅ Conformidade LGPD explicada
- ✅ Direitos do usuário listados
- ✅ Contato do DPO fornecido

---

### Tarefa 6.7: Testes Unitários - Serviços de Privacidade

**Prioridade:** 🟡 Alta
**Tempo Estimado:** 4 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivos de teste:
  - [ ] `comment-moderation.service.spec.ts`
  - [ ] `data-anonymization.service.spec.ts`
  - [ ] `audit-log.service.spec.ts`
- [ ] Testar moderação detecta conteúdo inapropriado
- [ ] Testar anonimização define todas as submissões como anônimas
- [ ] Testar exportação retorna dados completos
- [ ] Testar exclusão remove todos os dados
- [ ] Testar logging de auditoria funciona

**Exemplo de Teste:**
```typescript
import { DataAnonymizationService } from './data-anonymization.service';

describe('DataAnonymizationService', () => {
  let service: DataAnonymizationService;
  let mockSubmissionRepository: jest.Mocked<IEmociogramaSubmissionRepository>;
  let mockAuditLogService: jest.Mocked<IAuditLogService>;

  beforeEach(() => {
    mockSubmissionRepository = {
      anonymizeByUser: jest.fn(),
      deleteByUser: jest.fn(),
      findByUser: jest.fn(),
    } as any;

    mockAuditLogService = {
      log: jest.fn(),
    } as any;

    service = new DataAnonymizationService(
      mockSubmissionRepository,
      mockUserRepository,
      mockAuditLogService,
    );
  });

  describe('anonymizeUserData', () => {
    it('deve anonimizar todas as submissões do usuário', async () => {
      await service.anonymizeUserData('user-123', 'org-456');

      expect(mockSubmissionRepository.anonymizeByUser).toHaveBeenCalledWith('user-123', 'org-456');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_data_anonymized',
          userId: 'user-123',
        }),
      );
    });
  });

  describe('exportUserData', () => {
    it('deve exportar todos os dados do usuário em formato JSON', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSubmissions = {
        data: [
          { emotionLevel: 5, emotionEmoji: '😕', isAnonymous: false },
        ],
        total: 1,
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockSubmissionRepository.findByUser.mockResolvedValue(mockSubmissions);

      const result = await service.exportUserData('user-123', 'org-456');

      expect(result.profile.email).toBe('test@example.com');
      expect(result.submissions.length).toBe(1);
      expect(result.format).toBe('json');
    });
  });
});
```

**Critérios de Aceite:**
- ✅ Todos os testes de serviço passam
- ✅ Cobertura ≥80%
- ✅ Casos extremos testados

---

### Tarefa 6.8: Testes E2E - Endpoints LGPD

**Prioridade:** 🟢 Média
**Tempo Estimado:** 3 horas
**Responsável:** Desenvolvedor Backend

**Subtarefas:**
- [ ] Criar arquivo de teste: `test/lgpd.e2e-spec.ts`
- [ ] Testar fluxo completo de exportação de dados
- [ ] Testar fluxo de anonimização
- [ ] Testar fluxo de confirmação de exclusão
- [ ] Testar recuperação de trilha de auditoria
- [ ] Verificar email enviado para confirmação de exclusão

**Critérios de Aceite:**
- ✅ Todos os testes E2E passam
- ✅ Fluxos LGPD completos testados
- ✅ Confirmação por email testada

---

## Definição de Pronto

Marco 6 está completo quando:

- ✅ **Moderação de Comentários:** Serviço detecta e sanitiza conteúdo inapropriado
- ✅ **Anonimização de Dados:** Serviço anonimiza, exporta e exclui dados do usuário
- ✅ **Logging de Auditoria:** Todas as operações de dados registradas com retenção de 2 anos
- ✅ **Endpoints LGPD:** Endpoints de exportação, anonimização e exclusão funcionais
- ✅ **Confirmação por Email:** Exclusão requer confirmação por email
- ✅ **Política de Privacidade:** Documentada e acessível
- ✅ **Testes:** Cobertura ≥80% (unitários + integração + E2E)
- ✅ **Conformidade:** Atende aos Artigos 18 da LGPD (direitos do usuário)

---

## Checklist de Conformidade LGPD

- [x] **Artigo 18, I** - Confirmação do tratamento de dados (via trilha de auditoria)
- [x] **Artigo 18, II** - Direito à anonimização (endpoint de anonimização)
- [x] **Artigo 18, IV** - Direito à portabilidade de dados (endpoint de exportação)
- [x] **Artigo 18, VI** - Direito ao apagamento (endpoint de exclusão)
- [x] **Artigo 46** - Medidas de segurança (logs de auditoria, criptografia)
- [x] **Artigo 48** - Comunicação de incidentes de segurança (via email)

---

## Recursos

- [Texto Oficial da LGPD (Lei 13.709/2018)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [Melhores Práticas de Audit Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
