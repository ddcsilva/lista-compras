#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Verificando configuração para deploy...\n');

const checks = [];

// Verificar arquivos essenciais para CI/CD
const requiredFiles = [
  { file: '.github/workflows/ci-cd.yml', desc: 'Workflow CI/CD' },
  { file: 'firebase.json', desc: 'Configuração Firebase' },
  { file: '.firebaserc', desc: 'Projeto Firebase' },
  { file: 'package.json', desc: 'Configuração NPM' },
];

requiredFiles.forEach(({ file, desc }) => {
  const exists = fs.existsSync(file);
  checks.push({
    name: desc,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? `✅ ${file}` : `❌ ${file} não encontrado`,
  });
});

// Verificar se environment está no .gitignore
try {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const hasEnvironment = gitignore.includes('/src/environments/environment.ts');

  checks.push({
    name: 'Environment protegido',
    status: hasEnvironment ? 'PASS' : 'WARN',
    details: hasEnvironment
      ? '✅ environment.ts está no .gitignore'
      : '⚠️ Adicione /src/environments/environment.ts ao .gitignore',
  });
} catch (error) {
  checks.push({
    name: 'Verificação .gitignore',
    status: 'FAIL',
    details: '❌ Erro ao ler .gitignore',
  });
}

// Verificar package.json scripts
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  const requiredScripts = ['build:prod', 'test:ci', 'lint', 'format:check'];
  const hasAllScripts = requiredScripts.every(script => packageJson.scripts[script]);

  checks.push({
    name: 'Scripts de CI/CD',
    status: hasAllScripts ? 'PASS' : 'FAIL',
    details: hasAllScripts
      ? '✅ Todos os scripts necessários estão configurados'
      : '❌ Scripts ausentes no package.json',
  });
} catch (error) {
  checks.push({
    name: 'Verificação package.json',
    status: 'FAIL',
    details: '❌ Erro ao ler package.json',
  });
}

// Verificar configuração Firebase
try {
  const firebaseRc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
  const projectId = firebaseRc.projects?.default;

  checks.push({
    name: 'Projeto Firebase',
    status: projectId === 'vai-na-lista-f9551' ? 'PASS' : 'FAIL',
    details:
      projectId === 'vai-na-lista-f9551'
        ? '✅ Projeto correto: vai-na-lista-f9551'
        : `❌ Projeto incorreto: ${projectId}`,
  });
} catch (error) {
  checks.push({
    name: 'Configuração Firebase',
    status: 'FAIL',
    details: '❌ Erro ao ler .firebaserc',
  });
}

// Verificar se tem environment example
const hasEnvExample = fs.existsSync('src/environments/environment.example.ts');
checks.push({
  name: 'Environment example',
  status: hasEnvExample ? 'PASS' : 'INFO',
  details: hasEnvExample
    ? '✅ environment.example.ts encontrado'
    : 'ℹ️ Considere criar environment.example.ts como template',
});

// Exibir resultados
console.log('📊 RESULTADOS DA VERIFICAÇÃO:\n');

const passed = checks.filter(c => c.status === 'PASS').length;
const failed = checks.filter(c => c.status === 'FAIL').length;
const warnings = checks.filter(c => c.status === 'WARN').length;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : check.status === 'WARN' ? '⚠️' : 'ℹ️';

  console.log(`${icon} ${check.name}: ${check.details}`);
});

console.log('\n' + '='.repeat(60));
console.log(`📊 RESUMO: ${passed} passou | ${failed} falhou | ${warnings} avisos`);

// Verificação de secrets necessários
console.log('\n🔐 SECRETS NECESSÁRIOS NO GITHUB:');
console.log('📋 Vá para: Settings → Secrets and variables → Actions');
console.log('');
console.log('1️⃣ FIREBASE_SERVICE_ACCOUNT_KEY');
console.log('   → Conteúdo do arquivo JSON da service account');
console.log('');
console.log('2️⃣ FIREBASE_CONFIG');
console.log('   → Configuração do Firebase (sem credenciais)');

console.log('\n🎯 PRÓXIMOS PASSOS:');

if (failed > 0) {
  console.log('❌ CORRIJA OS ERROS ANTES DE CONTINUAR:');
  console.log('   → Resolva os itens que falharam');
  console.log('   → Execute novamente: npm run deploy:check');
  process.exit(1);
} else {
  console.log('✅ CONFIGURAÇÃO OK! Próximos passos:');
  console.log('');
  console.log('1. 🔐 Configure os secrets no GitHub');
  console.log('2. 📝 Faça commit das mudanças:');
  console.log('   git add .');
  console.log('   git commit -m "🚀 feat: Setup CI/CD pipeline with GitHub Actions"');
  console.log('3. 🚀 Push para main:');
  console.log('   git push origin main');
  console.log('4. 👀 Monitore o deploy:');
  console.log('   → GitHub: repositório → Actions tab');
  console.log('   → URL final: https://vai-na-lista-f9551.web.app');
}

console.log('\n📚 COMANDOS ÚTEIS:');
console.log('npm run build:prod    # Testar build local');
console.log('npm run ci           # Simular pipeline CI');
console.log('npm run deploy:check # Verificar configuração');

console.log('\n🔥 DICA PRO:');
console.log('Use "git push --force-with-lease origin main" para push mais seguro!');

process.exit(failed > 0 ? 1 : 0);
