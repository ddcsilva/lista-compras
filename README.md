# 🛒 **Vai na Lista** - Lista de Compras Inteligente

Uma aplicação moderna de lista de compras desenvolvida com **Angular 18**, **Firebase Firestore**, **TailwindCSS** e otimizada para **PWA**.

## 🚀 **Características Principais**

### ✨ **Funcionalidades**
- ✅ **Autenticação Firebase** - Login com Google ou email/senha
- ✅ **Firestore Database** - Persistência em tempo real na nuvem
- ✅ **Sincronização Offline** - Funciona sem internet com backup local
- ✅ **Interface Responsiva** - Design moderno com TailwindCSS
- ✅ **PWA Ready** - Instalável como app nativo
- ✅ **Real-time Updates** - Sincronização automática entre dispositivos

### 🏗️ **Arquitetura Enterprise**
- 🎯 **Angular 18 Standalone** - Componentes independentes
- 🔥 **Firebase Integration** - Auth + Firestore + Hosting
- ⚡ **Performance Optimized** - Signals, OnPush, Lazy Loading
- 🛡️ **Type Safety** - TypeScript strict mode
- 📱 **Mobile First** - Design responsivo
- 🔧 **Code Quality** - ESLint + Prettier + Git Hooks

---

## 🛠️ **Tecnologias Utilizadas**

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| **Frontend** | Angular | 18.x |
| **Styling** | TailwindCSS | 3.4.x |
| **Backend** | Firebase Firestore | 10.x |
| **Auth** | Firebase Auth | 10.x |
| **Language** | TypeScript | 5.4.x |
| **Build** | Angular CLI | 18.x |
| **Linting** | ESLint | 9.x |
| **Formatting** | Prettier | 3.x |

---

## 📦 **Instalação e Configuração**

### **1. Pré-requisitos**
```bash
node >= 18.x
npm >= 9.x
Angular CLI >= 18.x
```

### **2. Clone e Instale**
```bash
git clone <repository-url>
cd lista-compras
npm install
```

### **3. Configuração do Firebase**

#### **3.1. Criar Projeto Firebase**
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative **Authentication** (Google + Email/Password)
4. Ative **Firestore Database**
5. Configure regras de segurança do Firestore

#### **3.2. Configurar Environment**
```bash
# Copie o arquivo de exemplo
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.prod.ts
```

#### **3.3. Adicionar Configuração Firebase**
Edite `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "sua-api-key",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "sua-app-id"
  }
};
```

### **4. Regras do Firestore**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Itens da lista - apenas o usuário autenticado
    match /itens/{document} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.usuarioId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.usuarioId;
    }
  }
}
```

---

## 🚀 **Scripts Disponíveis**

### **Desenvolvimento**
```bash
npm start                 # Servidor de desenvolvimento
npm run build            # Build de produção
npm run watch            # Build contínuo
```

### **Qualidade de Código**
```bash
npm run lint             # Executar ESLint
npm run lint:fix         # Corrigir problemas ESLint
npm run format           # Formatar código com Prettier
npm run format:check     # Verificar formatação
npm run code:check       # Lint + Format check
npm run code:fix         # Lint fix + Format
```

### **Testes**
```bash
npm test                 # Executar testes unitários
npm run test:coverage    # Testes com coverage
```

---

## 🏗️ **Estrutura do Projeto**

```
src/
├── app/
│   ├── core/                    # Serviços principais
│   │   ├── config/             # Configurações (Firebase)
│   │   ├── guards/             # Route guards
│   │   ├── interceptors/       # HTTP interceptors
│   │   └── services/           # Serviços globais
│   ├── features/               # Módulos de funcionalidades
│   │   ├── autenticacao/       # Login/Cadastro
│   │   └── lista/              # Lista de compras
│   ├── shared/                 # Componentes compartilhados
│   │   ├── components/         # Componentes reutilizáveis
│   │   └── models/             # Interfaces/Types
│   └── environments/           # Configurações de ambiente
```

---

## 🔥 **Firebase Firestore Integration**

### **Arquitetura de Dados**
```typescript
// Coleção: itens
interface ItemLista {
  id?: string;
  descricao: string;
  quantidade: number;
  concluido: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  usuarioId: string;  // Isolamento por usuário
}
```

### **Funcionalidades Implementadas**
- ✅ **CRUD Completo** - Create, Read, Update, Delete
- ✅ **Real-time Sync** - onSnapshot listeners
- ✅ **Offline Support** - Cache local + sincronização
- ✅ **User Isolation** - Dados isolados por usuário
- ✅ **Error Handling** - Tratamento robusto de erros
- ✅ **Performance** - Queries otimizadas

### **Estratégia Offline-First**
1. **Online**: Dados salvos no Firestore + cache local
2. **Offline**: Dados salvos no localStorage
3. **Reconexão**: Sincronização automática

---

## 🛡️ **Autenticação Firebase**

### **Métodos Suportados**
- 🔐 **Email/Password** - Cadastro tradicional
- 🌐 **Google OAuth** - Login social
- 🔄 **Auto-login** - Persistência de sessão
- 🚪 **Logout** - Limpeza segura

### **Fluxo de Autenticação**
```typescript
// Login com email/senha
await authService.loginEmailSenha({ email, senha });

