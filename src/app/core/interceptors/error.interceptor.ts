import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { LoggingService } from '../services/logging.service';

/**
 * Interceptor global para tratamento de erros HTTP
 * Captura erros de requisições e exibe notificações apropriadas
 * Integrado com sistema de logging para auditoria
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const loggingService = inject(LoggingService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log do erro para auditoria
      loggingService.error('HTTP Error intercepted', {
        url: req.url,
        method: req.method,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      // Determina se deve exibir notificação baseado no status
      const shouldShowNotification = shouldShowErrorNotification(error.status);

      if (shouldShowNotification) {
        const userMessage = getUserFriendlyMessage(error);
        toastService.error(userMessage, 'Erro de Conexão');
      }

      // Re-lança o erro para que componentes possam tratá-lo se necessário
      return throwError(() => error);
    })
  );
};

/**
 * Determina se deve exibir notificação para o usuário
 */
function shouldShowErrorNotification(status: number): boolean {
  // Status que não devem gerar notificação automática
  const silentStatuses = [401, 403]; // Unauthorized, Forbidden

  // Não exibe notificação para status específicos
  // (componentes podem tratar individualmente)
  return !silentStatuses.includes(status);
}

/**
 * Converte erro HTTP em mensagem amigável para o usuário
 */
function getUserFriendlyMessage(error: HttpErrorResponse): string {
  // Mensagens específicas por status HTTP
  const statusMessages: Record<number, string> = {
    0: 'Sem conexão com a internet. Verifique sua rede.',
    400: 'Dados inválidos enviados. Verifique as informações.',
    401: 'Sessão expirada. Faça login novamente.',
    403: 'Acesso negado. Você não tem permissão.',
    404: 'Recurso não encontrado.',
    408: 'Tempo limite excedido. Tente novamente.',
    409: 'Conflito de dados. Atualize a página.',
    422: 'Dados inválidos. Verifique os campos.',
    429: 'Muitas tentativas. Aguarde um momento.',
    500: 'Erro interno do servidor. Tente mais tarde.',
    502: 'Servidor indisponível. Tente mais tarde.',
    503: 'Serviço temporariamente indisponível.',
    504: 'Tempo limite do servidor excedido.',
  };

  // Retorna mensagem específica ou genérica
  return statusMessages[error.status] || `Erro inesperado (${error.status}). Tente novamente.`;
}
