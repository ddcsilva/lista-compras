import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../../core/services/pwa.service';

/**
 * Componente para exibir banner de instalação PWA
 * Aparece quando o app pode ser instalado e não está instalado
 */
@Component({
  selector: 'app-pwa-banner',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShowBanner()) {
      <div
        class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-4 z-50 transform transition-all duration-300"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                <span class="text-blue-600 text-lg font-bold">🛒</span>
              </div>
              <h3 class="font-semibold text-sm">Instalar Vai na Lista</h3>
            </div>
            <p class="text-xs text-blue-100 mb-3">
              Instale o app para acesso rápido e funcionalidade offline completa!
            </p>
            <div class="flex gap-2">
              <button
                (click)="install()"
                class="px-3 py-1 bg-white text-blue-600 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                Instalar
              </button>
              <button
                (click)="dismiss()"
                class="px-3 py-1 bg-blue-500 bg-opacity-50 text-white rounded text-xs hover:bg-opacity-70 transition-colors"
              >
                Não agora
              </button>
            </div>
          </div>
          <button (click)="dismiss()" class="ml-2 text-blue-200 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    }
  `,
})
export class PwaBannerComponent {
  private isDismissed = false;

  // Computed para determinar se deve mostrar o banner
  readonly shouldShowBanner = computed(() => {
    return this.pwaService.isInstallable$ && !this.pwaService.isInstalled$ && !this.isDismissed;
  });

  constructor(private pwaService: PwaService) {}

  /**
   * Instala o PWA
   */
  async install(): Promise<void> {
    await this.pwaService.showInstallPrompt();
    this.isDismissed = true;
  }

  /**
   * Dispensa o banner
   */
  dismiss(): void {
    this.isDismissed = true;

    // Salva preferência para não mostrar novamente nesta sessão
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  }
}
