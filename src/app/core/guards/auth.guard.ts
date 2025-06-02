import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional que protege rotas autenticadas
 * Redireciona para login se o usuário não estiver autenticado
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAutenticado) {
    return true;
  }

  // Redireciona para login mantendo a URL de destino
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });

  return false;
};

/**
 * Guard que redireciona usuários autenticados para a lista
 * Usado na página de login para evitar acessos desnecessários
 */
export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAutenticado) {
    return true;
  }

  // Se já está logado, redireciona para a lista
  router.navigate(['/lista']);
  return false;
};
