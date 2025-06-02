import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Componente standalone para tela de login
 * Utiliza formulário reativo com validações
 * Implementa autenticação fake
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginForm: FormGroup;

  // Signals para gerenciar estado do componente
  isCarregando = signal(false);
  erroLogin = signal<string | null>(null);
  mostrarSenha = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.criarFormulario();
  }

  /**
   * Cria o formulário de login com validações
   */
  private criarFormulario(): FormGroup {
    return this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      senha: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    });
  }

  /**
   * Alterna a visibilidade da senha
   */
  alternarVisibilidadeSenha(): void {
    this.mostrarSenha.update(valor => !valor);
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
   * Submete o formulário de login
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.isCarregando.set(true);
    this.erroLogin.set(null);

    try {
      const { email, senha } = this.loginForm.value;
      const sucesso = await this.authService.login({ email, senha });

      if (!sucesso) {
        this.erroLogin.set('Email ou senha inválidos. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro durante login:', error);
      this.erroLogin.set('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      this.isCarregando.set(false);
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

  /**
   * Preenche o formulário com dados de exemplo
   */
  preencherExemplo(): void {
    this.loginForm.patchValue({
      email: 'usuario@exemplo.com',
      senha: '123456',
    });
  }
}
