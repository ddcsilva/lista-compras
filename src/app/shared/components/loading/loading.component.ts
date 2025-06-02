import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de loading reutilizável
 * Suporta diferentes tamanhos e mensagens personalizadas
 * Otimizado com OnPush para melhor performance
 */
@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center p-8">
      <!-- Spinner -->
      <div
        class="animate-spin rounded-full border-4 border-gray-200 border-t-primary-600"
        [ngClass]="{
          'h-8 w-8': size === 'small',
          'h-12 w-12': size === 'medium',
          'h-16 w-16': size === 'large',
        }"
      ></div>

      <!-- Mensagem -->
      @if (message) {
        <p class="mt-4 text-sm text-gray-600 text-center">{{ message }}</p>
      }

      <!-- Submensagem -->
      @if (subMessage) {
        <p class="mt-2 text-xs text-gray-500 text-center">{{ subMessage }}</p>
      }
    </div>
  `,
})
export class LoadingComponent {
  @Input() size = 'medium';
  @Input() message = 'Carregando...';
  @Input() subMessage = '';
  @Input() showSpinner = true;
}
