import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../../core/services/usuario.service';
import { LoggingService } from '../../../core/services/logging.service';
import { ValidacaoEmail, UsuarioBasico } from '../../../shared/models/usuario.model';

/**
 * Componente de teste para validar funcionalidade de busca por email
 * Remove este componente após confirmar que tudo funciona
 * Usado apenas para desenvolvimento e testes do Pacote 1
 */
@Component({
  selector: 'app-teste-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 class="text-xl font-semibold text-gray-900 mb-6">🧪 Teste de Validação de Email</h2>

      <!-- Campo de entrada -->
      <div class="mb-4">
        <label for="emailTeste" class="block text-sm font-medium text-gray-700 mb-2">
          Digite um email para testar:
        </label>
        <div class="relative">
          <input
            id="emailTeste"
            type="email"
            [(ngModel)]="emailDigitado"
            (input)="aoDigitarEmail()"
            placeholder="exemplo@email.com"
            class="w-full px-3 py-2 pr-10 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            [class.border-gray-300]="!validacao() || validacao()!.valido"
            [class.border-red-500]="validacao() && !validacao()!.valido && emailDigitado.length > 0"
            [class.border-green-500]="validacao() && validacao()!.valido"
          />

          <!-- Ícone de status -->
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            @if (isCarregando()) {
              <svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            } @else if (validacao() && emailDigitado.length > 0) {
              @if (validacao()!.valido) {
                <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              } @else {
                <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              }
            }
          </div>
        </div>

        <!-- Mensagem de feedback -->
        @if (validacao() && emailDigitado.length > 0) {
          <div class="mt-2">
            @if (validacao()!.valido) {
              <p class="text-sm text-green-600 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Usuário encontrado!
              </p>
            } @else {
              <p class="text-sm text-red-600 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                {{ validacao()!.mensagemErro }}
              </p>
            }
          </div>
        }

        <!-- Resultado da validação -->
        @if (validacao() && validacao()!.valido && usuarioEncontrado()) {
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 class="text-sm font-medium text-green-900 mb-2">✅ Dados do Usuário:</h3>
            <div class="space-y-1 text-sm text-green-700">
              <p><strong>Nome:</strong> {{ usuarioEncontrado()!.nome }}</p>
              <p><strong>Email:</strong> {{ usuarioEncontrado()!.email }}</p>
              <p><strong>UID:</strong> {{ usuarioEncontrado()!.uid }}</p>
              @if (usuarioEncontrado()!.photoURL) {
                <div class="flex items-center mt-2">
                  <strong class="mr-2">Foto:</strong>
                  <img
                    [src]="usuarioEncontrado()!.photoURL"
                    [alt]="usuarioEncontrado()!.nome"
                    class="w-8 h-8 rounded-full"
                  />
                </div>
              }
            </div>
          </div>
        }

        <!-- Histórico de emails -->
        @if (historicoEmails().length > 0) {
          <div class="border-t pt-4">
            <h3 class="text-sm font-medium text-gray-900 mb-2">📝 Histórico de Emails Testados:</h3>
            <div class="flex flex-wrap gap-1">
              @for (email of historicoEmails(); track email) {
                <button
                  (click)="selecionarEmailHistorico(email)"
                  class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  {{ email }}
                </button>
              }
            </div>
          </div>
        }

        <!-- Estatísticas do cache -->
        @if (estatisticasCache()) {
          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 class="text-sm font-medium text-blue-900 mb-1">📊 Cache Statistics:</h3>
            <div class="text-xs text-blue-700">
              <p>Total no cache: {{ estatisticasCache()!.tamanho }}</p>
              <p>Itens válidos: {{ estatisticasCache()!.itensValidos }}</p>
            </div>
          </div>
        }

        <!-- Botões de ação -->
        <div class="flex gap-2 mt-6">
          <button
            (click)="limparCache()"
            class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          >
            Limpar Cache
          </button>
          <button
            (click)="testarEmailsExemplo()"
            class="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
          >
            Testar Emails Exemplo
          </button>
        </div>

        <!-- Instruções -->
        <div class="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 class="text-sm font-medium text-yellow-900 mb-1">💡 Como Testar:</h3>
          <ul class="text-xs text-yellow-700 space-y-1">
            <li>• Digite um email existente no Firebase Auth</li>
            <li>• Veja a validação em tempo real</li>
            <li>• Teste emails inválidos para ver os erros</li>
            <li>• Use os botões para testar funcionalidades</li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class TesteEmailComponent {
  emailDigitado = '';

  // Signals para gerenciar estado
  private validacaoSignal = signal<ValidacaoEmail | null>(null);
  private isCarregandoSignal = signal(false);
  private estatisticasCacheSignal = signal<{
    tamanho: number;
    itensValidos: number;
  } | null>(null);

  // Computed signals para UI
  readonly validacao = computed(() => this.validacaoSignal());
  readonly isCarregando = computed(() => this.isCarregandoSignal());
  readonly estatisticasCache = computed(() => this.estatisticasCacheSignal());

  readonly usuarioEncontrado = computed(() => {
    const validacao = this.validacao();
    return validacao?.valido ? validacao.usuario : null;
  });

  readonly historicoEmails = computed(() => this.usuarioService.obterHistoricoEmails());

  // Debounce para validação
  private timeoutValidacao: any = null;

  constructor(
    private usuarioService: UsuarioService,
    private loggingService: LoggingService
  ) {
    this.atualizarEstatisticasCache();
    this.loggingService.info('TesteEmailComponent inicializado');
  }

  /**
   * Chamado quando usuário digita no campo email
   */
  aoDigitarEmail(): void {
    // Clear previous timeout
    if (this.timeoutValidacao) {
      clearTimeout(this.timeoutValidacao);
    }

    // Reset estado se campo vazio
    if (!this.emailDigitado.trim()) {
      this.validacaoSignal.set(null);
      this.isCarregandoSignal.set(false);
      return;
    }

    // Debounce de 500ms para não fazer muitas consultas
    this.timeoutValidacao = setTimeout(() => {
      this.validarEmailAtual();
    }, 500);
  }

  /**
   * Valida o email atual digitado
   */
  private async validarEmailAtual(): Promise<void> {
    const email = this.emailDigitado.trim();

    if (!email) {
      return;
    }

    this.isCarregandoSignal.set(true);
    this.loggingService.debug('Iniciando validação de email', { email });

    try {
      const resultado = await this.usuarioService.validarEmail(email);
      this.validacaoSignal.set(resultado);

      this.loggingService.info('Validação de email concluída', {
        email,
        valido: resultado.valido,
        formatoCorreto: resultado.formatoCorreto,
        usuarioExiste: resultado.usuarioExiste,
      });
    } catch (error) {
      this.loggingService.error('Erro na validação de email', {
        email,
        error: (error as Error).message,
      });

      this.validacaoSignal.set({
        email,
        valido: false,
        formatoCorreto: false,
        mensagemErro: 'Erro interno na validação',
      });
    } finally {
      this.isCarregandoSignal.set(false);
      this.atualizarEstatisticasCache();
    }
  }

  /**
   * Seleciona email do histórico
   */
  selecionarEmailHistorico(email: string): void {
    this.emailDigitado = email;
    this.aoDigitarEmail();
  }

  /**
   * Limpa cache do serviço
   */
  limparCache(): void {
    this.usuarioService.limparCache();
    this.atualizarEstatisticasCache();
    this.loggingService.info('Cache limpo via TesteEmailComponent');
  }

  /**
   * Testa emails de exemplo para demonstração
   */
  async testarEmailsExemplo(): Promise<void> {
    const emails = ['usuario@exemplo.com', 'teste@gmail.com', 'invalido@inexistente.com', 'formato-incorreto'];

    this.loggingService.info('Iniciando teste com emails de exemplo', {
      emails,
    });

    for (const email of emails) {
      console.log(`\n🧪 Testando: ${email}`);

      try {
        const resultado = await this.usuarioService.validarEmail(email);
        console.log('✅ Resultado:', resultado);
      } catch (error) {
        console.log('❌ Erro:', error);
      }

      // Pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    this.atualizarEstatisticasCache();
    console.log('\n🏁 Teste concluído! Verifique o cache e logs.');
  }

  /**
   * Atualiza estatísticas do cache
   */
  private atualizarEstatisticasCache(): void {
    const stats = this.usuarioService.obterEstatisticasCache();
    this.estatisticasCacheSignal.set(stats);
  }
}
