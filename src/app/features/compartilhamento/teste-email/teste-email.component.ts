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
    <div class="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        🧪 Teste de Validação de Email - Pacote 1
        <span class="ml-3 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"> UsuarioService Integrado </span>
      </h2>

      <!-- Campo de entrada -->
      <div class="mb-6">
        <label for="emailTeste" class="block text-sm font-medium text-gray-700 mb-2">
          Digite um email para testar a busca:
        </label>
        <div class="relative">
          <input
            id="emailTeste"
            type="email"
            [(ngModel)]="emailDigitado"
            (input)="aoDigitarEmail()"
            placeholder="exemplo@email.com"
            class="w-full px-4 py-3 pr-12 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-lg"
            [class.border-gray-300]="!validacao() || validacao()!.valido"
            [class.border-red-500]="validacao() && !validacao()!.valido && emailDigitado.length > 0"
            [class.border-green-500]="validacao() && validacao()!.valido"
          />

          <!-- Ícone de status -->
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            @if (isCarregando()) {
              <svg class="animate-spin h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            } @else if (validacao() && emailDigitado.length > 0) {
              @if (validacao()!.valido) {
                <svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              } @else {
                <svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              }
            }
          </div>
        </div>

        <!-- Mensagem de feedback -->
        @if (validacao() && emailDigitado.length > 0) {
          <div class="mt-3">
            @if (validacao()!.valido) {
              <p class="text-sm text-green-600 flex items-center font-medium">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                ✅ Usuário encontrado no sistema!
              </p>
            } @else {
              <p class="text-sm text-red-600 flex items-center font-medium">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                ❌ {{ validacao()!.mensagemErro }}
              </p>
            }
          </div>
        }
      </div>

      <!-- Grid com Resultados e Estatísticas -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Resultado da validação -->
        @if (validacao() && validacao()!.valido && usuarioEncontrado()) {
          <div class="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-green-900 mb-4 flex items-center">👤 Dados do Usuário Encontrado</h3>
            <div class="space-y-3">
              <div class="flex items-center">
                <span class="font-medium text-green-800 w-16">Nome:</span>
                <span class="text-green-700">{{ usuarioEncontrado()!.nome }}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium text-green-800 w-16">Email:</span>
                <span class="text-green-700">{{ usuarioEncontrado()!.email }}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium text-green-800 w-16">UID:</span>
                <span class="text-green-700 font-mono text-xs">{{ usuarioEncontrado()!.uid }}</span>
              </div>
              @if (usuarioEncontrado()!.photoURL) {
                <div class="flex items-center mt-3">
                  <span class="font-medium text-green-800 w-16">Foto:</span>
                  <img
                    [src]="usuarioEncontrado()!.photoURL"
                    [alt]="usuarioEncontrado()!.nome"
                    class="w-10 h-10 rounded-full border-2 border-green-300"
                  />
                </div>
              }
              @if (usuarioEncontrado()!.criadoEm) {
                <div class="flex items-center">
                  <span class="font-medium text-green-800 w-16">Criado:</span>
                  <span class="text-green-700 text-sm">{{ formatarData(usuarioEncontrado()!.criadoEm!) }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Estatísticas do Cache -->
        @if (estatisticasCache()) {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-4 flex items-center">📊 Estatísticas do Cache</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="font-medium text-blue-800">Total no Cache:</span>
                <span class="text-blue-700 font-bold">{{ estatisticasCache()!.tamanho }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-medium text-blue-800">Itens Válidos:</span>
                <span class="text-blue-700 font-bold">{{ estatisticasCache()!.itensValidos }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-medium text-blue-800">Taxa de Eficiência:</span>
                <span class="text-blue-700 font-bold"> {{ calcularEficienciaCache() }}% </span>
              </div>
              <div class="mt-4 text-xs text-blue-600">
                💡 Cache expira em 5 minutos. Emails repetidos são instantâneos!
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Histórico de emails testados -->
      @if (historicoEmails().length > 0) {
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            📝 Histórico de Emails Testados ({{ historicoEmails().length }})
          </h3>
          <div class="flex flex-wrap gap-2">
            @for (email of historicoEmails(); track email) {
              <button
                (click)="selecionarEmailHistorico(email)"
                class="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:border-blue-300 transition-colors flex items-center"
                [class.bg-blue-50]="emailDigitado === email"
                [class.border-blue-300]="emailDigitado === email"
              >
                📧 {{ email }}
              </button>
            }
          </div>
          <p class="mt-3 text-xs text-gray-500">💾 Histórico salvo no localStorage (máximo 20 emails)</p>
        </div>
      }

      <!-- Botões de ação -->
      <div class="flex flex-wrap gap-3 mb-6">
        <button
          (click)="limparCache()"
          class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded-lg transition-colors flex items-center"
        >
          🗑️ Limpar Cache
        </button>
        <button
          (click)="testarEmailsExemplo()"
          class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 rounded-lg transition-colors flex items-center"
          [disabled]="isTestando()"
        >
          @if (isTestando()) {
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Testando...
          } @else {
            🧪 Testar Emails de Exemplo
          }
        </button>
        <button
          (click)="limparHistorico()"
          class="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300 rounded-lg transition-colors flex items-center"
        >
          📝 Limpar Histórico
        </button>
      </div>

      <!-- Instruções e Status -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-yellow-900 mb-3 flex items-center">💡 Como Testar - Passo a Passo</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="font-medium text-yellow-800 mb-2">✅ Emails que DEVEM funcionar:</h4>
            <ul class="text-sm text-yellow-700 space-y-1">
              <li>• danilo&at&teste&dot&com</li>
              <li>• rosana&at&teste&dot&com</li>
              <li>• maria&at&exemplo&dot&com</li>
              <li>• joao&at&exemplo&dot&com</li>
              <li>• ana&at&teste&dot&com</li>
            </ul>
          </div>
          <div>
            <h4 class="font-medium text-yellow-800 mb-2">❌ Emails para testar erro:</h4>
            <ul class="text-sm text-yellow-700 space-y-1">
              <li>• usuario&at&naoexiste&dot&com</li>
              <li>• email-sem-formato</li>
              <li>• &at&exemplo&dot&com</li>
              <li>• (campo vazio)</li>
            </ul>
          </div>
        </div>
        <div class="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
          <h4 class="font-medium text-yellow-800 mb-2">🔍 O que observar:</h4>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Primeira busca:</strong> Loading + delay ~500ms</li>
            <li>• <strong>Segunda busca (mesmo email):</strong> Instantâneo (cache)</li>
            <li>• <strong>Formato inválido:</strong> Erro imediato</li>
            <li>• <strong>Email inexistente:</strong> Mensagem clara de erro</li>
            <li>• <strong>Console do navegador:</strong> Logs detalhados do processo</li>
          </ul>
        </div>
      </div>

      <!-- Debug Info -->
      @if (debugInfo()) {
        <div class="mt-6 bg-gray-100 border border-gray-300 rounded-lg p-4">
          <h4 class="font-medium text-gray-800 mb-2">🐛 Debug Info (Console):</h4>
          <pre class="text-xs text-gray-600 bg-white p-3 rounded border overflow-x-auto">{{ debugInfo() }}</pre>
        </div>
      }
    </div>
  `,
})
export class TesteEmailComponent {
  emailDigitado = '';

  // Signals para gerenciar estado
  private validacaoSignal = signal<ValidacaoEmail | null>(null);
  private isCarregandoSignal = signal(false);
  private isTestandoSignal = signal(false);
  private estatisticasCacheSignal = signal<{ tamanho: number; itensValidos: number } | null>(null);
  private debugInfoSignal = signal<string>('');

  // Computed signals para UI
  readonly validacao = computed(() => this.validacaoSignal());
  readonly isCarregando = computed(() => this.isCarregandoSignal());
  readonly isTestando = computed(() => this.isTestandoSignal());
  readonly estatisticasCache = computed(() => this.estatisticasCacheSignal());
  readonly debugInfo = computed(() => this.debugInfoSignal());

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
    this.inicializarComponente();
  }

  /**
   * Inicializa o componente e estatísticas
   */
  private inicializarComponente(): void {
    this.atualizarEstatisticasCache();
    this.loggingService.info('TesteEmailComponent inicializado com UsuarioService');

    // Debug inicial
    this.debugInfoSignal.set('Componente carregado. Digite um email para começar os testes.');

    console.log('🧪 TESTE EMAIL COMPONENT CARREGADO');
    console.log('📧 Emails para testar:', [
      'danilo@teste.com',
      'rosana@teste.com',
      'maria@exemplo.com',
      'joao@exemplo.com',
      'ana@teste.com',
    ]);
    console.log('❌ Emails para erro:', ['usuario@naoexiste.com', 'email-invalido', '@exemplo.com']);
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
      this.debugInfoSignal.set('Campo limpo. Digite um email para validar.');
      return;
    }

    // Debug info
    this.debugInfoSignal.set(`Digitando: "${this.emailDigitado}" - aguardando debounce de 500ms...`);

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
    this.debugInfoSignal.set(`🔍 Validando email: "${email}"`);

    const startTime = performance.now();

    try {
      console.log(`🔍 Iniciando validação de: ${email}`);

      const resultado = await this.usuarioService.validarEmail(email);
      const duration = performance.now() - startTime;

      this.validacaoSignal.set(resultado);

      // Debug detalhado
      const debugMsg = `✅ Validação concluída em ${Math.round(duration)}ms
Email: ${email}
Formato correto: ${resultado.formatoCorreto}
Usuário existe: ${resultado.usuarioExiste}
Resultado: ${resultado.valido ? 'VÁLIDO' : 'INVÁLIDO'}
${resultado.mensagemErro ? `Erro: ${resultado.mensagemErro}` : ''}
${resultado.usuario ? `Usuário: ${resultado.usuario.nome} (${resultado.usuario.uid})` : ''}`;

      this.debugInfoSignal.set(debugMsg);

      console.log(`✅ Validação concluída:`, {
        email,
        duration: `${Math.round(duration)}ms`,
        resultado,
        cacheUsado: duration < 100, // Se foi muito rápido, provavelmente usou cache
      });
    } catch (error) {
      const duration = performance.now() - startTime;

      this.loggingService.error('Erro na validação de email', {
        email,
        error: (error as Error).message,
        duration: `${Math.round(duration)}ms`,
      });

      this.validacaoSignal.set({
        email,
        valido: false,
        formatoCorreto: false,
        mensagemErro: 'Erro interno na validação',
      });

      this.debugInfoSignal.set(`❌ Erro na validação: ${(error as Error).message}`);

      console.error('❌ Erro na validação:', error);
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
    this.debugInfoSignal.set(`📝 Email selecionado do histórico: ${email}`);
    this.aoDigitarEmail();

    console.log(`📝 Email do histórico selecionado: ${email}`);
  }

  /**
   * Limpa cache do serviço
   */
  limparCache(): void {
    this.usuarioService.limparCache();
    this.atualizarEstatisticasCache();
    this.debugInfoSignal.set('🗑️ Cache limpo! Próximas buscas não usarão cache.');

    console.log('🗑️ Cache do UsuarioService limpo');
  }

  /**
   * Limpa histórico de emails
   */
  limparHistorico(): void {
    localStorage.removeItem('vai-na-lista-historico-emails');
    this.debugInfoSignal.set('📝 Histórico de emails limpo!');

    console.log('📝 Histórico de emails limpo');
  }

  /**
   * Testa emails de exemplo para demonstração
   */
  async testarEmailsExemplo(): Promise<void> {
    const emails = [
      'danilo@teste.com',
      'rosana@teste.com',
      'maria@exemplo.com',
      'usuario@naoexiste.com', // Este deve dar erro
      'email-formato-invalido', // Este deve dar erro de formato
    ];

    this.isTestandoSignal.set(true);
    this.debugInfoSignal.set(`🧪 Iniciando teste automatizado com ${emails.length} emails...`);

    console.log('\n🧪 INICIANDO TESTE AUTOMATIZADO');
    console.log('📧 Emails a serem testados:', emails);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      console.log(`\n📧 [${i + 1}/${emails.length}] Testando: ${email}`);
      this.debugInfoSignal.set(`🧪 Testando ${i + 1}/${emails.length}: ${email}`);

      try {
        const startTime = performance.now();
        const resultado = await this.usuarioService.validarEmail(email);
        const duration = performance.now() - startTime;

        console.log(`✅ Resultado:`, {
          email,
          valido: resultado.valido,
          formatoCorreto: resultado.formatoCorreto,
          usuarioExiste: resultado.usuarioExiste,
          duration: `${Math.round(duration)}ms`,
          cacheUsado: duration < 100,
          mensagemErro: resultado.mensagemErro,
          usuario: resultado.usuario?.nome,
        });
      } catch (error) {
        console.log(`❌ Erro:`, error);
      }

      // Pausa entre testes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.atualizarEstatisticasCache();
    this.debugInfoSignal.set('🏁 Teste automatizado concluído! Verifique o console para resultados detalhados.');
    this.isTestandoSignal.set(false);

    console.log('\n🏁 TESTE AUTOMATIZADO CONCLUÍDO');
    console.log('📊 Estatísticas finais do cache:', this.usuarioService.obterEstatisticasCache());
  }

  /**
   * Calcula eficiência do cache
   */
  calcularEficienciaCache(): number {
    const stats = this.estatisticasCache();
    if (!stats || stats.tamanho === 0) return 0;

    return Math.round((stats.itensValidos / stats.tamanho) * 100);
  }

  /**
   * Formata data para exibição
   */
  formatarData(data: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
  }

  /**
   * Atualiza estatísticas do cache
   */
  private atualizarEstatisticasCache(): void {
    const stats = this.usuarioService.obterEstatisticasCache();
    this.estatisticasCacheSignal.set(stats);
  }
}
