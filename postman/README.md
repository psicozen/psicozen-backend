# PsicoZen API - Postman Collection

Coleção completa do Postman com todos os endpoints da API PsicoZen Backend.

## 📁 Arquivos

- `PsicoZen_API.postman_collection.json` - Collection com todos os endpoints
- `PsicoZen_Environment.postman_environment.json` - Environment com credenciais de produção

## 🚀 Como Usar

### 1. Importar no Postman

1. Abra o Postman
2. Clique em **Import** (canto superior esquerdo)
3. Arraste os dois arquivos JSON para a área de importação:
   - `PsicoZen_API.postman_collection.json`
   - `PsicoZen_Environment.postman_environment.json`
4. Clique em **Import**

### 2. Configurar Environment

1. No canto superior direito, selecione **PsicoZen Production Environment**
2. Clique no ícone de **olho** (👁️) ao lado
3. Verifique se todas as variáveis estão configuradas

### 3. Testar a API

#### Opção A: Obter Token do Console do Navegador (RECOMENDADO) 🚀

**A maneira mais fácil e rápida de testar a API no Postman:**

1. **Faça Login no Frontend**
   - Acesse http://localhost:3001/login
   - Faça login com seu email (Magic Link)

2. **Abra o Console do Navegador**
   - Pressione `F12` ou `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Vá para a aba **Console**

3. **Copie o Access Token**
   - Você verá uma mensagem como:
   ```
   ✅ User Signed In (DEV ONLY)
   ├─ Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ├─ Expires At: 2026-01-15T10:30:00.000Z
   └─ User: seu-email@example.com
   ```
   - Copie o valor do **Access Token**

4. **Configure no Postman**
   - No Postman, selecione o environment **PsicoZen Production Environment**
   - Clique no ícone de **olho** (👁️)
   - Clique em **Edit**
   - Cole o token no campo **CURRENT VALUE** da variável `accessToken`
   - Clique em **Save**

5. **Testar Endpoints Protegidos**
   - Agora você pode executar qualquer endpoint protegido
   - O token será incluído automaticamente no header `Authorization: Bearer <token>`
   - Exemplo: Execute `GET /auth/me` para ver seu perfil

**⚠️ Observações:**
- O token expira em ~1 hora (veja `Expires At` no console)
- Quando expirar, basta fazer login novamente e copiar o novo token
- Os logs **só aparecem em modo desenvolvimento** (`NODE_ENV=development`)

---

#### Opção B: Flow de Autenticação Manual (Desenvolvimento)

1. **Send Magic Link**
   - Execute `POST /auth/send-magic-link`
   - Verifique seu email para obter o magic link

2. **Verificar Magic Link**
   - Copie o `token_hash` do link recebido por email
   - Cole no parâmetro `token_hash` da request `GET /auth/callback`
   - Execute a request
   - ✅ Os tokens serão salvos automaticamente nas variáveis da collection

3. **Testar Endpoints Protegidos**
   - Agora você pode executar qualquer endpoint protegido
   - O token de acesso será incluído automaticamente no header `Authorization`

---

#### Opção C: Flow de Autenticação com Supabase (Produção)

Se você já tem um usuário autenticado no Supabase:

1. Obtenha o `accessToken` do Supabase
2. Configure manualmente na variável `accessToken` do environment
3. Execute os endpoints protegidos

## 📚 Endpoints Disponíveis

### Authentication (Public - Não requer token)
- ✅ `POST /auth/send-magic-link` - Enviar magic link
- ✅ `GET /auth/callback` - Verificar magic link e gerar JWT
- ✅ `POST /auth/refresh` - Renovar access token

### Authentication (Protected)
- 🔒 `GET /auth/me` - Obter perfil do usuário autenticado
- 🔒 `POST /auth/logout` - Fazer logout

### Users (Protected)
- 🔒 `POST /users` - Criar novo usuário
- 🔒 `GET /users` - Listar usuários (com paginação)
- 🔒 `GET /users/me` - Obter perfil do usuário atual
- 🔒 `GET /users/:id` - Obter usuário por ID
- 🔒 `PUT /users/:id` - Atualizar usuário
- 🔒 `DELETE /users/:id` - Deletar usuário (soft delete)

### Organizations (Protected + Role-Based)
- 🔒👑 `POST /organizations` - Criar organização (SUPER_ADMIN)
- 🔒👤 `GET /organizations` - Listar organizações (ADMIN/SUPER_ADMIN)
- 🔒👤 `GET /organizations/:id` - Obter organização por ID (ADMIN/SUPER_ADMIN)
- 🔒👤 `PATCH /organizations/:id/settings` - Atualizar configurações (ADMIN/SUPER_ADMIN)
- 🔒👑 `DELETE /organizations/:id` - Deletar organização (SUPER_ADMIN)

**Legenda:**
- ✅ = Público (sem autenticação)
- 🔒 = Requer autenticação (Bearer Token)
- 👤 = Requer role ADMIN ou SUPER_ADMIN
- 👑 = Requer role SUPER_ADMIN

## 🔐 Autenticação Automática

A collection está configurada para:

1. **Salvar tokens automaticamente** após login/callback
2. **Incluir Bearer Token** em todas as requests protegidas
3. **Renovar tokens** automaticamente no endpoint `/auth/refresh`
4. **Limpar tokens** após logout

## 🧪 Testes Automatizados

Cada endpoint possui testes básicos que:
- Verificam o status code esperado
- Salvam tokens quando aplicável
- Validam a estrutura da resposta

## 📝 Variáveis da Collection

As seguintes variáveis são gerenciadas automaticamente:

- `baseUrl` - URL base da API (padrão: http://localhost:3000)
- `accessToken` - JWT access token (atualizado automaticamente)
- `refreshToken` - JWT refresh token (atualizado automaticamente)
- `userId` - ID do usuário autenticado (atualizado automaticamente)

## ⚙️ Configurações Importantes

### Rate Limiting

A API possui rate limiting configurado:
- **Magic Link**: 3 requests/minuto
- **Refresh Token**: 10 requests/minuto
- **Geral**: 10 requests/minuto

### Paginação (Queries opcionais)

Para endpoints de listagem:
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 10)
- `sortBy` - Campo para ordenação
- `sortOrder` - Ordem (ASC ou DESC)

### Headers Importantes

Adicionados automaticamente pela collection:
- `Content-Type: application/json`
- `Authorization: Bearer {{accessToken}}` (endpoints protegidos)

## 🔄 Workflow Recomendado

### Quick Start (Mais Rápido) ⚡

```
Login Frontend (http://localhost:3001/login)
         ↓
F12 → Console → Copiar Access Token
         ↓
Postman → Environment → Colar Token
         ↓
Testar Endpoints Protegidos 🎉
```

### Workflow Completo

1. **Desenvolvimento Local**
   ```
   Send Magic Link → Callback → Me → Outros endpoints
   ```

2. **Testes de CRUD**
   ```
   Create User → List Users → Get User → Update User → Delete User
   ```

3. **Testes de Organizações** (requer role ADMIN/SUPER_ADMIN)
   ```
   Create Organization → List Organizations → Get Organization →
   Update Settings → Delete Organization
   ```

## 🐛 Troubleshooting

### Token Expirado
Se receber `401 Unauthorized`:
1. Execute `POST /auth/refresh` para renovar o token
2. Ou execute o flow completo de autenticação novamente

### Email não chegou
Verifique:
1. Se o RESEND_API_KEY está configurado corretamente
2. Se o EMAIL_FROM é válido
3. Logs do servidor para erros de email

### Role Insuficiente
Se receber `403 Forbidden`:
1. Verifique se o usuário tem a role necessária
2. Endpoints de Organizations requerem ADMIN ou SUPER_ADMIN
3. Use `GET /auth/me` para verificar suas roles

## 📊 Exemplo de Response

### Sucesso (200/201)
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-01-14T02:00:00.000Z"
}
```

### Sucesso Paginado (200)
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  },
  "timestamp": "2026-01-14T02:00:00.000Z"
}
```

### Erro (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2026-01-14T02:00:00.000Z"
}
```

## 🔗 Links Úteis

- **Swagger UI**: http://localhost:3000/api/docs
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Documentação**: Ver CLAUDE.md na raiz do projeto

## 📞 Suporte

Para issues ou dúvidas:
1. Verifique os logs do servidor
2. Consulte a documentação no CLAUDE.md
3. Verifique o Swagger UI para detalhes dos endpoints
