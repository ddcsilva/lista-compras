# 🛒 Vai na Lista

Uma aplicação moderna de lista de compras desenvolvida com Angular 18, seguindo as melhores práticas de arquitetura enterprise.

## 🎯 Sobre o Projeto

O **Vai na Lista** é um MVP de aplicativo para gerenciar listas de compras de forma simples e eficiente. Desenvolvido com foco em escalabilidade, organização e boas práticas de desenvolvimento, incluindo um sistema robusto de **Error Handling & Logging**.

## ✨ Funcionalidades

### 🔐 Autenticação
- Login fake (aceita qualquer email válido e senha com 3+ caracteres)
- Persistência de sessão no localStorage
- Guards de proteção de rotas
- Logout com confirmação

### 📝 Gerenciamento de Lista
- ➕ Adicionar itens com descrição e quantidade
- ✏️ Editar itens existentes
- ✅ Marcar/desmarcar itens como concluídos
- 🗑️ Remover itens individuais
- 📊 Estatísticas em tempo real (total, restantes, concluídos)
- 👁️ Filtrar visualização de itens concluídos
- 🧹 Limpar itens concluídos ou toda a lista

### 💾 Persistência
- Dados salvos automaticamente no localStorage
- Recuperação automática ao recarregar a página
- Sincronização entre abas do navegador

### 🛡️ Error Handling & Logging
- **LoggingService centralizado** com múltiplos níveis (DEBUG, INFO, WARN, ERROR)
- **ToastService** para notificações visuais amigáveis
- **ErrorInterceptor global** para tratamento automático de erros HTTP
- **Fallback UI** para componentes com falha
- **Monitoramento proativo** com logs estruturados
- **Preparado para integração** com Sentry, Firebase Crashlytics, etc.

## 🛠 Tecnologias Utilizadas

- **Angular 18** - Framework principal
- **Standalone Components** - Arquitetura moderna sem NgModules
- **TailwindCSS** - Framework de CSS utilitário
- **TypeScript** - Linguagem de programação
- **Signals** - Gerenciamento de estado reativo
- **Reactive Forms** - Formulários reativos com validação
- **Router Guards** - Proteção de rotas
- **HTTP Interceptors** - Tratamento global de erros

## 🏗 Arquitetura

O projeto segue a **arquitetura enterprise** recomendada por Tomas Trajan:

```
src/app/
├── core/                           # Serviços singleton e funcionalidades core
│   ├── guards/                    # Guards de rota
│   ├── services/                  # Serviços principais
│   │   ├── auth.service.ts       # Autenticação
│   │   ├── storage.service.ts    # Abstração do localStorage
│   │   ├── logging.service.ts    # Sistema de logging centralizado
│   │   └── toast.service.ts      # Gerenciamento de notificações
│   └── interceptors/             # Interceptors HTTP
│       └── error.interceptor.ts  # Tratamento global de erros
├── shared/                        # Componentes, pipes e utilitários compartilhados
│   ├── components/               # Componentes reutilizáveis
│   │   ├── loading/             # Indicador de carregamento
│   │   └── toast/               # Sistema de notificações visuais
│   └── models/                  # Interfaces e tipos
├── features/                     # Módulos de funcionalidades
│   ├── autenticacao/            # Feature de login
│   └── lista/                   # Feature de lista de compras
└── app.routes.ts               # Configuração de rotas com lazy loading
```

### 🎨 Padrões Implementados

- **SOLID Principles** - Código bem estruturado e extensível
- **Clean Code** - Código limpo e legível
- **Repository Pattern** - Abstração do localStorage
- **Dependency Injection** - Injeção de dependências do Angular
- **Reactive Programming** - Uso de Signals para reatividade
- **Lazy Loading** - Carregamento sob demanda de componentes
- **Error Handling Patterns** - Tratamento centralizado e categorizado de erros
- **Logging Strategy** - Sistema estruturado de logs com níveis

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Angular CLI 18+

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd lista-compras
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Execute o projeto**
   ```bash
   ng serve
   ```

4. **Acesse a aplicação**
   ```
   http://localhost:4200
   ```

### 🧪 Como Testar

#### Sistema de Autenticação
1. **Acesse a tela de login**
   - Use qualquer email válido (ex: `usuario@teste.com`)
   - Use qualquer senha com 3+ caracteres (ex: `123`)
   - Ou clique em "Preencher com dados de exemplo"