// Login com Google
await authService.loginGoogle();

// Cadastro
await authService.cadastrar({ nome, email, senha });

// Logout
await authService.logout();
```

### **Guards de Rota**
- `authGuard` - Protege rotas autenticadas
- `publicGuard` - Redireciona usuários logados

---

## 📱 **PWA Features**

### **Características**
- 📱 **Instalável** - Add to Home Screen
- 🔄 **Service Worker** - Cache inteligente
- 📶 **Offline Mode** - Funciona sem internet
- 🔔 **Push Notifications** - (Futuro)
- 📊 **Analytics** - (Futuro)

### **Configuração PWA**
```bash
ng add @angular/pwa
```

---

## 🎨 **Design System**

### **TailwindCSS**
- 🎨 **Design Tokens** - Cores, espaçamentos, tipografia
- 📱 **Responsive** - Mobile-first approach
- 🌙 **Dark Mode** - (Futuro)
- ♿ **Accessibility** - WCAG 2.1 AA

### **Componentes**
- `LoadingComponent` - Estados de carregamento
- `ToastComponent` - Notificações
- `FormComponents` - Formulários reutilizáveis

---

## 🔧 **Qualidade de Código**

### **ESLint Configuration**
```javascript
// Regras principais
"@typescript-eslint/no-explicit-any": "warn",
"@typescript-eslint/no-unused-vars": "error",
"@angular-eslint/prefer-on-push-component-change-detection": "warn",
"no-console": "warn",
"prefer-const": "error"
```

### **Prettier Configuration**
```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### **Git Hooks** (Futuro)
- `pre-commit` - Lint + Format
- `pre-push` - Tests + Build

---

## 📊 **Performance**

### **Otimizações Implementadas**
- ⚡ **Signals** - Reatividade otimizada
- 🔄 **OnPush** - Change detection otimizada
- 📦 **Lazy Loading** - Carregamento sob demanda
- 🗜️ **Tree Shaking** - Bundle otimizado
- 💾 **Caching** - Service Worker + localStorage

### **Bundle Analysis**
```bash
# Desenvolvimento
Main Bundle: ~2.33 MB
Firebase Chunk: ~209 kB
Lista Component: ~49 kB
Auth Components: ~46 kB

# Produção (estimado)
Main Bundle: ~400 kB (gzipped)
Firebase Chunk: ~50 kB (gzipped)
```

---

## 🚀 **Deploy**

### **Firebase Hosting**
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar
firebase init hosting

# Deploy
npm run build:prod
firebase deploy
```

### **Outras Opções**
- **Vercel** - Deploy automático via Git
- **Netlify** - Deploy contínuo
- **GitHub Pages** - Deploy gratuito

---

## 🧪 **Testes**

### **Estratégia de Testes**
- 🧪 **Unit Tests** - Jasmine + Karma
- 🔗 **Integration Tests** - Angular Testing Library
- 🌐 **E2E Tests** - Cypress (Futuro)

### **Coverage Goals**
- Services: 90%+
- Components: 80%+
- Guards: 100%

---

## 🔮 **Roadmap**

### **Próximas Features**
- [ ] 🌙 **Dark Mode** - Tema escuro
- [ ] 🔔 **Push Notifications** - Lembretes
- [ ] 📊 **Analytics** - Métricas de uso
- [ ] 🏷️ **Categorias** - Organização por categoria
- [ ] 📷 **Fotos** - Anexar imagens aos itens
- [ ] 🤝 **Compartilhamento** - Listas colaborativas
- [ ] 📱 **App Mobile** - Ionic/Capacitor
- [ ] 🎯 **Gamificação** - Pontos e conquistas

### **Melhorias Técnicas**
- [ ] 🧪 **Testes E2E** - Cypress
- [ ] 📊 **Monitoring** - Sentry
- [ ] 🔄 **CI/CD** - GitHub Actions
- [ ] 📈 **Performance Budget** - Lighthouse CI
- [ ] 🔒 **Security Headers** - CSP, HSTS
- [ ] 🌍 **i18n** - Internacionalização

---

## 🤝 **Contribuição**

### **Como Contribuir**
1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### **Padrões de Commit**
```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
style: formatação
refactor: refatoração
test: testes
chore: manutenção
```

---

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 **Autor**

Desenvolvido com ❤️ usando Angular 18 + Firebase

---

## 📞 **Suporte**

- 📧 **Email**: [seu-email@exemplo.com]
- 🐛 **Issues**: [GitHub Issues](link-para-issues)
- 📖 **Docs**: [Documentação](link-para-docs)

---

**⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!**
