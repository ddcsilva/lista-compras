import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente shared para indicador de carregamento
 * Reutilizável em diferentes partes da aplicação
 */
@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center" [class]="containerClass">
      <div class="relative">
        <div
          class="animate-spin rounded-full border-4 border-primary-200 border-t-primary-600"
          [class]="spinnerSize"
        ></div>
        @if (text) {
          <p class="mt-2 text-sm text-gray-600 text-center">{{ text }}</p>
        }
      </div>
    </div>
  `,
})
export class LoadingComponent {
  @Input() text: string = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() containerClass: string = '';

  get spinnerSize(): string {
    const sizes = {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
    };
    return sizes[this.size];
  }
}
