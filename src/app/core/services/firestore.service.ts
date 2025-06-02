import { Injectable, OnDestroy } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.config';
import { AuthService } from './auth.service';
import { LoggingService } from './logging.service';
import { ToastService } from './toast.service';
import { BehaviorSubject } from 'rxjs';

export interface ItemLista {
  id?: string;
  descricao: string;
  quantidade: number;
  concluido: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  usuarioId: string;
}

export interface ListaUsuario {
  id?: string;
  nome: string;
  itens: ItemLista[];
  criadaEm: Date;
  atualizadaEm: Date;
  usuarioId: string;
}

/**
 * Serviço para gerenciar dados no Firebase Firestore
 * Implementa CRUD completo para listas de compras
 * Sincronização em tempo real com observables
 * Tratamento de erros e logging integrado
 */
@Injectable({
  providedIn: 'root',
})
export class FirestoreService implements OnDestroy {
  private readonly COLLECTION_LISTAS = 'listas';
  private readonly COLLECTION_ITENS = 'itens';

  private itensSubject = new BehaviorSubject<ItemLista[]>([]);
  public itens$ = this.itensSubject.asObservable();

  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  private unsubscribeItens: (() => void) | null = null;
  private currentUserId: string | null = null;

  constructor(
    private authService: AuthService,
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {
    this.inicializarListeners();
  }

  /**
   * Inicializa listeners de conexão e autenticação
   */
  private inicializarListeners(): void {
    // Monitor de conexão
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
      this.loggingService.info('Connection restored');
      this.sincronizarDados();
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
      this.loggingService.warn('Connection lost - working offline');
    });

