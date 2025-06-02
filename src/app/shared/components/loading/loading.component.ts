import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de loading genérico e reutilizável
 * Usado durante carregamento de autenticação do Firebase
 * Otimizado com OnPush para melhor performance
 */
@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 bg-gradient-primary flex items-center justify-center z-50">
      <div class="text-center">
        <!-- Logo e spinner -->
        <div class="mb-6">
          <h1 class="text-4xl font-bold text-white mb-4">Vai na Lista</h1>

          <!-- Spinner animado -->
          <div class="relative mx-auto w-16 h-16">
            <div class="absolute top-0 left-0 w-full h-full border-4 border-white border-opacity-20 rounded-full"></div>
            <div
              class="absolute top-0 left-0 w-full h-full border-4 border-white border-t-transparent rounded-full animate-spin"
            ></div>
          </div>
        </div>

        <!-- Mensagem de carregamento -->
        <div class="text-white">
          <p class="text-lg font-medium mb-2">{{ message }}</p>
          <p class="text-blue-100 text-sm">{{ subMessage }}</p>
        </div>

        <!-- Indicador de progresso (opcional) -->
        @if (showProgress) {
          <div class="mt-6 w-64 mx-auto">
            <div class="w-full bg-white bg-opacity-20 rounded-full h-2">
              <div
                class="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                [style.width.%]="progress"
              ></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class LoadingComponent {
  @Input() message: string = 'Carregando...';
  @Input() subMessage: string = 'Aguarde um momento';
  @Input() showProgress: boolean = false;
  @Input() progress: number = 0;
}
