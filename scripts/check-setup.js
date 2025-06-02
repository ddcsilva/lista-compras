#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuração do projeto...\n');

const checks = [];

// Verificar arquivos essenciais
const requiredFiles = [
  { file: 'package.json', desc: 'Configuração do projeto' },
  { file: 'angular.json', desc: 'Configuração do Angular' },
  { file: 'firebase.json', desc: 'Configuração do Firebase' },
  { file: '.firebaserc', desc: 'Projeto Firebase' },
  { file: '.github/workflows/ci-cd.yml', desc: 'Workflow CI/CD' },
  { file: 'src/index.html', desc: 'Arquivo principal HTML' },
];

requiredFiles.forEach(({ file, desc }) => {
  const exists = fs.existsSync(file);
  checks.push({
    name: desc,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? `✅ ${file}` : `❌ ${file} não encontrado`,
  });
});

// Verificar package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Scripts necessários
  const requiredScripts = ['build:prod', 'test:ci', 'lint', 'format:check'];
  const hasAllScripts = requiredScripts.every(script => packageJson.scripts[script]);

  checks.push({
    name: 'Scripts necessários',
    status: hasAllScripts ? 'PASS' : 'FAIL',
    details: hasAllScripts ? '✅ Todos os scripts estão configurados' : '❌ Scripts ausentes',
  });

  // Dependências do Firebase
  const hasFirebase = packageJson.dependencies?.firebase || packageJson.devDependencies?.firebase;
  checks.push({
    name: 'Firebase SDK',
    status: hasFirebase ? 'PASS' : 'WARN',
    details: hasFirebase ? '✅ Firebase instalado' : '⚠️ Firebase não encontrado nas dependências',
  });
} catch (error) {
  checks.push({
    name: 'package.json válido',
    status: 'FAIL',
    details: '❌ Erro ao ler package.json',
  });
}

// Verificar configuração do Firebase
try {
  const firebaseConfig = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
  const firebaseRc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));

  const hasHosting = firebaseConfig.hosting;
  const hasProject = firebaseRc.projects?.default;

  checks.push({
    name: 'Configuração Firebase Hosting',
    status: hasHosting ? 'PASS' : 'FAIL',
    details: hasHosting ? '✅ Hosting configurado' : '❌ Hosting não configurado',
  });

  checks.push({
    name: 'Projeto Firebase',
    status: hasProject ? 'PASS' : 'FAIL',
    details: hasProject ? `✅ Projeto: ${hasProject}` : '❌ Projeto não configurado',
  });
} catch (error) {
  checks.push({
    name: 'Configuração Firebase',
    status: 'FAIL',
    details: '❌ Erro ao ler configuração do Firebase',
  });
}

// Verificar estrutura de build
const distExists = fs.existsSync('dist');
checks.push({
  name: 'Diretório de build',
  status: distExists ? 'INFO' : 'INFO',
  details: distExists ? '📁 dist/ existe (build anterior)' : '📁 dist/ será criado no build',
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

console.log('\n' + '='.repeat(50));
console.log(`📊 RESUMO: ${passed} passou | ${failed} falhou | ${warnings} avisos`);

if (failed > 0) {
  console.log('\n❌ AÇÃO NECESSÁRIA:');
  console.log('- Corrija os itens que falharam antes de fazer deploy');
  console.log('- Consulte o arquivo DEPLOY.md para instruções');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️ AVISOS:');
  console.log('- Alguns itens precisam de atenção');
  console.log('- O deploy pode funcionar, mas verifique os avisos');
} else {
  console.log('\n🎉 CONFIGURAÇÃO OK!');
  console.log('- Todos os arquivos necessários estão presentes');
  console.log('- Pronto para deploy!');
}

console.log('\n📚 PRÓXIMOS PASSOS:');
console.log('1. Configure o secret FIREBASE_SERVICE_ACCOUNT_KEY no GitHub');
console.log('2. Faça commit das mudanças');
console.log('3. Push para a branch main para ativar o deploy');
console.log('4. Acesse: https://vai-na-lista-f9551.web.app');

console.log('\n🔧 COMANDOS ÚTEIS:');
console.log('npm run build:prod  # Testar build local');
console.log('npm run ci          # Simular pipeline CI');
console.log('npm run deploy      # Deploy manual');
