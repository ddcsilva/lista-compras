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

  console.log('🛡️ authGuard executado:', {
    isCarregando: authService.isCarregando(),
    isAutenticado: authService.isAutenticado(),
    usuario: authService.usuario(),
    currentRoute: router.url,
  });

  // Se ainda está carregando, aguarda
  if (authService.isCarregando()) {
    console.log('⏳ Auth ainda carregando, aguardando...');

    return new Promise(resolve => {
      setTimeout(() => {
        console.log('🔄 Recheck após delay de carregamento:', {
          isCarregando: authService.isCarregando(),
          isAutenticado: authService.isAutenticado(),
        });

        if (authService.isAutenticado()) {
          console.log('✅ Usuário autenticado após delay de carregamento');
          resolve(true);
        } else {
          console.log('❌ Usuário não autenticado após carregamento, redirecionando para login');
          router.navigate(['/login']);
          resolve(false);
        }
      }, 100);
    });
  }

  // Se já autenticado, permite
  if (authService.isAutenticado()) {
    console.log('✅ Usuário autenticado, permitindo acesso');
    return true;
  }

  // Se não autenticado, aguarda um pouco mais para casos de login em andamento
  console.log('⏳ Usuário não autenticado, aguardando possível login em andamento...');

  return new Promise(resolve => {
    let tentativas = 0;
    const maxTentativas = 30; // 3 segundos (30 x 100ms)

    const checkAuth = () => {
      tentativas++;

      if (authService.isAutenticado()) {
        console.log('✅ Usuário autenticado durante aguardo, permitindo acesso');
        resolve(true);
        return;
      }

      if (tentativas >= maxTentativas) {
        console.log('❌ Timeout aguardando autenticação, redirecionando para login');
        router.navigate(['/login']);
        resolve(false);
        return;
      }

      setTimeout(checkAuth, 100);
    };

    checkAuth();
  });
};

/**
 * Guard para rotas públicas (login, cadastro)
 * Redireciona usuários autenticados para a lista
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const usuario = authService.usuario();

  if (usuario) {
    // Usuário já está logado, redireciona para lista
    router.navigate(['/lista']);
    return false;
  }

  return true;
};
