# Vai na Lista 🛒

Uma aplicação Progressive Web App (PWA) moderna para gerenciamento de listas de compras, construída com Angular 18 e Firebase.

## ✨ Funcionalidades

- 📱 **Progressive Web App (PWA)** - Funciona offline e pode ser instalada no dispositivo
- 🔐 **Autenticação Firebase** - Login seguro com email/senha
- 📝 **Gerenciamento de Listas** - Crie, edite e organize suas listas de compras
- ☑️ **Controle de Itens** - Marque itens como comprados
- 📱 **Design Responsivo** - Interface otimizada para mobile e desktop
- 🔄 **Sincronização em Tempo Real** - Dados sincronizados automaticamente

## 🚀 Tecnologias

- **Angular 18** - Framework frontend
- **Firebase** - Backend, autenticação e banco de dados
- **Tailwind CSS** - Estilização moderna
- **TypeScript** - Linguagem de programação
- **PWA** - Service Workers para funcionalidades offline

## 🏗️ Estrutura do Projeto

```bash
src/
├── app/
│   ├── core/                # Serviços e configurações globais
│   │   ├── guards/          # Guards de rota
│   │   ├── services/        # Serviços (auth, storage, etc.)
│   │   └── config/          # Configurações Firebase
│   ├── features/            # Módulos de funcionalidades
│   │   ├── autenticacao/    # Login e cadastro
│   │   └── lista/           # Gerenciamento de listas
│   ├── shared/              # Componentes compartilhados
│   │   ├── components/      # Componentes reutilizáveis
│   │   └── models/          # Modelos de dados
│   └── environments/        # Configurações de ambiente
```

## 🛠️ Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Angular CLI 18
- Conta Firebase

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/ddcsilva/vai-na-lista.git
cd vai-na-lista
```

2.Instale as dependências:

```bash
npm install
```

3.Configure o Firebase:

- Crie um projeto no [Firebase Console](https://console.firebase.google.com)
  - Configure Authentication (Email/Password)
  - Configure Firestore Database
  - Copie as configurações para `src/environments/environment.ts`

4.Execute o projeto:

```bash
npm start
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm start                    # Servidor de desenvolvimento
npm run build               # Build de desenvolvimento
npm run build:prod         # Build de produção

# Qualidade de Código
npm run lint                # Verificar ESLint
npm run lint:fix           # Corrigir problemas ESLint
npm run format             # Formatar código com Prettier
npm run format:check       # Verificar formatação

# Testes
npm run test               # Executar testes
npm run test:ci           # Testes para CI/CD

# Deployment
npm run deploy            # Deploy para Firebase Hosting
npm run firebase:serve    # Testar build localmente
```

## 🚀 Deploy

O projeto está configurado com CI/CD automático via GitHub Actions.

### Deploy Automático

1. Configure o secret `FIREBASE_SERVICE_ACCOUNT_KEY` no GitHub
2. Faça push para a branch `main`
3. O GitHub Actions fará o deploy automaticamente

### Deploy Manual

```bash
# Build e deploy
npm run deploy

# Ou apenas hosting
npm run deploy:hosting
```

## 🌐 Demo

**Produção:** <https://vai-na-lista-f9551.web.app>

## 📋 Status do Projeto

- ✅ Estrutura base Angular 18
- ✅ Configuração Firebase
- ✅ Autenticação de usuários
- ✅ PWA configurado
- ✅ CI/CD com GitHub Actions
- ✅ Deploy automático
- 🔄 Desenvolvimento de funcionalidades

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

### Danilo Silva

- GitHub: [@ddcsilva](https://github.com/ddcsilva)
- LinkedIn: [Danilo Silva](https://linkedin.com/in/ddcsilva)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!
