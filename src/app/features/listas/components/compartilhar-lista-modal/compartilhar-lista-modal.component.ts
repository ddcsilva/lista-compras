import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CompartilhamentoService } from '../../../../core/services/compartilhamento.service';
import { UsuarioService } from '../../../../core/services/usuario.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-compartilhar-lista-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900">Compartilhar Lista</h2>
          <button (click)="fechar()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Formulário -->
        <form [formGroup]="form" (ngSubmit)="compartilhar()">
          <!-- Campo Email -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"> Email da pessoa </label>
            <div class="relative">
              <input
                type="email"
                formControlName="email"
                placeholder="exemplo@email.com"
                class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                [class.border-red-500]="form.get('email')?.invalid && form.get('email')?.touched"
                [class.border-green-500]="usuarioEncontrado()"
              />

              <!-- Indicador de busca -->
              @if (buscandoUsuario()) {
                <div class="absolute right-3 top-2.5">
                  <svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                </div>
              }
            </div>

            <!-- Feedback de validação -->
            @if (usuarioEncontrado()) {
              <div class="mt-2 flex items-center text-green-600">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span class="text-sm">{{ usuarioEncontrado()!.nome }} encontrado</span>
              </div>
            }

            @if (erroValidacao()) {
              <p class="mt-1 text-sm text-red-600">{{ erroValidacao() }}</p>
            }
          </div>

          <!-- Campo Permissão -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1"> Permissão </label>
            <select
              formControlName="permissao"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="editor">Editor (pode adicionar/editar itens)</option>
              <!-- <option value="viewer">Visualizador (apenas leitura)</option> -->
            </select>
          </div>

          <!-- Botões -->
          <div class="flex justify-end gap-3">
            <button
              type="button"
              (click)="fechar()"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || !usuarioEncontrado() || compartilhando()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              @if (compartilhando()) {
                <span class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Enviando...
                </span>
              } @else {
                Enviar Convite
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [],
})
export class CompartilharListaModalComponent {
  @Input() listaId!: string;
  @Output() fecharModal = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private compartilhamentoService = inject(CompartilhamentoService);
  private usuarioService = inject(UsuarioService);
  private toastService = inject(ToastService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    permissao: ['editor'],
  });

  buscandoUsuario = signal(false);
  usuarioEncontrado = signal<{ uid: string; nome: string; email: string } | null>(null);
  erroValidacao = signal<string>('');
  compartilhando = signal(false);

  ngOnInit() {
    // Validar email em tempo real
    this.form
      .get('email')
      ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(email => {
        if (email && this.form.get('email')?.valid) {
          this.buscarUsuario(email);
        } else {
          this.usuarioEncontrado.set(null);
          this.erroValidacao.set('');
        }
      });
  }

  private async buscarUsuario(email: string) {
    this.buscandoUsuario.set(true);
    this.erroValidacao.set('');

    try {
      const resultado = await this.usuarioService.buscarUsuarioPorEmail(email);

      if (resultado.encontrado && resultado.usuario) {
        this.usuarioEncontrado.set(resultado.usuario);
      } else {
        this.usuarioEncontrado.set(null);
        this.erroValidacao.set('Usuário não encontrado com este email');
      }
    } catch (error) {
      this.erroValidacao.set('Erro ao buscar usuário');
    } finally {
      this.buscandoUsuario.set(false);
    }
  }

  async compartilhar() {
    if (this.form.invalid || !this.usuarioEncontrado() || !this.listaId) return;

    this.compartilhando.set(true);

    try {
      const { email, permissao } = this.form.value;
      const sucesso = await this.compartilhamentoService.compartilharLista(this.listaId, email!, permissao as any);

      if (sucesso) {
        this.fechar();
      }
    } finally {
      this.compartilhando.set(false);
    }
  }

  fechar() {
    this.fecharModal.emit();
  }
}
