import { Injectable, signal, computed } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { ItemLista, NovoItemLista, EdicaoItemLista } from '../../../shared/models/item-lista.model';

/**
 * Serviço responsável por gerenciar os itens da lista de compras
 * Implementa operações CRUD com persistência no localStorage
 * Usa signals para reatividade
 * Otimizado com computed signals para melhor performance
 */
@Injectable({
  providedIn: 'root',
})
export class ListaService {
  private readonly STORAGE_KEY = 'vai-na-lista-itens';

  // Signal que contém todos os itens da lista
  private itens = signal<ItemLista[]>([]);

  // Computed signals para melhor performance (cached e reativo)
  readonly itensLista = computed(() => this.itens());
  readonly totalItens = computed(() => this.itens().length);
  readonly itensConcluidos = computed(() => this.itens().filter(item => item.concluido).length);
  readonly itensRestantes = computed(() => this.totalItens() - this.itensConcluidos());

  constructor(private storageService: StorageService) {
    this.carregarItens();
  }

  /**
   * Carrega os itens salvos no localStorage
   */
  private carregarItens(): void {
    const itensSalvos = this.storageService.getItem<ItemLista[]>(this.STORAGE_KEY);
    if (itensSalvos) {
      // Converte strings de data de volta para objetos Date
      const itensComData = itensSalvos.map(item => ({
        ...item,
        dataAtualizacao: new Date(item.dataAtualizacao),
      }));
      this.itens.set(itensComData);
    }
  }

  /**
   * Salva os itens no localStorage
   */
  private salvarItens(): void {
    this.storageService.setItem(this.STORAGE_KEY, this.itens());
  }

  /**
   * Adiciona um novo item à lista
   * @param novoItem Dados do novo item
   * @returns O item criado com ID gerado
   */
  adicionarItem(novoItem: NovoItemLista): ItemLista {
    const item: ItemLista = {
      id: this.gerarId(),
      descricao: novoItem.descricao.trim(),
      quantidade: novoItem.quantidade,
      concluido: false,
      dataAtualizacao: new Date(),
    };

    const itensAtuais = this.itens();
    this.itens.set([...itensAtuais, item]);
    this.salvarItens();

    return item;
  }

  /**
   * Edita um item existente
   * @param id ID do item a ser editado
   * @param edicao Dados a serem atualizados
   * @returns true se o item foi editado, false se não encontrado
   */
  editarItem(id: string, edicao: EdicaoItemLista): boolean {
    const itensAtuais = this.itens();
    const indice = itensAtuais.findIndex(item => item.id === id);

    if (indice === -1) {
      return false;
    }

    const itemAtualizado: ItemLista = {
      ...itensAtuais[indice],
      ...edicao,
      dataAtualizacao: new Date(),
    };

    // Se editando descrição, fazer trim
    if (edicao.descricao !== undefined) {
      itemAtualizado.descricao = edicao.descricao.trim();
    }

    const novosItens = [...itensAtuais];
    novosItens[indice] = itemAtualizado;

    this.itens.set(novosItens);
    this.salvarItens();

    return true;
  }

  /**
   * Remove um item da lista
   * @param id ID do item a ser removido
   * @returns true se o item foi removido, false se não encontrado
   */
  removerItem(id: string): boolean {
    const itensAtuais = this.itens();
    const novosItens = itensAtuais.filter(item => item.id !== id);

    if (novosItens.length === itensAtuais.length) {
      return false; // Item não encontrado
    }

    this.itens.set(novosItens);
    this.salvarItens();

    return true;
  }

  /**
   * Marca/desmarca um item como concluído
   * @param id ID do item
   * @param concluido Novo status de conclusão
   * @returns true se alterado com sucesso
   */
  marcarConcluido(id: string, concluido: boolean): boolean {
    return this.editarItem(id, { concluido });
  }

  /**
   * Busca um item pelo ID
   * @param id ID do item
   * @returns O item encontrado ou undefined
   */
  buscarPorId(id: string): ItemLista | undefined {
    return this.itens().find(item => item.id === id);
  }

  /**
   * Limpa todos os itens da lista
   */
  limparLista(): void {
    this.itens.set([]);
    this.storageService.removeItem(this.STORAGE_KEY);
  }

  /**
   * Remove todos os itens concluídos
   */
  removerConcluidos(): void {
    const itensAtivos = this.itens().filter(item => !item.concluido);
    this.itens.set(itensAtivos);
    this.salvarItens();
  }

  /**
   * Gera um ID único para novos itens
   * Usa timestamp + random para garantir unicidade
   */
  private gerarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
