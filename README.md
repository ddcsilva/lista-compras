# 🛒 Vai na Lista

Uma aplicação moderna de lista de compras desenvolvida com Angular 18, seguindo as melhores práticas de arquitetura enterprise.

## 🎯 Sobre o Projeto

O **Vai na Lista** é um MVP de aplicativo para gerenciar listas de compras de forma simples e eficiente. Desenvolvido com foco em escalabilidade, organização e boas práticas de desenvolvimento.

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

## 🛠 Tecnologias Utilizadas

- **Angular 18** - Framework principal
- **Standalone Components** - Arquitetura moderna sem NgModules
- **TailwindCSS** - Framework de CSS utilitário
- **TypeScript** - Linguagem de programação
- **Signals** - Gerenciamento de estado reativo
- **Reactive Forms** - Formulários reativos com validação
- **Router Guards** - Proteção de rotas

## 🏗 Arquitetura

O projeto segue a **arquitetura enterprise** recomendada por Tomas Trajan:

```
src/app/
├── core/                    # Serviços singleton e funcionalidades core
│   ├── guards/             # Guards de rota
│   └── services/           # Serviços principais (auth, storage)
├── shared/                 # Componentes, pipes e utilitários compartilhados
│   ├── components/         # Componentes reutilizáveis
│   └── models/            # Interfaces e tipos
├── features/              # Módulos de funcionalidades
│   ├── autenticacao/      # Feature de login
│   └── lista/             # Feature de lista de compras
└── app.routes.ts          # Configuração de rotas com lazy loading
```

### 🎨 Padrões Implementados

- **SOLID Principles** - Código bem estruturado e extensível
- **Clean Code** - Código limpo e legível
- **Repository Pattern** - Abstração do localStorage
- **Dependency Injection** - Injeção de dependências do Angular
- **Reactive Programming** - Uso de Signals para reatividade
- **Lazy Loading** - Carregamento sob demanda de componentes

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

1. **Acesse a tela de login**
   - Use qualquer email válido (ex: `usuario@teste.com`)
   - Use qualquer senha com 3+ caracteres (ex: `123`)
   - Ou clique em "Preencher com dados de exemplo"

2. **Gerencie sua lista**
   - Adicione itens com descrição e quantidade
   - Marque itens como concluídos
   - Edite itens existentes
   - Use os filtros e ações de limpeza

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

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvedor

Desenvolvido seguindo as melhores práticas de Angular moderno e arquitetura enterprise.

---

**Vai na Lista** - Sua lista de compras inteligente! 🛒✨
