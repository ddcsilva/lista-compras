import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoggingService } from '../services/logging.service';

/**
 * Guard que protege rotas autenticadas
 * Aguarda carregamento do Firebase e redireciona para login se necessário
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se o usuário está autenticado usando o computed signal
  if (authService.isAutenticado()) {
    return true;
  }

  // Redireciona para login se não autenticado
  router.navigate(['/login']);
  return false;
};

/**
 * Guard que protege rotas públicas (como login e cadastro)
 * Redireciona para lista se usuário já estiver autenticado
 */
export const publicGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const loggingService = inject(LoggingService);

  // Aguarda o Firebase terminar de carregar
  if (authService.isCarregando()) {
    loggingService.debug('PublicGuard: Waiting for Firebase to load...');

    // Aguarda até que não esteja mais carregando
    await new Promise<void>(resolve => {
      const checkLoading = () => {
        if (!authService.isCarregando()) {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  const isAuthenticated = authService.isAutenticado();

  loggingService.debug('PublicGuard check', {
    route: state.url,
    isAuthenticated: isAuthenticated,
    user: authService.usuario()?.email,
  });

  if (!isAuthenticated) {
    return true;
  } else {
    loggingService.info('PublicGuard: Redirecting to lista', {
      requestedRoute: state.url,
      user: authService.usuario()?.email,
    });
    router.navigate(['/lista']);
    return false;
  }
};
