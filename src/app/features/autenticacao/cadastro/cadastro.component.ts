import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, CadastroData } from '../../../core/services/auth.service';
import { LoggingService } from '../../../core/services/logging.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Componente standalone para tela de cadastro
 * Utiliza formulário reativo com validações
 * Cadastro com nome, email e senha via Firebase
 * Integrado com sistema de logging e notificações
 * Otimizado com OnPush para melhor performance
 */
@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent {
  cadastroForm!: FormGroup;

  // Signals para gerenciar estado do componente
  isCarregando = signal(false);
  isCarregandoGoogle = signal(false);
  erroCadastro = signal<string | null>(null);
  mostrarSenha = signal(false);
  mostrarConfirmacaoSenha = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.criarFormulario();
  }

  /**
   * Cria o formulário de cadastro com validações
   */
  private criarFormulario(): void {
    this.cadastroForm = this.formBuilder.group(
      {
        nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        senha: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
        confirmacaoSenha: ['', [Validators.required]],
      },
      { validators: this.validadorSenhasIguais }
    );
  }

  /**
   * Validador customizado para verificar se as senhas são iguais
   */
  private validadorSenhasIguais(form: FormGroup) {
    const senha = form.get('senha');
    const confirmacaoSenha = form.get('confirmacaoSenha');

    if (senha && confirmacaoSenha && senha.value !== confirmacaoSenha.value) {
      confirmacaoSenha.setErrors({ senhasDiferentes: true });
      return { senhasDiferentes: true };
    }

    if (confirmacaoSenha?.errors?.['senhasDiferentes']) {
      delete confirmacaoSenha.errors['senhasDiferentes'];
      if (Object.keys(confirmacaoSenha.errors).length === 0) {
        confirmacaoSenha.setErrors(null);
      }
    }

    return null;
  }

  /**
   * Alterna a visibilidade da senha
   */
  togglePasswordVisibility(): void {
    this.mostrarSenha.update(valor => !valor);
  }

  /**
   * Alterna a visibilidade da confirmação de senha
   */
  toggleConfirmPasswordVisibility(): void {
    this.mostrarConfirmacaoSenha.update(valor => !valor);
  }

  /**
   * Verifica se um campo tem erro específico
   */
  temErro(campo: string, tipoErro: string): boolean {
    const control = this.cadastroForm.get(campo);
    return !!(control && control.errors?.[tipoErro] && control.touched);
  }

  /**
   * Obtém mensagem de erro para um campo
   */
  obterMensagemErro(campo: string): string {
    const control = this.cadastroForm.get(campo);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const erros = control.errors;

    if (erros['required']) {
      return `${this.obterLabelCampo(campo)} é obrigatório`;
    }

    if (erros['email']) {
      return 'Email deve ter um formato válido';
    }

    if (erros['minlength']) {
      const min = erros['minlength'].requiredLength;
      return `${this.obterLabelCampo(campo)} deve ter pelo menos ${min} caracteres`;
    }

    if (erros['maxlength']) {
      const max = erros['maxlength'].requiredLength;
      return `${this.obterLabelCampo(campo)} deve ter no máximo ${max} caracteres`;
    }

    if (erros['senhasDiferentes']) {
      return 'As senhas não coincidem';
    }

    return 'Campo inválido';
  }

  /**
   * Obtém o label amigável do campo
   */
  private obterLabelCampo(campo: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      email: 'Email',
      senha: 'Senha',
      confirmacaoSenha: 'Confirmação de senha',
    };
    return labels[campo] || campo;
  }

  /**
   * Cadastro com email e senha
   */
  async onSubmit(): Promise<void> {
    if (this.cadastroForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.isCarregando.set(true);

    try {
      const { nome, email, senha } = this.cadastroForm.value;
      const sucesso = await this.authService.cadastrar({ nome, email, senha });

      if (!sucesso) {
        // Erro já tratado pelo AuthService
      }
    } catch (error) {
      this.loggingService.error('Unexpected registration error', { error });
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Realiza cadastro com Google
   */
  async cadastroGoogle(): Promise<void> {
    this.isCarregando.set(true);

    try {
      const sucesso = await this.authService.loginGoogle();

      if (!sucesso) {
        // Erro já tratado pelo AuthService
      }
    } catch (error) {
      this.loggingService.error('Unexpected Google registration error', { error });
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Marca todos os campos como tocados para exibir validações
   */
  private marcarCamposComoTocados(): void {
    Object.keys(this.cadastroForm.controls).forEach(campo => {
      this.cadastroForm.get(campo)?.markAsTouched();
    });
  }
}
