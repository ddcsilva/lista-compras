import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoggingService } from '../../../core/services/logging.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Componente standalone para tela de login
 * Utiliza formulário reativo com validações
 * Suporte para login com Google e email/senha via Firebase
 * Integrado com sistema de logging e notificações
 * Otimizado com OnPush para melhor performance
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginForm: FormGroup;

  // Signals para gerenciar estado do componente
  isCarregando = signal(false);
  isCarregandoGoogle = signal(false);
  erroLogin = signal<string | null>(null);
  mostrarSenha = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {
    this.loginForm = this.criarFormulario();
    this.loggingService.info('LoginComponent initialized');
  }

  /**
   * Cria o formulário de login com validações
   */
  private criarFormulario(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      senha: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
    });
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
   * Verifica se um campo tem erro específico
   */
  temErro(campo: string, tipoErro: string): boolean {
    const control = this.loginForm.get(campo);
    return !!(control && control.errors?.[tipoErro] && control.touched);
  }

  /**
   * Obtém mensagem de erro para um campo
   */
  obterMensagemErro(campo: string): string {
    const control = this.loginForm.get(campo);

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

    return 'Campo inválido';
  }

  /**
   * Obtém o label amigável do campo
   */
  private obterLabelCampo(campo: string): string {
    const labels: Record<string, string> = {
      email: 'Email',
      senha: 'Senha',
    };
    return labels[campo] || campo;
  }

  /**
   * Login com email e senha
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.marcarCamposComoTocados();
      this.loggingService.warn('Login form submitted with validation errors');
      return;
    }

    this.isCarregando.set(true);
    this.erroLogin.set(null);

    try {
      const { email, senha } = this.loginForm.value;

      this.loggingService.info('Email login form submitted', {
        email: email,
        formValid: this.loginForm.valid,
      });

      const sucesso = await this.authService.loginEmailSenha({ email, senha });

      if (!sucesso) {
        this.erroLogin.set('Falha na autenticação. Verifique suas credenciais.');
        this.loggingService.warn('Email login failed in component', {
          email: email,
          reason: 'authentication_failed',
        });
      }
    } catch (error) {
      const errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      this.erroLogin.set(errorMessage);

      this.loggingService.logError(error as Error, 'LoginComponent', {
        action: 'email_login_submission',
        formData: {
          email: this.loginForm.value.email,
          hasPassword: !!this.loginForm.value.senha,
        },
      });

      this.toastService.error('Erro inesperado durante o login. Tente novamente.', 'Erro do Sistema');
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Login com Google
   */
  async loginComGoogle(): Promise<void> {
    this.isCarregandoGoogle.set(true);

    try {
      this.loggingService.info('Google login initiated from component');

      const sucesso = await this.authService.loginGoogle();

      if (!sucesso) {
        this.loggingService.warn('Google login failed in component');
      }
    } catch (error) {
      this.loggingService.logError(error as Error, 'LoginComponent', {
        action: 'google_login',
      });

      this.toastService.error('Erro no login com Google. Tente novamente.', 'Erro do Sistema');
    } finally {
      this.isCarregandoGoogle.set(false);
    }
  }

  /**
   * Marca todos os campos como tocados para exibir validações
   */
  private marcarCamposComoTocados(): void {
    Object.keys(this.loginForm.controls).forEach(campo => {
      this.loginForm.get(campo)?.markAsTouched();
    });
  }
}
