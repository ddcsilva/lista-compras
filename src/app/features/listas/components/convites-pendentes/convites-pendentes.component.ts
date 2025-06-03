import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompartilhamentoService } from '../../../../core/services/compartilhamento.service';
import { ConvitePendente } from '../../../../shared/models/compartilhamento.model';

@Component({
  selector: 'app-convites-pendentes',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (convites().length > 0) {
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-medium text-gray-900 flex items-center">
            📬 Convites Pendentes
            <span class="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              {{ convites().length }}
            </span>
          </h3>
        </div>

        <div class="space-y-3">
          @for (convite of convites(); track convite.id) {
            <div class="bg-white rounded-lg border border-gray-200 p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ convite.nomeLista }}</h4>
                  <p class="text-sm text-gray-600 mt-1">Convidado por {{ convite.nomeConvidadoPor }}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ formatarData(convite.dataConvite) }} • Expira em {{ diasRestantes(convite.dataExpiracao) }} dias
                  </p>
                </div>

                <div class="flex gap-2 ml-4">
                  <button
                    (click)="rejeitarConvite(convite)"
                    [disabled]="processando()"
                    class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    (click)="aceitarConvite(convite)"
                    [disabled]="processando()"
                    class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [],
})
export class ConvitesPendentesComponent {
  private compartilhamentoService = inject(CompartilhamentoService);

  convites = this.compartilhamentoService.convitesPendentes;
  processando = signal(false);

  async aceitarConvite(convite: ConvitePendente) {
    this.processando.set(true);
    try {
      await this.compartilhamentoService.aceitarConvite(convite.listaId);
    } finally {
      this.processando.set(false);
    }
  }

  async rejeitarConvite(convite: ConvitePendente) {
    if (confirm('Tem certeza que deseja rejeitar este convite?')) {
      this.processando.set(true);
      try {
        await this.compartilhamentoService.rejeitarConvite(convite.listaId);
      } finally {
        this.processando.set(false);
      }
    }
  }

  formatarData(data: Date): string {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
      -Math.round((Date.now() - data.getTime()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  }

  diasRestantes(dataExpiracao: Date): number {
    const dias = Math.ceil((dataExpiracao.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, dias);
  }
}
