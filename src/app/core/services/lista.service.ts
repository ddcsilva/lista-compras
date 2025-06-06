import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  runTransaction,
  arrayUnion,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { LoggingService } from './logging.service';
import { ToastService } from './toast.service';
import { BehaviorSubject } from 'rxjs';
import {
  Lista,
  ItemLista,
  NovaLista,
  NovoItemLista,
  EdicaoItemLista,
  EstatisticasLista,
} from '../../shared/models/item-lista.model';

/**
 * Serviço otimizado para gerenciar Listas de Compras no Firestore
 *
 * ARQUITETURA NOVA:
 * - Itens são armazenados como array dentro do documento da lista
 * - Uma única operação para carregar toda a lista
 * - Transações atômicas para operações com itens
 * - Performance superior e latência reduzida
 *
 * ESTRUTURA NO FIRESTORE:
 * listas/{listaId} -> {
 *   nome: string,
 *   categoria: string,
 *   criadoPor: string,
 *   dataCriacao: Timestamp,
 *   dataAtualizacao: Timestamp,
 *   itens: ItemLista[],
 *   ativa: boolean
 * }
 */
@Injectable({
  providedIn: 'root',
})
export class ListaService implements OnDestroy {
  private readonly COLLECTION_LISTAS = 'listas';

  // Injeção de dependência do Firestore
  private firestore = inject(Firestore);

  // Observables para estado reativo
  private listaAtualSubject = new BehaviorSubject<Lista | null>(null);
  public listaAtual$ = this.listaAtualSubject.asObservable();

  private listasUsuarioSubject = new BehaviorSubject<Lista[]>([]);
  public listasUsuario$ = this.listasUsuarioSubject.asObservable();

  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  // Controle de sincronização
  private unsubscribeLista: (() => void) | null = null;
  private unsubscribeListasUsuario: (() => void) | null = null;
  private currentUserId: string | null = null;
  private listaAtualId: string | null = null;

  constructor(
    private authService: AuthService,
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {
    this.inicializarListeners();
  }

  // ==========================================
  // MÉTODOS DE INICIALIZAÇÃO E LISTENERS
  // ==========================================

  /**
   * Inicializa listeners de conexão e autenticação
   */
  private inicializarListeners(): void {
    // Monitor de conexão
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
      this.sincronizarDados();
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
    });

