import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';
import { LoggingService } from './logging.service';

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
 * Integrado com sistema de logging para auditoria
 * Otimizado com computed signals para melhor performance
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'vai-na-lista-usuario';

  // Signal para gerenciar o estado do usuário autenticado
  private usuarioLogado = signal<Usuario | null>(null);

  // Computed signals para melhor performance (cached e reativo)
  readonly usuario = computed(() => this.usuarioLogado());
  readonly isAutenticado = computed(() => this.usuarioLogado() !== null);

  constructor(
    private router: Router,
    private storageService: StorageService,
    private loggingService: LoggingService
  ) {
    this.carregarUsuarioDoStorage();
  }

  /**
   * Carrega o usuário salvo no localStorage na inicialização
   */
  private carregarUsuarioDoStorage(): void {
    try {
      const usuario = this.storageService.getItem<Usuario>(this.STORAGE_KEY);
      if (usuario) {
        this.usuarioLogado.set(usuario);
        this.loggingService.info('User session restored from storage', {
          userEmail: usuario.email,
          userName: usuario.nome
        });
      } else {
        this.loggingService.debug('No user session found in storage');
      }
    } catch (error) {
      this.loggingService.error('Failed to load user from storage', error);
    }
  }

  /**
   * Realiza o login fake - aceita qualquer email/senha
   * @param loginData Dados de login (email e senha)
   * @returns Promise<boolean> - true se login foi bem-sucedido
   */
  async login(loginData: LoginData): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('Login attempt started', {
        email: loginData.email,
        timestamp: new Date().toISOString()
      });

      // Simula uma chamada assíncrona para o backend
      await this.simularDelay(800);

      // Validação básica - aceita qualquer email válido
      if (this.validarEmail(loginData.email) && loginData.senha.length >= 3) {
        const usuario: Usuario = {
          email: loginData.email,
          nome: this.extrairNomeDoEmail(loginData.email)
        };

        // Salva o usuário no estado e no localStorage
        this.usuarioLogado.set(usuario);
        this.storageService.setItem(this.STORAGE_KEY, usuario);

        const duration = Date.now() - startTime;
        this.loggingService.info('Login successful', {
          userEmail: usuario.email,
          userName: usuario.nome,
          duration: `${duration}ms`
        });

        // Redireciona para a página de lista
        await this.router.navigate(['/lista']);
        return true;
      } else {
        const duration = Date.now() - startTime;
        this.loggingService.warn('Login failed - invalid credentials', {
          email: loginData.email,
          reason: !this.validarEmail(loginData.email) ? 'invalid_email' : 'weak_password',
          duration: `${duration}ms`
        });
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.error('Login error', {
        error: error,
        email: loginData.email,
        duration: `${duration}ms`
      }, 'AuthService');
      return false;
    }
  }

  /**
   * Realiza o logout
   */
  async logout(): Promise<void> {
    try {
      const currentUser = this.usuarioLogado();

      this.loggingService.info('Logout initiated', {
        userEmail: currentUser?.email,
        userName: currentUser?.nome,
        timestamp: new Date().toISOString()
      });

      this.usuarioLogado.set(null);
      this.storageService.removeItem(this.STORAGE_KEY);

      this.loggingService.info('Logout completed successfully');

      await this.router.navigate(['/login']);
    } catch (error) {
      this.loggingService.error('Logout error', error, 'AuthService');
      // Mesmo com erro, força o logout
      this.usuarioLogado.set(null);
      this.storageService.removeItem(this.STORAGE_KEY);
      await this.router.navigate(['/login']);
    }
  }

  /**
   * Valida se o email tem formato válido
   */
  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    this.loggingService.debug('Email validation', {
      email: email,
      isValid: isValid
    });

    return isValid;
  }

  /**
   * Extrai o nome do usuário do email (parte antes do @)
   */
  private extrairNomeDoEmail(email: string): string {
    const nome = email.split('@')[0];
    const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);

    this.loggingService.debug('Name extracted from email', {
      email: email,
      extractedName: nomeFormatado
    });

    return nomeFormatado;
  }

  /**
   * Simula delay de rede
   */
  private simularDelay(ms: number): Promise<void> {
    this.loggingService.debug('Simulating network delay', { delayMs: ms });
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se a sessão atual é válida
   */
  verificarSessao(): boolean {
    const usuario = this.usuarioLogado();
    const isValid = usuario !== null;

    this.loggingService.debug('Session verification', {
      isValid: isValid,
      userEmail: usuario?.email
    });

    return isValid;
  }

  /**
   * Obtém informações do usuário atual para logging
   */
  obterContextoUsuario(): { email?: string; nome?: string } {
    const usuario = this.usuarioLogado();
    return {
      email: usuario?.email,
      nome: usuario?.nome
    };
  }
}
