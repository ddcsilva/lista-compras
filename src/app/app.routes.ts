import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

/**
 * Configuração de rotas da aplicação
 * Implementa lazy loading para otimização de performance
 * Guards de autenticação para proteger rotas
 * Preloading automático para navegação instantânea
 * ADICIONADA: Rota temporária para teste de email (Pacote 1)
 */
export const routes: Routes = [
  // Rota raiz - redireciona baseado no estado de autenticação
  {
    path: '',
    redirectTo: '/lista',
    pathMatch: 'full',
  },

  // Rota de login (pública)
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/autenticacao/login/login.component').then(m => m.LoginComponent),
    title: 'Login - Vai na Lista',
  },

  // Rota de cadastro (pública)
  {
    path: 'cadastro',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/autenticacao/cadastro/cadastro.component').then(m => m.CadastroComponent),
    title: 'Cadastro - Vai na Lista',
  },

  // Rota da lista (protegida)
  {
    path: 'lista',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lista/lista/lista.component').then(m => m.ListaComponent),
    title: 'Minha Lista - Vai na Lista',
  },

  // 🧪 NOVA: Rota temporária para teste de email (REMOVER após validação)
  {
    path: 'teste-email',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/compartilhamento/teste-email/teste-email.component').then(m => m.TesteEmailComponent),
    title: 'Teste de Email - Vai na Lista',
  },

  // Rota de fallback - página não encontrada
  {
    path: '**',
    redirectTo: '/lista',
  },
];

/*
INSTRUÇÕES PARA TESTE:

1. Acesse: http://localhost:4200/teste-email
2. Faça login primeiro se necessário
3. Digite emails de usuários existentes no Firebase Auth
4. Observe a validação em tempo real
5. Verifique os logs no console do navegador
6. Teste o cache digitando emails repetidos

REMOVER ESTA ROTA após confirmar que funciona!
*/
