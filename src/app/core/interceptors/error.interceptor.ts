import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { LoggingService } from '../services/logging.service';
import { ToastService } from '../services/toast.service';

/**
 * Interceptor funcional para tratamento global de erros HTTP
 * Registra erros no LoggingService e exibe notificações ao usuário
 * Categoriza erros por tipo e severidade
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const loggingService = inject(LoggingService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log detalhado do erro
      loggingService.logHttpError(error.status, error.statusText, error.url || req.url, req.method, error.error);

      // Determina se deve exibir notificação baseado no contexto
      const shouldShowToast = shouldShowNotification(req, error);

      if (shouldShowToast) {
        handleErrorNotification(error, toastService, loggingService);
      }

      // Re-lança o erro para que componentes possam tratar se necessário
      return throwError(() => error);
    })
  );
};

/**
 * Determina se uma notificação deve ser exibida baseado no contexto
 */
function shouldShowNotification(req: any, error: HttpErrorResponse): boolean {
  // Headers customizados para controlar notificações
  const silentError = req.headers.get('X-Silent-Error') === 'true';
  const skipNotification = req.headers.get('X-Skip-Notification') === 'true';

  if (silentError || skipNotification) {
    return false;
  }

  // URLs que devem ser tratadas silenciosamente
  const silentUrls = ['/health-check', '/ping', '/metrics'];

  const isSilentUrl = silentUrls.some(url => req.url.includes(url));
  if (isSilentUrl) {
    return false;
  }

  // Erros que normalmente não precisam de notificação visual
  const silentStatuses = [404]; // 404 pode ser tratado silenciosamente em alguns contextos

  // Para 404, só mostra notificação se for uma ação explícita do usuário
  if (error.status === 404 && req.method === 'GET') {
    return false;
  }

  return true;
}

/**
 * Trata a exibição de notificações baseado no tipo de erro
 */
function handleErrorNotification(
  error: HttpErrorResponse,
  toastService: ToastService,
  loggingService: LoggingService
): void {
  // Categoriza o erro
  const errorCategory = categorizeError(error);

  switch (errorCategory) {
    case 'network':
      handleNetworkError(toastService, loggingService);
      break;

    case 'authentication':
      handleAuthenticationError(error, toastService, loggingService);
      break;

    case 'authorization':
      handleAuthorizationError(toastService, loggingService);
      break;

    case 'validation':
      handleValidationError(error, toastService, loggingService);
      break;

    case 'server':
      handleServerError(error, toastService, loggingService);
      break;

    case 'client':
      handleClientError(error, toastService, loggingService);
      break;

    default:
      handleGenericError(error, toastService, loggingService);
  }
}

/**
 * Categoriza erros HTTP para tratamento específico
 */
function categorizeError(error: HttpErrorResponse): string {
  if (error.status === 0 || !navigator.onLine) {
    return 'network';
  }

  if (error.status === 401) {
    return 'authentication';
  }

  if (error.status === 403) {
    return 'authorization';
  }

  if (error.status >= 400 && error.status < 500) {
    return 'client';
  }

  if (error.status >= 500) {
    return 'server';
  }

  return 'unknown';
}

/**
 * Trata erros de rede/conectividade
 */
function handleNetworkError(toastService: ToastService, loggingService: LoggingService): void {
  loggingService.warn('Network error detected', {
    online: navigator.onLine,
    connection: (navigator as any).connection?.effectiveType,
  });

  toastService.showNetworkError();
}

/**
 * Trata erros de autenticação (401)
 */
function handleAuthenticationError(
  error: HttpErrorResponse,
  toastService: ToastService,
  loggingService: LoggingService
): void {
  loggingService.warn('Authentication error', {
    url: error.url,
    message: error.message,
  });

  toastService.error('Sua sessão expirou. Faça login novamente.', 'Sessão Expirada');

  // TODO: Redirecionar para login se necessário
  // const router = inject(Router);
  // router.navigate(['/login']);
}

/**
 * Trata erros de autorização (403)
 */
function handleAuthorizationError(toastService: ToastService, loggingService: LoggingService): void {
  loggingService.warn('Authorization error');

  toastService.error('Você não tem permissão para realizar esta ação.', 'Acesso Negado');
}

/**
 * Trata erros de validação (400, 422)
 */
function handleValidationError(
  error: HttpErrorResponse,
  toastService: ToastService,
  loggingService: LoggingService
): void {
  loggingService.info('Validation error', {
    status: error.status,
    errors: error.error,
  });

  // Tenta extrair mensagem específica do backend
  let message = 'Dados inválidos. Verifique os campos e tente novamente.';

  if (error.error?.message) {
    message = error.error.message;
  } else if (error.error?.errors && Array.isArray(error.error.errors)) {
    message = error.error.errors.join(', ');
  }

  toastService.error(message, 'Dados Inválidos');
}

/**
 * Trata erros do servidor (5xx)
 */
function handleServerError(error: HttpErrorResponse, toastService: ToastService, loggingService: LoggingService): void {
  loggingService.error('Server error', {
    status: error.status,
    statusText: error.statusText,
    url: error.url,
  });

  const messages: Record<number, string> = {
    500: 'Erro interno do servidor. Nossa equipe foi notificada.',
    502: 'Serviço temporariamente indisponível.',
    503: 'Serviço em manutenção. Tente novamente em alguns minutos.',
    504: 'Tempo limite do servidor excedido.',
  };

  const message = messages[error.status] || 'Erro no servidor. Tente novamente em alguns minutos.';

  toastService.error(message, 'Erro do Servidor', true); // persistente
}

/**
 * Trata outros erros do cliente (4xx)
 */
function handleClientError(error: HttpErrorResponse, toastService: ToastService, loggingService: LoggingService): void {
  loggingService.warn('Client error', {
    status: error.status,
    url: error.url,
  });

  if (error.status === 404) {
    toastService.warning('Recurso não encontrado.');
  } else if (error.status === 408) {
    toastService.warning('Tempo limite excedido. Tente novamente.');
  } else if (error.status === 429) {
    toastService.warning('Muitas tentativas. Aguarde um momento antes de tentar novamente.');
  } else {
    toastService.error('Ocorreu um erro na solicitação.');
  }
}

/**
 * Trata erros genéricos/desconhecidos
 */
function handleGenericError(
  error: HttpErrorResponse,
  toastService: ToastService,
  loggingService: LoggingService
): void {
  loggingService.error('Unknown error', {
    status: error.status,
    message: error.message,
    name: error.name,
  });

  toastService.error('Ocorreu um erro inesperado. Tente novamente.');
}

/**
 * Utilitário para criar headers de controle de notificação
 * Uso: req.headers.set('X-Silent-Error', 'true')
 */
export const ErrorControlHeaders = {
  SILENT_ERROR: 'X-Silent-Error',
  SKIP_NOTIFICATION: 'X-Skip-Notification',
  CUSTOM_ERROR_MESSAGE: 'X-Custom-Error-Message',
} as const;
