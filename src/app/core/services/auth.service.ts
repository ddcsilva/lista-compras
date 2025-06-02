import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  AuthError,
} from 'firebase/auth';
import { auth } from '../config/firebase.config';
import { StorageService } from './storage.service';
import { LoggingService } from './logging.service';
import { ToastService } from './toast.service';
import { Observable } from 'rxjs';

export interface Usuario {
  uid: string;
  email: string;
  nome: string;
  photoURL?: string;
  providerId?: string;
}

export interface LoginData {
  email: string;
  senha: string;
}

export interface CadastroData {
  nome: string;
  email: string;
  senha: string;
}

/**
 * Serviço de autenticação com Firebase
 * Gerencia o estado de autenticação do usuário usando signals
 * Suporte para login com Google e email/senha
 * Otimizado com computed signals para melhor performance
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'vai-na-lista-usuario';
  private googleProvider = new GoogleAuthProvider();

  // Signal para gerenciar o estado do usuário autenticado
  private usuarioLogado = signal<Usuario | null>(null);
  private carregandoAuth = signal(true);

  // Computed signals para melhor performance (cached e reativo)
  readonly usuario = computed(() => this.usuarioLogado());
  readonly isAutenticado = computed(() => this.usuarioLogado() !== null);
  readonly isCarregando = computed(() => this.carregandoAuth());

  /**
   * Observable que emite o usuário atual
   * Usa o signal interno para evitar duplo listener
   */
  readonly usuario$ = new Observable<Usuario | null>(subscriber => {
    let lastValue = this.usuarioLogado();

    // Emite valor inicial
    subscriber.next(lastValue);

    // Cria um interval muito leve para verificar mudanças no signal
    // Isso é mais eficiente que duplicar onAuthStateChanged
    const intervalId = setInterval(() => {
      const currentValue = this.usuarioLogado();
      if (currentValue !== lastValue) {
        lastValue = currentValue;
        subscriber.next(currentValue);
      }
    }, 50); // Check a cada 50ms

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  });

  constructor(
    private router: Router,
    private storageService: StorageService,
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {
    this.inicializarAuth();
  }

  /**
   * Inicializa o listener de autenticação do Firebase
   */
  private inicializarAuth(): void {
    onAuthStateChanged(auth, firebaseUser => {
      this.carregandoAuth.set(false);

      if (firebaseUser) {
        const usuario = this.mapearUsuarioFirebase(firebaseUser);
        this.usuarioLogado.set(usuario);
        this.storageService.setItem(this.STORAGE_KEY, usuario);
      } else {
        this.usuarioLogado.set(null);
        this.storageService.removeItem(this.STORAGE_KEY);
      }
    });
  }

  /**
   * Converte User do Firebase para interface Usuario
   */
  private mapearUsuarioFirebase(firebaseUser: User): Usuario {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
      photoURL: firebaseUser.photoURL || undefined,
      providerId: firebaseUser.providerData[0]?.providerId || 'password',
    };
  }

  /**
   * Login com email e senha
   */
  async loginEmailSenha(loginData: LoginData): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('Email login attempt started', {
        email: loginData.email,
      });

      const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.senha);

      const duration = Date.now() - startTime;

      this.loggingService.info('Email login successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        duration: `${duration}ms`,
      });

      this.toastService.success('Login realizado com sucesso!', 'Bem-vindo');
      await this.router.navigate(['/lista']);
      return true;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      this.loggingService.error('Email login failed', {
        email: loginData.email,
        error: (error as AuthError).code,
        message: (error as AuthError).message,
        duration: `${duration}ms`,
      });

      this.tratarErroLogin(error as AuthError);
      return false;
    }
  }

  /**
   * Login com Google
   */
  async loginGoogle(): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('Google login attempt started');

      const userCredential = await signInWithPopup(auth, this.googleProvider);

      const duration = Date.now() - startTime;

      this.loggingService.info('Google login successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        duration: `${duration}ms`,
      });

      this.toastService.success(`Bem-vindo, ${userCredential.user.displayName}!`, 'Login Google');

      await this.router.navigate(['/lista']);
      return true;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      this.loggingService.error('Google login failed', {
        error: (error as AuthError).code,
        message: (error as AuthError).message,
        duration: `${duration}ms`,
      });

      this.tratarErroLogin(error as AuthError);
      return false;
    }
  }

  /**
   * Cadastro com email e senha
   */
  async cadastrar(cadastroData: CadastroData): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('User registration attempt started', {
        email: cadastroData.email,
        nome: cadastroData.nome,
      });

      // Cria usuário
      const userCredential = await createUserWithEmailAndPassword(auth, cadastroData.email, cadastroData.senha);

      // Atualiza perfil com nome
      await updateProfile(userCredential.user, {
        displayName: cadastroData.nome,
      });

      const duration = Date.now() - startTime;

      this.loggingService.info('User registration successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        nome: cadastroData.nome,
        duration: `${duration}ms`,
      });

      this.toastService.success(`Conta criada com sucesso! Bem-vindo, ${cadastroData.nome}!`, 'Cadastro Realizado');

      await this.router.navigate(['/lista']);
      return true;
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      this.loggingService.error('User registration failed', {
        email: cadastroData.email,
        error: (error as AuthError).code,
        message: (error as AuthError).message,
        duration: `${duration}ms`,
      });

      this.tratarErroCadastro(error as AuthError);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      const currentUser = this.usuarioLogado();

      this.loggingService.info('Logout initiated', {
        uid: currentUser?.uid,
        email: currentUser?.email,
      });

      await signOut(auth);

      this.toastService.success('Logout realizado com sucesso!');
      this.loggingService.info('Logout completed successfully');

      await this.router.navigate(['/login']);
    } catch (error: unknown) {
      this.loggingService.error('Logout error', {
        error: (error as AuthError).code,
        message: (error as AuthError).message,
      });

      this.toastService.error('Erro ao fazer logout. Tente novamente.');
    }
  }

  /**
   * Trata erros específicos de login
   */
  private tratarErroLogin(error: AuthError): void {
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'Usuário não encontrado. Verifique o email ou cadastre-se.',
      'auth/wrong-password': 'Senha incorreta. Tente novamente.',
      'auth/invalid-email': 'Email inválido. Verifique o formato.',
      'auth/user-disabled': 'Esta conta foi desabilitada.',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
      'auth/popup-closed-by-user': 'Login cancelado pelo usuário.',
      'auth/popup-blocked': 'Pop-up bloqueado. Permita pop-ups para este site.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
      'auth/invalid-credential': 'Credenciais inválidas. Verifique email e senha.',
    };

    const message = errorMessages[error.code] || 'Erro inesperado no login. Tente novamente.';
    this.toastService.error(message, 'Erro de Login');
  }

  /**
   * Trata erros específicos de cadastro
   */
  private tratarErroCadastro(error: AuthError): void {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Este email já está em uso. Tente fazer login.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/invalid-email': 'Email inválido. Verifique o formato.',
      'auth/operation-not-allowed': 'Cadastro não permitido. Contate o suporte.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
    };

    const message = errorMessages[error.code] || 'Erro inesperado no cadastro. Tente novamente.';
    this.toastService.error(message, 'Erro de Cadastro');
  }

  /**
   * Verifica se a sessão atual é válida
   */
  verificarSessao(): boolean {
    const usuario = this.usuarioLogado();
    const isValid = usuario !== null;

    this.loggingService.debug('Session verification', {
      isValid: isValid,
      uid: usuario?.uid,
      email: usuario?.email,
    });

    return isValid;
  }

  /**
   * Obtém informações do usuário atual para logging
   */
  obterContextoUsuario(): { uid?: string; email?: string; nome?: string } {
    const usuario = this.usuarioLogado();
    return {
      uid: usuario?.uid,
      email: usuario?.email,
      nome: usuario?.nome,
    };
  }
}
