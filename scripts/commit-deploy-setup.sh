#!/bin/bash

echo "🚀 Preparando commit das configurações de CI/CD..."

# Verificar se estamos em um repositório git
if [ ! -d ".git" ]; then
    echo "❌ Erro: Este não é um repositório Git"
    echo "Execute: git init"
    exit 1
fi

# Verificar se há mudanças para commitar
if git diff --quiet && git diff --staged --quiet; then
    echo "✅ Nenhuma mudança encontrada para commit"
else
    echo "📝 Mudanças encontradas. Preparando commit..."

    # Adicionar arquivos de configuração
    git add .github/workflows/ci-cd.yml
    git add firebase.json
    git add package.json
    git add DEPLOY.md
    git add scripts/
    git add angular.json

    # Mostrar status
    echo ""
    echo "📋 Arquivos que serão commitados:"
    git status --porcelain

    echo ""
    echo "💡 IMPORTANTE antes do commit:"
    echo "1. ✅ Configure o secret FIREBASE_SERVICE_ACCOUNT_KEY no GitHub"
    echo "2. ✅ Verifique se o projeto Firebase está ativo"
    echo "3. ✅ Teste o build local: npm run build:prod"
    echo ""

    read -p "🤔 Deseja continuar com o commit? (y/N): " confirm

    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        # Fazer commit
        git commit -m "🚀 feat: Configure CI/CD com GitHub Actions e Firebase Hosting

- Otimiza workflow de CI/CD para Angular 18
- Configura Firebase Hosting com cache strategies
- Adiciona scripts úteis para desenvolvimento
- Configura budgets realistas para build
- Adiciona documentação completa de deploy
- Inclui script de verificação de configuração

Deploy automático: push para main → produção
Preview deploys: pull requests → staging"

        echo ""
        echo "✅ Commit realizado com sucesso!"
        echo ""
        echo "🎯 PRÓXIMOS PASSOS:"
        echo "1. Configure o secret no GitHub:"
        echo "   - Vá para Settings → Secrets and variables → Actions"
        echo "   - Adicione FIREBASE_SERVICE_ACCOUNT_KEY"
        echo "   - Cole o JSON da service account do Firebase"
        echo ""
        echo "2. Faça push para main:"
        echo "   git push origin main"
        echo ""
        echo "3. Monitore o deploy:"
        echo "   - GitHub Actions: repositório → Actions tab"
        echo "   - Firebase Console: projeto → Hosting"
        echo ""
        echo "4. Acesse sua aplicação:"
        echo "   https://vai-na-lista-f9551.web.app"

    else
        echo "❌ Commit cancelado pelo usuário"
        exit 1
    fi
fi

echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "npm run check-setup    # Verificar configuração"
echo "npm run build:prod     # Testar build local"
echo "npm run ci            # Simular pipeline CI"
echo "npm run deploy        # Deploy manual"