    // Listener de autenticação
    this.authService.usuario$.subscribe(usuario => {
      const previousUserId = this.currentUserId;
      const newUserId = usuario?.uid || null;

      if (previousUserId !== newUserId) {
        this.handleUserChange(newUserId);
      }
    });
  }

  /**
   * Gerencia mudanças de usuário
   */
  private handleUserChange(newUserId: string | null): void {
    // Para todas as sincronizações atuais
    this.pararTodasSincronizacoes();

    // Limpa estado local
    this.limparEstado();

    // Atualiza o usuário atual
    this.currentUserId = newUserId;

    // Se há um novo usuário, inicia sincronização
    if (newUserId) {
      this.iniciarSincronizacaoListasUsuario(newUserId);
    }
  }

  /**
   * Inicia sincronização das listas do usuário
   */
  private iniciarSincronizacaoListasUsuario(usuarioId: string): void {
    if (!navigator.onLine) {
      return;
    }

    try {
      // Query simplificada para evitar necessidade de índice composto
      const listasQuery = query(
        collection(this.firestore, this.COLLECTION_LISTAS),
        where('criadoPor', '==', usuarioId),
        where('ativa', '==', true)
      );

      this.unsubscribeListasUsuario = onSnapshot(
        listasQuery,
        querySnapshot => {
          const listas: Lista[] = [];

          querySnapshot.forEach(doc => {
            const data = doc.data();
            const lista: Lista = {
              id: doc.id,
              nome: data['nome'],
              categoria: data['categoria'],
              criadoPor: data['criadoPor'],
              dataCriacao: data['dataCriacao']?.toDate() || new Date(),
              dataAtualizacao: data['dataAtualizacao']?.toDate() || new Date(),
              itens: this.mapearItensFirestore(data['itens'] || []),
              ativa: data['ativa'] ?? true,
              cor: data['cor'],
              compartilhadaCom: data['compartilhadaCom'] || [],
            };
            listas.push(lista);
          });

          // Ordena as listas no cliente por data de atualização (mais recente primeiro)
          listas.sort((a, b) => b.dataAtualizacao.getTime() - a.dataAtualizacao.getTime());

          this.listasUsuarioSubject.next(listas);

          // Se não há lista atual selecionada, seleciona a primeira
          if (!this.listaAtualId && listas.length > 0) {
            this.selecionarLista(listas[0].id!);
          }
        },
        error => {
          this.tratarErroSincronizacao(error);
        }
      );
    } catch (error: unknown) {
      this.loggingService.error('Failed to start user lists sync', {
        error: (error as Error).message,
        usuarioId,
      });
    }
  }

  /**
   * Inicia sincronização de uma lista específica
   */
  private iniciarSincronizacaoLista(listaId: string): void {
    if (!navigator.onLine) {
      return;
    }

    try {
      const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaId);

      this.unsubscribeLista = onSnapshot(
        listaRef,
        docSnapshot => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const lista: Lista = {
              id: docSnapshot.id,
              nome: data['nome'],
              categoria: data['categoria'],
              criadoPor: data['criadoPor'],
              dataCriacao: data['dataCriacao']?.toDate() || new Date(),
              dataAtualizacao: data['dataAtualizacao']?.toDate() || new Date(),
              itens: this.mapearItensFirestore(data['itens'] || []),
              ativa: data['ativa'] ?? true,
              cor: data['cor'],
              compartilhadaCom: data['compartilhadaCom'] || [],
            };

            this.listaAtualSubject.next(lista);
          } else {
            this.listaAtualSubject.next(null);
          }
        },
        error => {
          this.loggingService.error('List sync error', {
            error: error.message,
            code: error.code,
            listaId,
          });
          this.tratarErroSincronizacao(error);
        }
      );
    } catch (error: unknown) {
      this.loggingService.error('Failed to start list sync', {
        error: (error as Error).message,
        listaId,
      });
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - GESTÃO DE LISTAS
  // ==========================================

  /**
   * Cria uma nova lista de compras
   */
  async criarLista(novaLista: NovaLista): Promise<Lista | null> {
    const usuario = this.authService.usuario();
    if (!usuario) {
      this.toastService.error('Usuário não autenticado');
      return null;
    }

    if (!navigator.onLine) {
      this.toastService.warning('Não é possível criar lista offline');
      return null;
    }

    try {
      const agora = new Date();
      const lista: Omit<Lista, 'id'> = {
        nome: novaLista.nome.trim(),
        categoria: novaLista.categoria || 'Geral',
        criadoPor: usuario.uid,
        dataCriacao: agora,
        dataAtualizacao: agora,
        itens: [],
        ativa: true,
        cor: novaLista.cor,
        compartilhadaCom: [],
      };

      const listaRef = doc(collection(this.firestore, this.COLLECTION_LISTAS));
      await setDoc(listaRef, {
        ...lista,
        dataCriacao: Timestamp.fromDate(lista.dataCriacao),
        dataAtualizacao: Timestamp.fromDate(lista.dataAtualizacao),
      });

      const listaCriada: Lista = { ...lista, id: listaRef.id };

      this.toastService.success(`Lista "${lista.nome}" criada com sucesso!`);

      // Seleciona a nova lista automaticamente
      this.selecionarLista(listaRef.id);

      return listaCriada;
    } catch (error: unknown) {
      this.loggingService.error('Failed to create lista', {
        error: (error as Error).message,
        nome: novaLista.nome,
      });
      this.toastService.error('Erro ao criar lista');
      return null;
    }
  }

  /**
   * Seleciona uma lista como atual
   */
  selecionarLista(listaId: string): void {
    if (this.listaAtualId === listaId) {
      return; // Já selecionada
    }

    // Para sincronização da lista anterior
    if (this.unsubscribeLista) {
      this.unsubscribeLista();
      this.unsubscribeLista = null;
    }

    this.listaAtualId = listaId;
    this.iniciarSincronizacaoLista(listaId);
  }

  /**
   * Obtém uma lista por ID (operação única)
   */
  async obterListaPorId(listaId: string): Promise<Lista | null> {
    if (!navigator.onLine) {
      this.toastService.warning('Operação não disponível offline');
      return null;
    }

    try {
      const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaId);
      const docSnapshot = await getDoc(listaRef);

      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const lista: Lista = {
          id: docSnapshot.id,
          nome: data['nome'],
          categoria: data['categoria'],
          criadoPor: data['criadoPor'],
          dataCriacao: data['dataCriacao']?.toDate() || new Date(),
          dataAtualizacao: data['dataAtualizacao']?.toDate() || new Date(),
          itens: this.mapearItensFirestore(data['itens'] || []),
          ativa: data['ativa'] ?? true,
          cor: data['cor'],
          compartilhadaCom: data['compartilhadaCom'] || [],
        };

        return lista;
      } else {
        return null;
      }
    } catch (error: unknown) {
      this.loggingService.error('Failed to fetch lista', {
        error: (error as Error).message,
        listaId,
      });
      this.toastService.error('Erro ao carregar lista');
      return null;
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - GESTÃO DE ITENS
  // ==========================================

  /**
   * Adiciona um novo item à lista atual usando transação atômica
   */
  async adicionarItem(novoItem: NovoItemLista): Promise<ItemLista | null> {
    const listaAtual = this.listaAtualSubject.value;
    if (!listaAtual?.id) {
      this.toastService.error('Nenhuma lista selecionada');
      return null;
    }

    const usuario = this.authService.usuario();
    if (!usuario) {
      this.toastService.error('Usuário não autenticado');
      return null;
    }

    if (!navigator.onLine) {
      this.toastService.warning('Não é possível adicionar item offline');
      return null;
    }

    try {
      // Cria o novo item com metadados
      const item: ItemLista = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome: novoItem.nome.trim(),
        categoria: novoItem.categoria || 'Geral',
        concluido: false,
        ordem: listaAtual.itens.length,
        quantidade: novoItem.quantidade || 1,
        criadoPor: usuario.uid,
        dataAdicao: new Date(),
      };

      // Usa transação para garantir atomicidade
      await runTransaction(this.firestore, async transaction => {
        const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaAtual.id!);
        const listaSnapshot = await transaction.get(listaRef);

        if (!listaSnapshot.exists()) {
          throw new Error('Lista não encontrada');
        }

        // Adiciona o item ao array usando arrayUnion
        transaction.update(listaRef, {
          itens: arrayUnion({
            ...item,
            dataAdicao: Timestamp.fromDate(item.dataAdicao),
          }),
          dataAtualizacao: Timestamp.fromDate(new Date()),
        });
      });

      this.toastService.success(`Item "${item.nome}" adicionado!`);
      return item;
    } catch (error: unknown) {
      this.loggingService.error('Failed to add item', {
        error: (error as Error).message,
        listaId: listaAtual.id,
        nome: novoItem.nome,
      });
      this.toastService.error('Erro ao adicionar item');
      return null;
    }
  }

  /**
   * Atualiza um item existente usando transação atômica
   */
  async atualizarItem(itemId: string, edicao: EdicaoItemLista): Promise<boolean> {
    const listaAtual = this.listaAtualSubject.value;
    if (!listaAtual?.id) {
      this.toastService.error('Nenhuma lista selecionada');
      return false;
    }

    if (!navigator.onLine) {
      this.toastService.warning('Não é possível atualizar item offline');
      return false;
    }

    try {
      // Usa transação para atualizar o item no array
      await runTransaction(this.firestore, async transaction => {
        const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaAtual.id!);
        const listaSnapshot = await transaction.get(listaRef);

        if (!listaSnapshot.exists()) {
          throw new Error('Lista não encontrada');
        }

        const data = listaSnapshot.data();
        const itens = data['itens'] || [];
        const itemIndex = itens.findIndex((item: any) => item.id === itemId);

        if (itemIndex === -1) {
          throw new Error('Item não encontrado');
        }

        // Atualiza o item
        const itemAtualizado = {
          ...itens[itemIndex],
          ...edicao,
          dataAdicao: itens[itemIndex].dataAdicao, // Preserva data original
        };

        // Substitui o item no array
        itens[itemIndex] = itemAtualizado;

        transaction.update(listaRef, {
          itens: itens,
          dataAtualizacao: Timestamp.fromDate(new Date()),
        });
      });

      this.toastService.success('Item atualizado!');
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to update item', {
        error: (error as Error).message,
        listaId: listaAtual.id,
        itemId,
      });
      this.toastService.error('Erro ao atualizar item');
      return false;
    }
  }

  /**
   * Remove um item da lista usando transação atômica
   */
  async removerItem(itemId: string): Promise<boolean> {
    const listaAtual = this.listaAtualSubject.value;
    if (!listaAtual?.id) {
      this.toastService.error('Nenhuma lista selecionada');
      return false;
    }

    if (!navigator.onLine) {
      this.toastService.warning('Não é possível remover item offline');
      return false;
    }

    try {
      // Encontra o item a ser removido
      const itemParaRemover = listaAtual.itens.find(item => item.id === itemId);
      if (!itemParaRemover) {
        this.toastService.error('Item não encontrado');
        return false;
      }

      // Usa transação para remover o item
      await runTransaction(this.firestore, async transaction => {
        const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaAtual.id!);
        const listaSnapshot = await transaction.get(listaRef);

        if (!listaSnapshot.exists()) {
          throw new Error('Lista não encontrada');
        }

        const data = listaSnapshot.data();
        const itens = data['itens'] || [];
        const itensAtualizados = itens.filter((item: any) => item.id !== itemId);

        transaction.update(listaRef, {
          itens: itensAtualizados,
          dataAtualizacao: Timestamp.fromDate(new Date()),
        });
      });

      this.toastService.success(`Item "${itemParaRemover.nome}" removido!`);
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to remove item', {
        error: (error as Error).message,
        listaId: listaAtual.id,
        itemId,
      });
      this.toastService.error('Erro ao remover item');
      return false;
    }
  }

  /**
   * Remove todos os itens concluídos da lista
   */
  async removerItensConcluidos(): Promise<boolean> {
    const listaAtual = this.listaAtualSubject.value;
    if (!listaAtual?.id) {
      this.toastService.error('Nenhuma lista selecionada');
      return false;
    }

    const itensConcluidos = listaAtual.itens.filter(item => item.concluido);
    if (itensConcluidos.length === 0) {
      this.toastService.info('Nenhum item concluído para remover');
      return true;
    }

    if (!navigator.onLine) {
      this.toastService.warning('Não é possível remover itens offline');
      return false;
    }

    try {
      // Usa transação para remover todos os itens concluídos
      await runTransaction(this.firestore, async transaction => {
        const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaAtual.id!);
        const listaSnapshot = await transaction.get(listaRef);

        if (!listaSnapshot.exists()) {
          throw new Error('Lista não encontrada');
        }

        const data = listaSnapshot.data();
        const itens = data['itens'] || [];
        const itensRestantes = itens.filter((item: any) => !item.concluido);

        transaction.update(listaRef, {
          itens: itensRestantes,
          dataAtualizacao: Timestamp.fromDate(new Date()),
        });
      });

      this.toastService.success(`${itensConcluidos.length} itens concluídos removidos!`);
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to remove completed items', {
        error: (error as Error).message,
        listaId: listaAtual.id,
        count: itensConcluidos.length,
      });
      this.toastService.error('Erro ao remover itens concluídos');
      return false;
    }
  }

  /**
   * Arquiva uma lista (marca como inativa)
   */
  async arquivarLista(listaId: string): Promise<boolean> {
    if (!navigator.onLine) {
      this.toastService.warning('Não é possível arquivar lista offline');
      return false;
    }

    try {
      const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaId);
      await updateDoc(listaRef, {
        ativa: false,
        dataAtualizacao: Timestamp.fromDate(new Date()),
      });

      this.toastService.success('Lista arquivada!');
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to archive lista', {
        error: (error as Error).message,
        listaId,
      });
      this.toastService.error('Erro ao arquivar lista');
      return false;
    }
  }

  /**
   * Remove uma lista permanentemente
   */
  async removerLista(listaId: string): Promise<boolean> {
    if (!navigator.onLine) {
      this.toastService.warning('Não é possível remover lista offline');
      return false;
    }

    try {
      const listaRef = doc(this.firestore, this.COLLECTION_LISTAS, listaId);
      await deleteDoc(listaRef);

      // Se era a lista atual, limpa a seleção
      if (this.listaAtualId === listaId) {
        this.listaAtualId = null;
        this.listaAtualSubject.next(null);
      }

      this.toastService.success('Lista removida permanentemente!');
      return true;
    } catch (error: unknown) {
      this.loggingService.error('Failed to delete lista', {
        error: (error as Error).message,
        listaId,
      });
      this.toastService.error('Erro ao remover lista');
      return false;
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - ESTATÍSTICAS E UTILITÁRIOS
  // ==========================================

  /**
   * Obtém estatísticas da lista atual
   */
  obterEstatisticas(): EstatisticasLista | null {
    const listaAtual = this.listaAtualSubject.value;
    if (!listaAtual) {
      return null;
    }

    const itensConcluidos = listaAtual.itens.filter(item => item.concluido).length;
    const totalItens = listaAtual.itens.length;
    const categorias = [...new Set(listaAtual.itens.map(item => item.categoria))];

    return {
      totalItens,
      itensConcluidos,
      itensRestantes: totalItens - itensConcluidos,
      percentualConcluido: totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0,
      categorias,
      ultimaAtualizacao: listaAtual.dataAtualizacao,
    };
  }

  // ==========================================
  // MÉTODOS AUXILIARES E UTILITÁRIOS
  // ==========================================

  /**
   * Mapeia itens do Firestore para a interface local
   */
  private mapearItensFirestore(itensFirestore: any[]): ItemLista[] {
    return itensFirestore.map(item => ({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      concluido: item.concluido,
      ordem: item.ordem,
      quantidade: item.quantidade,
      criadoPor: item.criadoPor,
      dataAdicao: item.dataAdicao?.toDate ? item.dataAdicao.toDate() : new Date(item.dataAdicao),
    }));
  }

  /**
   * Para todas as sincronizações ativas
   */
  private pararTodasSincronizacoes(): void {
    if (this.unsubscribeLista) {
      this.unsubscribeLista();
      this.unsubscribeLista = null;
    }

    if (this.unsubscribeListasUsuario) {
      this.unsubscribeListasUsuario();
      this.unsubscribeListasUsuario = null;
    }

    this.currentUserId = null;
    this.listaAtualId = null;
  }

  /**
   * Limpa o estado local
   */
  private limparEstado(): void {
    this.listaAtualSubject.next(null);
    this.listasUsuarioSubject.next([]);
  }

  /**
   * Trata erros de sincronização
   */
  private tratarErroSincronizacao(error: any): void {
    // Não exibe erros se usuário não está autenticado (durante logout)
    const usuario = this.authService.usuario();
    if (!usuario) {
      return;
    }

    // Erro específico de permissões
    if (error.code === 'permission-denied') {
      this.toastService.error(
        'Erro de permissão no Firestore. Verifique as regras de segurança.',
        'Erro de Sincronização'
      );
    } else if (error.code === 'unavailable') {
      this.toastService.warning('Serviço temporariamente indisponível');
    } else {
      this.toastService.error('Erro ao sincronizar dados', 'Conexão');
    }
  }

  /**
   * Sincroniza dados quando volta online
   */
  private async sincronizarDados(): Promise<void> {
    const usuario = this.authService.usuario();
    if (!usuario) return;

    try {
      // Reinicia sincronização das listas do usuário
      this.pararTodasSincronizacoes();
      this.iniciarSincronizacaoListasUsuario(usuario.uid);
      this.toastService.success('Dados sincronizados', 'Online');
    } catch (error: unknown) {
      this.loggingService.error('Sync failed', {
        error: (error as Error).message,
        usuarioId: usuario.uid,
      });
    }
  }

  /**
   * Cleanup ao destruir o service
   */
  ngOnDestroy(): void {
    this.pararTodasSincronizacoes();
  }
}
