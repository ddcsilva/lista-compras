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
  cadastroForm: FormGroup;

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
  ) {
    this.cadastroForm = this.criarFormulario();
    this.loggingService.info('CadastroComponent initialized');
  }

  /**
   * Cria o formulário de cadastro com validações
   */
  private criarFormulario(): FormGroup {
    return this.formBuilder.group(
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
  alternarVisibilidadeSenha(): void {
    this.mostrarSenha.update(valor => !valor);
    this.loggingService.debug('Password visibility toggled', {
      visible: this.mostrarSenha(),
    });
  }

  /**
   * Alterna a visibilidade da confirmação de senha
   */
  alternarVisibilidadeConfirmacaoSenha(): void {
    this.mostrarConfirmacaoSenha.update(valor => !valor);
    this.loggingService.debug('Password confirmation visibility toggled', {
      visible: this.mostrarConfirmacaoSenha(),
    });
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
      this.loggingService.warn('Cadastro form submitted with validation errors');
      return;
    }

    this.isCarregando.set(true);
    this.erroCadastro.set(null);

    try {
      const { nome, email, senha } = this.cadastroForm.value;

      this.loggingService.info('Email cadastro form submitted', {
        email: email,
        nome: nome,
        formValid: this.cadastroForm.valid,
      });

      const cadastroData: CadastroData = { nome, email, senha };
      const sucesso = await this.authService.cadastrar(cadastroData);

      if (!sucesso) {
        this.erroCadastro.set('Falha no cadastro. Verifique os dados e tente novamente.');
        this.loggingService.warn('Email cadastro failed in component', {
          email: email,
          reason: 'registration_failed',
        });
      }
    } catch (error) {
      const errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      this.erroCadastro.set(errorMessage);

      this.loggingService.logError(error as Error, 'CadastroComponent', {
        action: 'email_cadastro_submission',
        formData: {
          email: this.cadastroForm.value.email,
          nome: this.cadastroForm.value.nome,
          hasPassword: !!this.cadastroForm.value.senha,
        },
      });

      this.toastService.error('Erro inesperado durante o cadastro. Tente novamente.', 'Erro do Sistema');
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Cadastro com Google
   */
  async loginComGoogle(): Promise<void> {
    this.isCarregandoGoogle.set(true);

    try {
      this.loggingService.info('Google cadastro initiated from component');

      const sucesso = await this.authService.loginGoogle();

      if (!sucesso) {
        this.loggingService.warn('Google cadastro failed in component');
      }
    } catch (error) {
      this.loggingService.logError(error as Error, 'CadastroComponent', {
        action: 'google_cadastro',
      });

      this.toastService.error('Erro no cadastro com Google. Tente novamente.', 'Erro do Sistema');
    } finally {
      this.isCarregandoGoogle.set(false);
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