    // Listener de autenticação com proteção contra loops
    this.authService.usuario$.subscribe(usuario => {
      const novoUsuarioId = usuario?.uid || null;

      // Evita reprocessar o mesmo usuário
      if (this.currentUserId === novoUsuarioId) {
        return;
      }

      this.loggingService.info('FirestoreService: User state changed', {
        previousUserId: this.currentUserId,
        newUserId: novoUsuarioId,
        hasUser: !!usuario,
        email: usuario?.email,
      });

      // Atualiza usuário atual
      this.currentUserId = novoUsuarioId;

      if (usuario) {
        // Para sincronização anterior se houver
        this.pararSincronizacao();
        // Inicia nova sincronização
        this.iniciarSincronizacao(usuario.uid);
      } else {
        this.pararSincronizacao();
      }
    });
  }

  /**
   * Inicia sincronização em tempo real dos itens do usuário
   */
  private iniciarSincronizacao(usuarioId: string): void {
    // Proteção contra sincronização duplicada
    if (this.unsubscribeItens && this.currentUserId === usuarioId) {
      this.loggingService.debug('Sync already active for user', { usuarioId });
      return;
    }

    this.loggingService.info('Starting Firestore sync', {
      usuarioId,
      isOnline: navigator.onLine,
    });

    if (!navigator.onLine) {
      this.loggingService.warn('Offline - skipping Firestore sync');
      return;
    }

    try {
      const itensQuery = query(
        collection(db, this.COLLECTION_ITENS),
        where('usuarioId', '==', usuarioId),
        orderBy('criadoEm', 'desc')
      );

      this.unsubscribeItens = onSnapshot(
        itensQuery,
        querySnapshot => {
          const itens: ItemLista[] = [];

          querySnapshot.forEach(doc => {
            const data = doc.data();
            itens.push({
              id: doc.id,
              descricao: data['descricao'],
              quantidade: data['quantidade'],
              concluido: data['concluido'],
              criadoEm: data['criadoEm']?.toDate() || new Date(),
              atualizadoEm: data['atualizadoEm']?.toDate() || new Date(),
              usuarioId: data['usuarioId'],
            });
          });

          this.loggingService.debug('Firestore sync completed', {
            itensCount: itens.length,
            usuarioId,
          });

          this.itensSubject.next(itens);
        },
        error => {
          this.loggingService.error('Firestore sync error', {
            error: error.message,
            code: error.code,
            usuarioId,
          });

          // Erro específico de permissões
          if (error.code === 'permission-denied') {
            this.toastService.error(
              'Erro de permissão no Firestore. Verifique as regras de segurança.',
              'Erro de Sincronização'
            );
          } else {
            this.toastService.error('Erro ao sincronizar dados', 'Conexão');
          }
        }
      );
    } catch (error: unknown) {
      this.loggingService.error('Failed to start Firestore sync', {
        error: (error as Error).message,
        usuarioId,
      });
    }
  }

  /**
   * Para a sincronização em tempo real
   */
  private pararSincronizacao(): void {
    if (this.unsubscribeItens) {
      this.unsubscribeItens();
      this.unsubscribeItens = null;
    }
    this.currentUserId = null;
    this.itensSubject.next([]);
    this.loggingService.info('Firestore sync stopped');
  }

  /**
   * Adiciona um novo item
   */
  async adicionarItem(descricao: string, quantidade: number): Promise<ItemLista | null> {
    const usuario = this.authService.usuario();
    if (!usuario) {
      this.toastService.error('Usuário não autenticado');
      return null;
    }

    const novoItem: Omit<ItemLista, 'id'> = {
      descricao: descricao.trim(),
      quantidade,
      concluido: false,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      usuarioId: usuario.uid,
    };

    try {
      if (navigator.onLine) {
        const docRef = await addDoc(collection(db, this.COLLECTION_ITENS), {
          ...novoItem,
          criadoEm: Timestamp.fromDate(novoItem.criadoEm),
          atualizadoEm: Timestamp.fromDate(novoItem.atualizadoEm),
        });

        const itemComId: ItemLista = { ...novoItem, id: docRef.id };

        this.loggingService.info('Item added to Firestore', {
          itemId: docRef.id,
          descricao,
          quantidade,
        });

        return itemComId;
      } else {
        // Offline - adiciona localmente (será sincronizado depois)
        const itemId = `temp_${Date.now()}`;
        const itemComId: ItemLista = { ...novoItem, id: itemId };

        // Atualiza subject local
        const itensAtuais = this.itensSubject.value;
        this.itensSubject.next([itemComId, ...itensAtuais]);

        this.loggingService.info('Item added offline', { itemId, descricao });
        this.toastService.warning('Item salvo offline - será sincronizado quando conectar');

        return itemComId;
      }
    } catch (error: unknown) {
      this.loggingService.error('Failed to add item', {
        error: (error as Error).message,
        descricao,
        quantidade,
      });
      this.toastService.error('Erro ao adicionar item');
      return null;
    }
  }

  /**
   * Atualiza um item existente
   */
  async atualizarItem(item: ItemLista): Promise<boolean> {
    if (!item.id || !navigator.onLine) {
      this.loggingService.warn('Cannot update item - offline or no ID', {
        hasId: !!item.id,
        isOnline: navigator.onLine,
      });
      return false;
    }

    try {
      const itemRef = doc(db, this.COLLECTION_ITENS, item.id);
      await updateDoc(itemRef, {
        descricao: item.descricao,
        quantidade: item.quantidade,
        concluido: item.concluido,
        atualizadoEm: Timestamp.fromDate(new Date()),
      });

      this.loggingService.info('Item updated in Firestore', {
        itemId: item.id,
        descricao: item.descricao,
        concluido: item.concluido,
      });

      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to update item', {
        error: (error as Error).message,
        itemId: item.id,
      });
      this.toastService.error('Erro ao atualizar item');
      return false;
    }
  }

  /**
   * Remove um item
   */
  async removerItem(itemId: string): Promise<boolean> {
    if (!navigator.onLine) {
      this.loggingService.warn('Cannot delete item - offline');
      this.toastService.warning('Não é possível deletar offline');
      return false;
    }

    try {
      const itemRef = doc(db, this.COLLECTION_ITENS, itemId);
      await deleteDoc(itemRef);

      this.loggingService.info('Item deleted from Firestore', { itemId });
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to delete item', {
        error: (error as Error).message,
        itemId,
      });
      this.toastService.error('Erro ao remover item');
      return false;
    }
  }

  /**
   * Remove todos os itens concluídos
   */
  async removerItensConcluidos(): Promise<boolean> {
    const itens = this.itensSubject.value;
    const itensConcluidos = itens.filter(item => item.concluido);

    if (itensConcluidos.length === 0) {
      this.toastService.info('Nenhum item concluído para remover');
      return true;
    }

    if (!navigator.onLine) {
      this.toastService.warning('Não é possível deletar offline');
      return false;
    }

    try {
      const promises = itensConcluidos.map(item => (item.id ? this.removerItem(item.id) : Promise.resolve(false)));

      const resultados = await Promise.all(promises);
      const sucessos = resultados.filter(Boolean).length;

      this.loggingService.info('Bulk delete completed', {
        total: itensConcluidos.length,
        sucessos,
      });

      if (sucessos === itensConcluidos.length) {
        this.toastService.success(`${sucessos} itens concluídos removidos`);
        return true;
      } else {
        this.toastService.warning(`${sucessos}/${itensConcluidos.length} itens removidos`);
        return false;
      }
    } catch (error: unknown) {
      this.loggingService.error('Bulk delete failed', {
        error: (error as Error).message,
        count: itensConcluidos.length,
      });
      this.toastService.error('Erro ao remover itens concluídos');
      return false;
    }
  }

  /**
   * Sincroniza dados quando volta online
   */
  private async sincronizarDados(): Promise<void> {
    const usuario = this.authService.usuario();
    if (!usuario) return;

    try {
      // Reinicia sincronização
      this.iniciarSincronizacao(usuario.uid);
      this.toastService.success('Dados sincronizados', 'Online');
    } catch (error: unknown) {
      this.loggingService.error('Sync failed', {
        error: (error as Error).message,
        usuarioId: usuario.uid,
      });
    }
  }

  /**
   * Obtém estatísticas dos itens
   */
  obterEstatisticas(): { total: number; concluidos: number; pendentes: number } {
    const itens = this.itensSubject.value;
    const concluidos = itens.filter(item => item.concluido).length;

    return {
      total: itens.length,
      concluidos,
      pendentes: itens.length - concluidos,
    };
  }

  /**
   * Cleanup ao destruir o service
   */
  ngOnDestroy(): void {
    this.pararSincronizacao();
  }
}
