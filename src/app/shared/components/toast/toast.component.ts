import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastType } from '../../../core/services/toast.service';

/**
 * Componente para exibir notificações toast
 * Renderiza automaticamente toasts gerenciados pelo ToastService
 * Design responsivo com animações suaves
 * Otimizado com OnPush para melhor performance
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="transform transition-all duration-300 ease-in-out"
          [class]="getToastClasses(toast)"
          role="alert"
          [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'"
        >
          <!-- Ícone do toast -->
          <div class="flex">
            <div class="flex-shrink-0">
              @switch (toast.type) {
                @case ('success') {
                  <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
                @case ('error') {
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
                @case ('warning') {
                  <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
                @case ('info') {
                  <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                }
              }
            </div>

            <!-- Conteúdo do toast -->
            <div class="ml-3 flex-1">
              @if (toast.title) {
                <h4 class="text-sm font-medium" [class]="getTitleColor(toast.type)">
                  {{ toast.title }}
                </h4>
              }
              <p class="text-sm" [class]="getMessageColor(toast.type)">
                {{ toast.message }}
              </p>
            </div>

            <!-- Botão de fechar -->
            <div class="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                (click)="dismiss(toast.id)"
                class="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                [class]="getCloseButtonClasses(toast.type)"
              >
                <span class="sr-only">Fechar</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Barra de progresso para toasts com duração -->
          @if (!toast.persistent && toast.duration) {
            <div class="mt-2 w-full bg-gray-200 rounded-full h-1">
              <div
                class="h-1 rounded-full transition-all ease-linear"
                [class]="getProgressBarColor(toast.type)"
                [style.animation]="'toast-progress ' + toast.duration + 'ms linear'"
              ></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes toast-progress {
        from {
          width: 100%;
        }
        to {
          width: 0%;
        }
      }

      /* Animações de entrada e saída */
      .toast-enter {
        animation: toast-slide-in 0.3s ease-out;
      }

      @keyframes toast-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ToastComponent {
  toastService = inject(ToastService);

  /**
   * Remove um toast específico
   */
  dismiss(toastId: string): void {
    this.toastService.dismiss(toastId);
  }

  /**
   * Obtém classes CSS baseadas no tipo do toast
   */
  getToastClasses(toast: Toast): string {
    const baseClasses = 'p-4 rounded-lg shadow-lg border pointer-events-auto';

    const typeClasses = {
      [ToastType.SUCCESS]: 'bg-green-50 border-green-200',
      [ToastType.ERROR]: 'bg-red-50 border-red-200',
      [ToastType.WARNING]: 'bg-yellow-50 border-yellow-200',
      [ToastType.INFO]: 'bg-blue-50 border-blue-200',
    };

    return `${baseClasses} ${typeClasses[toast.type]}`;
  }

  /**
   * Obtém cor do título baseada no tipo
   */
  getTitleColor(type: ToastType): string {
    const colors = {
      [ToastType.SUCCESS]: 'text-green-800',
      [ToastType.ERROR]: 'text-red-800',
      [ToastType.WARNING]: 'text-yellow-800',
      [ToastType.INFO]: 'text-blue-800',
    };

    return colors[type];
  }

  /**
   * Obtém cor da mensagem baseada no tipo
   */
  getMessageColor(type: ToastType): string {
    const colors = {
      [ToastType.SUCCESS]: 'text-green-700',
      [ToastType.ERROR]: 'text-red-700',
      [ToastType.WARNING]: 'text-yellow-700',
      [ToastType.INFO]: 'text-blue-700',
    };

    return colors[type];
  }

  /**
   * Obtém classes do botão de fechar baseadas no tipo
   */
  getCloseButtonClasses(type: ToastType): string {
    const classes = {
      [ToastType.SUCCESS]: 'text-green-400 hover:text-green-600 focus:ring-green-500',
      [ToastType.ERROR]: 'text-red-400 hover:text-red-600 focus:ring-red-500',
      [ToastType.WARNING]: 'text-yellow-400 hover:text-yellow-600 focus:ring-yellow-500',
      [ToastType.INFO]: 'text-blue-400 hover:text-blue-600 focus:ring-blue-500',
    };

    return classes[type];
  }

  /**
   * Obtém cor da barra de progresso baseada no tipo
   */
  getProgressBarColor(type: ToastType): string {
    const colors = {
      [ToastType.SUCCESS]: 'bg-green-400',
      [ToastType.ERROR]: 'bg-red-400',
      [ToastType.WARNING]: 'bg-yellow-400',
      [ToastType.INFO]: 'bg-blue-400',
    };

    return colors[type];
  }
}
