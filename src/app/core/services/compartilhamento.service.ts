import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Firestore,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  Timestamp,
  writeBatch,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import {
  ConvitePendente,
  MembroLista,
  PermissaoMembro,
  StatusConvite,
} from '../../shared/models/compartilhamento.model';
import { Lista } from '../../shared/models/item-lista.model';
import { UsuarioService } from './usuario.service';
import { ListaService } from './lista.service';
import { ToastService } from './toast.service';
import { LoggingService } from './logging.service';

@Injectable({ providedIn: 'root' })
export class CompartilhamentoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private usuarioService = inject(UsuarioService);
  private listaService = inject(ListaService);
  private toastService = inject(ToastService);
  private loggingService = inject(LoggingService);

  // Estado reativo
  private convitesPendentesSignal = signal<ConvitePendente[]>([]);
  readonly convitesPendentes = computed(() => this.convitesPendentesSignal());
  readonly totalConvitesPendentes = computed(() => this.convitesPendentesSignal().length);

  private unsubscribeConvites?: () => void;

  constructor() {
    // Iniciar monitoramento de convites quando usuário logar
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.monitorarConvitesPendentes();
      } else {
        this.limparMonitoramento();
      }
    });
  }

  /**
   * Compartilha uma lista com outro usuário por email
   */
  async compartilharLista(
    listaId: string,
    email: string,
    permissao: PermissaoMembro = PermissaoMembro.EDITOR
  ): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');

      // 1. Buscar usuário pelo email
      const resultadoBusca = await this.usuarioService.buscarUsuarioPorEmail(email);
      if (!resultadoBusca.encontrado || !resultadoBusca.usuario) {
        this.toastService.error('Usuário não encontrado com este email');
        return false;
      }

      const usuarioConvidado = resultadoBusca.usuario;

      // 2. Buscar dados da lista
      const listaDoc = await getDoc(doc(this.firestore, 'listas', listaId));
      if (!listaDoc.exists()) {
        this.toastService.error('Lista não encontrada');
        return false;
      }

      const listaData = listaDoc.data() as Lista;

      // 3. Verificar se já é membro
      if (listaData.membros?.some(m => m.uid === usuarioConvidado.uid)) {
        this.toastService.warning('Este usuário já é membro da lista');
        return false;
      }

      // 4. Verificar se já tem convite pendente
      if (listaData.convitesPendentes?.some(c => c.email === email && c.status === StatusConvite.PENDENTE)) {
        this.toastService.warning('Já existe um convite pendente para este usuário');
        return false;
      }

      // 5. Criar convite
      const convite: ConvitePendente = {
        id: this.gerarIdConvite(),
        email: usuarioConvidado.email,
        listaId,
        nomeLista: listaData.nome,
        convidadoPor: currentUser.uid,
        nomeConvidadoPor: currentUser.displayName || 'Usuário',
        dataConvite: new Date(),
        dataExpiracao: this.calcularDataExpiracao(7), // 7 dias
        status: StatusConvite.PENDENTE,
        permissaoOferecida: permissao,
      };

      // 6. Usar batch para operações atômicas
      const batch = writeBatch(this.firestore);

      // Adicionar convite na lista
      const listaRef = doc(this.firestore, 'listas', listaId);
      batch.update(listaRef, {
        convitesPendentes: arrayUnion(convite),
        tipoLista: 'compartilhada',
      });

      // Criar/atualizar índice de convites do usuário
      const conviteUsuarioRef = doc(this.firestore, 'convites_usuario', usuarioConvidado.uid);
      batch.set(
        conviteUsuarioRef,
        {
          convitesPendentes: arrayUnion({
            listaId,
            nomeLista: listaData.nome,
            convidadoPor: currentUser.uid,
            nomeConvidadoPor: currentUser.displayName || 'Usuário',
            dataConvite: Timestamp.fromDate(convite.dataConvite),
            dataExpiracao: Timestamp.fromDate(convite.dataExpiracao),
          }),
        },
        { merge: true }
      );

      await batch.commit();

      this.toastService.success(`Convite enviado para ${usuarioConvidado.nome}`);
      return true;
    } catch (error) {
      this.loggingService.error('Erro ao compartilhar lista:', { error: (error as Error).message });
      this.toastService.error('Erro ao enviar convite');
      return false;
    }
  }

  /**
   * Aceita um convite para participar de uma lista
   */
  async aceitarConvite(listaId: string): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');

      // 1. Buscar lista e convite
      const listaDoc = await getDoc(doc(this.firestore, 'listas', listaId));
      if (!listaDoc.exists()) {
        this.toastService.error('Lista não encontrada');
        return false;
      }

      const listaData = listaDoc.data() as Lista;
      const convite = listaData.convitesPendentes?.find(
        c => c.email === currentUser.email && c.status === StatusConvite.PENDENTE
      );

      if (!convite) {
        this.toastService.error('Convite não encontrado ou expirado');
        return false;
      }

      // 2. Criar membro
      const novoMembro: MembroLista = {
        uid: currentUser.uid,
        email: currentUser.email!,
        nome: currentUser.displayName || 'Usuário',
        photoURL: currentUser.photoURL || undefined,
        permissao: convite.permissaoOferecida,
        dataEntrada: new Date(),
        adicionadoPor: convite.convidadoPor,
      };

      // 3. Atualizar convite
      const conviteAtualizado = { ...convite, status: StatusConvite.ACEITO };

      // 4. Batch de operações
      const batch = writeBatch(this.firestore);

      // Atualizar lista
      const listaRef = doc(this.firestore, 'listas', listaId);
      batch.update(listaRef, {
        membros: arrayUnion(novoMembro),
        convitesPendentes: arrayRemove(convite),
      });
      batch.update(listaRef, {
        convitesPendentes: arrayUnion(conviteAtualizado),
      });

      // Remover do índice de convites
      const conviteUsuarioRef = doc(this.firestore, 'convites_usuario', currentUser.uid);
      const conviteIndex = listaData.convitesPendentes?.find(c => c.listaId === listaId);
      if (conviteIndex) {
        batch.update(conviteUsuarioRef, {
          convitesPendentes: arrayRemove(conviteIndex),
        });
      }

      await batch.commit();

      this.toastService.success('Convite aceito! Você agora é membro da lista');
      return true;
    } catch (error) {
      this.loggingService.error('Erro ao aceitar convite:', { error: (error as Error).message });
      this.toastService.error('Erro ao aceitar convite');
      return false;
    }
  }

  /**
   * Rejeita um convite para participar de uma lista
   */
  async rejeitarConvite(listaId: string): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');

      // 1. Buscar lista e convite
      const listaDoc = await getDoc(doc(this.firestore, 'listas', listaId));
      if (!listaDoc.exists()) {
        this.toastService.error('Lista não encontrada');
        return false;
      }

      const listaData = listaDoc.data() as Lista;
      const convite = listaData.convitesPendentes?.find(
        c => c.email === currentUser.email && c.status === StatusConvite.PENDENTE
      );

      if (!convite) {
        this.toastService.error('Convite não encontrado');
        return false;
      }

      // 2. Atualizar convite
      const conviteAtualizado = { ...convite, status: StatusConvite.REJEITADO };

      // 3. Batch de operações
      const batch = writeBatch(this.firestore);

      // Atualizar lista
      const listaRef = doc(this.firestore, 'listas', listaId);
      batch.update(listaRef, {
        convitesPendentes: arrayRemove(convite),
      });
      batch.update(listaRef, {
        convitesPendentes: arrayUnion(conviteAtualizado),
      });

      // Remover do índice de convites
      const conviteUsuarioRef = doc(this.firestore, 'convites_usuario', currentUser.uid);
      const conviteIndex = listaData.convitesPendentes?.find(c => c.listaId === listaId);
      if (conviteIndex) {
        batch.update(conviteUsuarioRef, {
          convitesPendentes: arrayRemove(conviteIndex),
        });
      }

      await batch.commit();

      this.toastService.info('Convite rejeitado');
      return true;
    } catch (error) {
      this.loggingService.error('Erro ao rejeitar convite:', { error: (error as Error).message });
      this.toastService.error('Erro ao rejeitar convite');
      return false;
    }
  }

  /**
   * Monitora convites pendentes do usuário em tempo real
   */
  private monitorarConvitesPendentes(): void {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    // Limpar monitoramento anterior
    this.limparMonitoramento();

    // Buscar convites onde o email do usuário está nos convites pendentes
    const q = query(
      collection(this.firestore, 'listas'),
      where('convitesPendentes', 'array-contains-any', [{ email: currentUser.email, status: StatusConvite.PENDENTE }])
    );

    // Alternativa: usar índice de convites_usuario
    const conviteUsuarioRef = doc(this.firestore, 'convites_usuario', currentUser.uid);

    this.unsubscribeConvites = onSnapshot(conviteUsuarioRef, snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const convites = data['convitesPendentes'] || [];

        // Converter para formato esperado
        this.convitesPendentesSignal.set(
          convites.map((c: any) => ({
            ...c,
            dataConvite: c.dataConvite?.toDate() || new Date(),
            dataExpiracao: c.dataExpiracao?.toDate() || new Date(),
          }))
        );
      } else {
        this.convitesPendentesSignal.set([]);
      }
    });
  }

  /**
   * Limpa monitoramento de convites
   */
  private limparMonitoramento(): void {
    if (this.unsubscribeConvites) {
      this.unsubscribeConvites();
      this.unsubscribeConvites = undefined;
    }
    this.convitesPendentesSignal.set([]);
  }

  /**
   * Gera ID único para convite
   */
  private gerarIdConvite(): string {
    return `convite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calcula data de expiração
   */
  private calcularDataExpiracao(dias: number): Date {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return data;
  }

  /**
   * Cleanup
   */
  ngOnDestroy(): void {
    this.limparMonitoramento();
  }
}
