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
import { doc, setDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.config';
import { StorageService } from './storage.service';
import { LoggingService } from './logging.service';
import { ToastService } from './toast.service';
import { UsuarioBasico } from '../../shared/models/usuario.model';
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
 * ESTENDIDO para criar automaticamente documentos na coleção 'usuarios'
 * Sincroniza dados entre Firebase Auth e Firestore
 * Garante que todos usuários podem ser encontrados via busca por email
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly STORAGE_KEY = 'vai-na-lista-usuario';
  private readonly COLLECTION_USUARIOS = 'usuarios';
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
   * ESTENDIDO para criar/atualizar documento do usuário no Firestore
   */
  private inicializarAuth(): void {
    onAuthStateChanged(auth, async firebaseUser => {
      this.carregandoAuth.set(false);

      if (firebaseUser) {
        // NOVO: Criar/atualizar documento no Firestore
        await this.criarOuAtualizarUsuarioFirestore(firebaseUser);

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
   * NOVO: Cria ou atualiza documento do usuário no Firestore
   * Garante que usuário pode ser encontrado via busca por email
   */
  private async criarOuAtualizarUsuarioFirestore(firebaseUser: User): Promise<void> {
    try {
      const userDocRef = doc(db, this.COLLECTION_USUARIOS, firebaseUser.uid);

      // Verifica se documento já existe
      const userDocSnap = await getDoc(userDocRef);

      // Prepara dados do usuário
      const dadosUsuario: Omit<UsuarioBasico, 'uid'> & {
        provider: string;
        atualizadoEm: any;
        criadoEm?: any;
      } = {
        email: firebaseUser.email || '',
        nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        photoURL: firebaseUser.photoURL || undefined,
        provider: firebaseUser.providerData[0]?.providerId || 'password',
        atualizadoEm: serverTimestamp(),
      };

      if (userDocSnap.exists()) {
        // ATUALIZAR: Documento existe, atualizar dados
        await setDoc(userDocRef, dadosUsuario, { merge: true });

        this.loggingService.info('Documento do usuário atualizado no Firestore', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          existiaAntes: true,
        });
      } else {
        // CRIAR: Documento não existe, criar novo
        await setDoc(userDocRef, {
          ...dadosUsuario,
          criadoEm: serverTimestamp(),
        });

        this.loggingService.info('Novo documento criado no Firestore', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          nome: dadosUsuario.nome,
          provider: dadosUsuario.provider,
        });

        // Toast de boas-vindas para novos usuários
        this.toastService.success(`Perfil criado com sucesso! Bem-vindo, ${dadosUsuario.nome}!`, 'Conta Configurada');
      }
    } catch (error: unknown) {
      // IMPORTANTE: Erro na criação do documento NÃO deve impedir o login
      this.loggingService.error('Erro ao criar/atualizar documento do usuário no Firestore', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        error: (error as Error).message,
      });

      // Não mostra toast de erro para não assustar o usuário
      // O login continua funcionando mesmo se o Firestore falhar
      console.warn('⚠️ Firestore sync failed, but login will continue:', error);
    }
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
   * ESTENDIDO para sincronizar dados com Firestore
   */
  async loginEmailSenha(loginData: LoginData): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('Email login attempt started', {
        email: loginData.email,
      });

      const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.senha);

      // NOVO: Dados já são sincronizados automaticamente via onAuthStateChanged

      const duration = Date.now() - startTime;

      this.loggingService.info('Email login successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        duration: `${duration}ms`,
        firestoreSync: true,
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
   * ESTENDIDO para sincronizar dados com Firestore
   */
  async loginGoogle(): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('Google login attempt started');

      const userCredential = await signInWithPopup(auth, this.googleProvider);

      // NOVO: Dados já são sincronizados automaticamente via onAuthStateChanged

      const duration = Date.now() - startTime;

      this.loggingService.info('Google login successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        duration: `${duration}ms`,
        firestoreSync: true,
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
   * ESTENDIDO para criar documento no Firestore automaticamente
   */
  async cadastrar(cadastroData: CadastroData): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.loggingService.info('User registration attempt started', {
        email: cadastroData.email,
        nome: cadastroData.nome,
      });

      // Cria usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cadastroData.email, cadastroData.senha);

      // Atualiza perfil com nome
      await updateProfile(userCredential.user, {
        displayName: cadastroData.nome,
      });

      // NOVO: Documento no Firestore é criado automaticamente via onAuthStateChanged
      // que detecta a mudança e chama criarOuAtualizarUsuarioFirestore()

      const duration = Date.now() - startTime;

      this.loggingService.info('User registration successful', {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        nome: cadastroData.nome,
        duration: `${duration}ms`,
        firestoreSync: true,
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
   * NOVO: Força sincronização do usuário atual com Firestore
   * Útil para casos onde o documento foi perdido ou corrompido
   */
  async forcarSincronizacaoFirestore(): Promise<boolean> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      this.loggingService.warn('Tentativa de sincronização sem usuário logado');
      return false;
    }

    try {
      await this.criarOuAtualizarUsuarioFirestore(currentUser);
      this.toastService.success('Dados sincronizados com sucesso!', 'Sincronização');
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Erro na sincronização forçada', {
        uid: currentUser.uid,
        error: (error as Error).message,
      });
      this.toastService.error('Erro na sincronização dos dados', 'Erro');
      return false;
    }
  }

  /**
   * NOVO: Verifica se documento do usuário existe no Firestore
   * Útil para debugging e validação
   */
  async verificarDocumentoFirestore(): Promise<{ existe: boolean; dados?: any }> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return { existe: false };
    }

    try {
      const userDocRef = doc(db, this.COLLECTION_USUARIOS, currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        return {
          existe: true,
          dados: userDocSnap.data(),
        };
      } else {
        return { existe: false };
      }
    } catch (error: unknown) {
      this.loggingService.error('Erro ao verificar documento no Firestore', {
        uid: currentUser.uid,
        error: (error as Error).message,
      });
      return { existe: false };
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
