import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

/**
 * Configuração de rotas principais da aplicação
 * Implementa lazy loading e proteção com guards
 */
export const routes: Routes = [
  // Rota padrão - redireciona para lista se autenticado, senão para login
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },

  // Rota de login - acessível apenas para usuários não autenticados
  {
    path: 'login',
    loadComponent: () => import('./features/autenticacao/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard],
  },

  // Rota da lista - protegida por autenticação
  {
    path: 'lista',
    loadComponent: () => import('./features/lista/lista/lista.component').then(m => m.ListaComponent),
    canActivate: [authGuard],
  },

  // Rota curinga - redireciona para login
  {
    path: '**',
    redirectTo: '/login',
  },
];
