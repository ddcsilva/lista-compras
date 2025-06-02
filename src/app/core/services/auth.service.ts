import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';

export interface Usuario {
  email: string;
  nome: string;
}

export interface LoginData {
  email: string;
  senha: string;
}

/**
 * Serviço de autenticação fake
 * Gerencia o estado de autenticação do usuário usando signals
 * Persiste a sessão no localStorage
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'vai-na-lista-usuario';

  // Signal para gerenciar o estado do usuário autenticado
  private usuarioLogado = signal<Usuario | null>(null);

  // Getter público para acessar o estado do usuário
  get usuario() {
    return this.usuarioLogado.asReadonly();
  }

  // Computed para verificar se o usuário está autenticado
  get isAutenticado() {
    return this.usuarioLogado() !== null;
  }

  constructor(
    private router: Router,
    private storageService: StorageService
  ) {
    this.carregarUsuarioDoStorage();
  }

  /**
   * Carrega o usuário salvo no localStorage na inicialização
   */
  private carregarUsuarioDoStorage(): void {
    const usuario = this.storageService.getItem<Usuario>(this.STORAGE_KEY);
    if (usuario) {
      this.usuarioLogado.set(usuario);
    }
  }

  /**
   * Realiza o login fake - aceita qualquer email/senha
   * @param loginData Dados de login (email e senha)
   * @returns Promise<boolean> - true se login foi bem-sucedido
   */
  async login(loginData: LoginData): Promise<boolean> {
    // Simula uma chamada assíncrona para o backend
    await this.simularDelay(800);

    // Validação básica - aceita qualquer email válido
    if (this.validarEmail(loginData.email) && loginData.senha.length >= 3) {
      const usuario: Usuario = {
        email: loginData.email,
        nome: this.extrairNomeDoEmail(loginData.email),
      };

      // Salva o usuário no estado e no localStorage
      this.usuarioLogado.set(usuario);
      this.storageService.setItem(this.STORAGE_KEY, usuario);

      // Redireciona para a página de lista
      await this.router.navigate(['/lista']);
      return true;
    }

    return false;
  }

  /**
   * Realiza o logout
   */
  async logout(): Promise<void> {
    this.usuarioLogado.set(null);
    this.storageService.removeItem(this.STORAGE_KEY);
    await this.router.navigate(['/login']);
  }

  /**
   * Valida se o email tem formato válido
   */
  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Extrai o nome do usuário do email (parte antes do @)
   */
  private extrairNomeDoEmail(email: string): string {
    const nome = email.split('@')[0];
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }

  /**
   * Simula delay de rede
   */
  private simularDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
