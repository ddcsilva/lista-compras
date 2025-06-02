# 🚀 Guia de Deploy - Vai na Lista

Este projeto está configurado com CI/CD automático usando GitHub Actions e Firebase Hosting.

## 📋 Pré-requisitos

### 1. Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Configurar Secrets no GitHub

Você precisa configurar os seguintes secrets no seu repositório GitHub:

#### Como adicionar secrets:
1. Vá para seu repositório no GitHub
2. Settings → Secrets and variables → Actions
3. Adicione os seguintes secrets:

#### `FIREBASE_SERVICE_ACCOUNT_KEY`
```bash
# 1. Gere a chave de serviço do Firebase
firebase login
firebase projects:list

# 2. Vá para Firebase Console → Project Settings → Service Accounts
# 3. Clique em "Generate new private key"
# 4. Baixe o arquivo JSON
# 5. Copie todo o conteúdo do arquivo e cole como secret no GitHub
```

## 🔄 Fluxo de CI/CD

### Push para `main` branch:
1. ✅ Verifica código (lint + format)
2. 🧪 Executa testes
3. 🏗️ Build da aplicação
4. 🚀 Deploy automático para produção

### Pull Requests:
1. ✅ Verifica código (lint + format)
2. 🧪 Executa testes
3. 🏗️ Build da aplicação
4. 🔗 Deploy para preview channel (temporary)

## 📦 Scripts Disponíveis

### Desenvolvimento
```bash
npm start                    # Servidor de desenvolvimento
npm run build               # Build para desenvolvimento
npm run build:prod         # Build para produção
npm run build:analyze      # Analisa o bundle size
npm test                    # Executa testes
npm run lint               # Verifica código
npm run format             # Formata código
```

### Deploy Manual
```bash
npm run deploy             # Build + Deploy completo
npm run deploy:hosting     # Deploy apenas hosting
npm run deploy:preview     # Deploy para preview
npm run firebase:serve     # Testa localmente
```

### Qualidade de Código
```bash
npm run code:check         # Verifica lint + format
npm run code:fix          # Corrige lint + format
npm run ci                # Simula pipeline CI
```

## 🌐 URLs do Projeto

- **Produção**: https://vai-na-lista-f9551.web.app
- **Console Firebase**: https://console.firebase.google.com/project/vai-na-lista-f9551

## 🔧 Configuração Local

### Primeira vez:
```bash
# 1. Clone o repositório
git clone <seu-repo>
cd lista-compras

# 2. Instale dependências
npm install

# 3. Configure Firebase
firebase login
firebase use vai-na-lista-f9551

# 4. Teste localmente
npm start
```

### Deploy manual (se necessário):
```bash
# 1. Build da aplicação
npm run build:prod

# 2. Deploy para Firebase
firebase deploy --only hosting
```

## 🔍 Troubleshooting

### Problema: "Firebase Service Account not found"
**Solução**: Configurar o secret `FIREBASE_SERVICE_ACCOUNT_KEY` no GitHub

### Problema: "Build failed"
**Solução**: Verificar se todos os testes passam localmente
```bash
npm run ci
```

### Problema: "Deploy failed"
**Solução**: Verificar se o Firebase project ID está correto
```bash
firebase projects:list
firebase use vai-na-lista-f9551
```

## 📊 Monitoramento

### GitHub Actions
- Veja o status dos builds em: `Actions` tab no GitHub
- Logs detalhados de cada step do pipeline

### Firebase Console
- Performance da aplicação
- Analytics de usuários
- Logs de hosting

## 🎯 Próximos Passos

1. **Configure os secrets** no GitHub (mais importante!)
2. **Faça um commit** para testar o pipeline
3. **Verifique o deploy** na URL de produção
4. **Configure environments** no GitHub para aprovações manuais (opcional)

## 📝 Notas Importantes

- O pipeline só faz deploy automático na branch `main`
- Pull requests geram preview deployments temporários
- Cache do npm é otimizado para builds mais rápidos
- Service Worker é configurado automaticamente
- Headers de segurança estão configurados no Firebase

---

## 🆘 Precisa de Ajuda?

Se algo não estiver funcionando:
1. Verifique os logs no GitHub Actions
2. Confirme se os secrets estão configurados
3. Teste localmente com `npm run ci`
4. Verifique se o Firebase project está ativo
