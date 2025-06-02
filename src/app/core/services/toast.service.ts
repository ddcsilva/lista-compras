import { Injectable, signal } from '@angular/core';

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  timestamp: Date;
}

/**
 * Serviço de notificações toast
 * Gerencia exibição de mensagens temporárias ao usuário
 * Integrado com sistema de logging para rastreabilidade
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly DEFAULT_DURATION = 5000; // 5 segundos
  private readonly ERROR_DURATION = 8000; // 8 segundos para erros

  // Signal para gerenciar lista de toasts ativos
  private toastsSignal = signal<Toast[]>([]);

  // Getter público readonly para acessar toasts
  get toasts() {
    return this.toastsSignal.asReadonly();
  }

  /**
   * Exibe toast de sucesso
   */
  success(message: string, title?: string, duration?: number): string {
    return this.show({
      type: ToastType.SUCCESS,
      title: title || 'Sucesso',
      message,
      duration: duration || this.DEFAULT_DURATION,
    });
  }

  /**
   * Exibe toast de erro
   */
  error(message: string, title?: string, persistent = false): string {
    return this.show({
      type: ToastType.ERROR,
      title: title || 'Erro',
      message,
      duration: persistent ? undefined : this.ERROR_DURATION,
      persistent,
    });
  }

  /**
   * Exibe toast de aviso
   */
  warning(message: string, title?: string, duration?: number): string {
    return this.show({
      type: ToastType.WARNING,
      title: title || 'Atenção',
      message,
      duration: duration || this.DEFAULT_DURATION,
    });
  }

  /**
   * Exibe toast informativo
   */
  info(message: string, title?: string, duration?: number): string {
    return this.show({
      type: ToastType.INFO,
      title: title || 'Informação',
      message,
      duration: duration || this.DEFAULT_DURATION,
    });
  }

  /**
   * Exibe toast customizado
   */
  show(config: Partial<Toast>): string {
    const toast: Toast = {
      id: this.generateId(),
      type: config.type || ToastType.INFO,
      title: config.title,
      message: config.message || '',
      duration: config.duration || this.DEFAULT_DURATION,
      persistent: config.persistent || false,
      timestamp: new Date(),
    };

    // Adiciona toast à lista
    const currentToasts = this.toastsSignal();
    this.toastsSignal.set([...currentToasts, toast]);

    // Configura auto-dismiss se não for persistente
    if (!toast.persistent && toast.duration) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, toast.duration);
    }

    return toast.id;
  }

  /**
   * Remove um toast específico
   */
  dismiss(toastId: string): void {
    const currentToasts = this.toastsSignal();
    const updatedToasts = currentToasts.filter(toast => toast.id !== toastId);
    this.toastsSignal.set(updatedToasts);
  }

  /**
   * Remove todos os toasts
   */
  dismissAll(): void {
    this.toastsSignal.set([]);
  }

  /**
   * Remove todos os toasts de um tipo específico
   */
  dismissByType(type: ToastType): void {
    const currentToasts = this.toastsSignal();
    const updatedToasts = currentToasts.filter(toast => toast.type !== type);
    this.toastsSignal.set(updatedToasts);
  }

  /**
   * Métodos de conveniência para erros HTTP comuns
   */
  showHttpError(status: number, customMessage?: string): string {
    const messages: Record<number, string> = {
      400: 'Dados inválidos enviados.',
      401: 'Você precisa fazer login novamente.',
      403: 'Você não tem permissão para esta ação.',
      404: 'Recurso não encontrado.',
      408: 'Tempo limite excedido. Tente novamente.',
      429: 'Muitas tentativas. Aguarde um momento.',
      500: 'Erro interno do servidor.',
      502: 'Serviço temporariamente indisponível.',
      503: 'Serviço em manutenção.',
      0: 'Problema de conexão. Verifique sua internet.',
    };

    const defaultMessage =
      status >= 500 ? 'Erro no servidor. Tente novamente em alguns minutos.' : 'Ocorreu um erro inesperado.';

    const message = customMessage || messages[status] || defaultMessage;

    return this.error(message, 'Erro de Conexão');
  }

  /**
   * Exibe mensagem de erro de rede
   */
  showNetworkError(): string {
    return this.error(
      'Problema de conexão com a internet. Verifique sua conectividade.',
      'Erro de Rede',
      true // persistente
    );
  }

  /**
   * Exibe mensagem de erro genérico
   */
  showGenericError(action?: string): string {
    const message = action
      ? `Não foi possível ${action}. Tente novamente.`
      : 'Ocorreu um erro inesperado. Tente novamente.';

    return this.error(message);
  }

  /**
   * Gera ID único para toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas dos toasts
   */
  getStats(): { active: number; byType: Record<string, number> } {
    const toasts = this.toastsSignal();
    const byType = {
      success: 0,
      error: 0,
      warning: 0,
      info: 0,
    };

    toasts.forEach(toast => {
      if (byType[toast.type] !== undefined) {
        byType[toast.type]++;
      }
    });

    return {
      active: toasts.length,
      byType,
    };
  }
}