#### Sistema de Notificações
1. **Teste as notificações**
   - Na tela de login, clique em "🧪 Testar Sistema de Notificações"
   - Observe as 4 notificações sequenciais (sucesso, aviso, erro, info)
   - Verifique a persistência e auto-dismiss

#### Error Handling
1. **Simule erros de rede**
   - Desconecte a internet
   - Tente fazer alguma ação
   - Observe a notificação de erro de rede

2. **Teste Fallback UI**
   - Simule uma falha de componente
   - Observe a tela de erro com opção "Tentar Novamente"

#### Gerenciamento da Lista
1. **Faça login e teste todas as funcionalidades**
   - Adicione itens com descrição e quantidade
   - Marque itens como concluídos
   - Edite itens existentes
   - Use os filtros e ações de limpeza
   - Observe as notificações de sucesso/erro

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona perfeitamente em:
- 📱 Dispositivos móveis
- 📱 Tablets
- 💻 Desktops
- 🖥️ Monitores grandes

## 🎨 Design System

### Cores Principais
- **Primary**: Tons de azul (#0ea5e9 - #0c4a6e)
- **Secondary**: Tons de cinza neutro
- **Success**: Verde para itens concluídos
- **Warning**: Laranja para itens pendentes
- **Error**: Vermelho para ações destrutivas

### Tipografia
- **Fonte**: Inter (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700

## 🛡️ Sistema de Error Handling

### Componentes Principais

#### LoggingService
- 4 níveis de log (DEBUG, INFO, WARN, ERROR)
- Armazenamento local para desenvolvimento
- Preparado para integração com serviços externos
- Export de logs para análise

#### ToastService
- 4 tipos de notificação (success, error, warning, info)
- Auto-dismiss configurável
- Notificações persistentes para erros críticos
- Fila de mensagens

#### ErrorInterceptor
- Tratamento automático de erros HTTP
- Categorização inteligente de erros
- Logging automático
- Notificações contextuais

#### Fallback UI
- Telas de erro graceful
- Botões de retry
- Mensagens amigáveis em português

### Como Monitorar

```typescript
// Visualizar logs no console
const loggingService = // inject service
console.table(loggingService.getLogs(LogLevel.ERROR));
console.log(loggingService.getLogStats());

// Exportar logs
const logs = loggingService.exportLogs();
```

## 🔮 Próximos Passos (Roadmap)

### Funcionalidades Futuras
- [ ] **PWA** - Transformar em Progressive Web App
- [ ] **Categorias** - Organizar itens por categorias
- [ ] **Múltiplas Listas** - Criar várias listas
- [ ] **Compartilhamento** - Compartilhar listas com outros usuários
- [ ] **Sincronização** - Backend real com sincronização
- [ ] **Notificações** - Lembretes e notificações push
- [ ] **Modo Offline** - Funcionalidade offline completa
- [ ] **Temas** - Modo escuro e temas personalizáveis

### Melhorias Técnicas
- [ ] **Testes Unitários** - Cobertura completa de testes
- [ ] **Testes E2E** - Testes de integração
- [ ] **Internacionalização** - Suporte a múltiplos idiomas
- [ ] **Acessibilidade** - Melhorias de a11y
- [ ] **Performance** - Otimizações avançadas

### Sistema de Monitoramento
- [ ] **Integração Sentry** - Monitoramento de erros em produção
- [ ] **Firebase Crashlytics** - Relatórios de crash
- [ ] **Analytics** - Métricas de uso e performance
- [ ] **Health Checks** - Monitoramento de saúde da aplicação

## 📚 Documentação Técnica

- **[Sistema de Error Handling](docs/error-handling-system.md)** - Documentação completa do sistema de tratamento de erros
- **Padrões de Código** - Convenções e best practices utilizadas
- **Guia de Contribuição** - Como contribuir para o projeto

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvedor

Desenvolvido seguindo as melhores práticas de Angular moderno e arquitetura enterprise, com foco em:

- ✅ **Qualidade de Código** - Clean Code, SOLID, DRY
- ✅ **Arquitetura Escalável** - Feature modules, lazy loading
- ✅ **UX/UI Moderno** - Design responsivo, acessível
- ✅ **Robustez** - Error handling, logging, fallbacks
- ✅ **Manutenibilidade** - Documentação, padrões, estrutura clara

---

**Vai na Lista** - Sua lista de compras inteligente com sistema robusto de monitoramento! 🛒✨🛡️
