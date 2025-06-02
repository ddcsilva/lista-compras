import { Component, signal, computed, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { FirestoreService, ItemLista } from '../../../core/services/firestore.service';
import { LoggingService } from '../../../core/services/logging.service';
import { ToastService } from '../../../core/services/toast.service';
import { Subscription } from 'rxjs';

/**
 * Componente standalone para gerenciar a lista de compras
 * Implementa CRUD de itens com Firestore + backup offline
 * Otimizado com computed signals e OnPush para máxima performance
 */
@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista.component.html',
})
export class ListaComponent implements OnDestroy {
  formularioItem: FormGroup;

  // Signals para gerenciar estado do componente
  private itensFirestore = signal<ItemLista[]>([]);
  modoEdicao = signal<string | null>(null);
  isCarregando = signal(false);
  mostrarConcluidos = signal(true);
  erroCarregamento = signal<string | null>(null);
  tentativaReconexao = signal(false);
  isOnline = signal(navigator.onLine);

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Computed signals para melhor performance (cached e reativo)
  readonly usuario = computed(() => this.authService.usuario());
  readonly itens = computed(() => this.itensFirestore());
  readonly totalItens = computed(() => this.itens().length);
  readonly itensConcluidos = computed(() => this.itens().filter(item => item.concluido).length);
  readonly itensRestantes = computed(() => this.itens().filter(item => !item.concluido).length);

  // Computed para filtrar itens baseado na preferência de visualização
  readonly itensVisiveis = computed(() => {
    const todosItens = this.itens();
    if (this.mostrarConcluidos()) {
      return todosItens;
    }
    return todosItens.filter(item => !item.concluido);
  });

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private firestoreService: FirestoreService,
    private loggingService: LoggingService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.formularioItem = this.criarFormulario();
    this.inicializarComponente();
  }

  /**
   * Inicializa o componente com sincronização Firestore
   */
  private async inicializarComponente(): Promise<void> {
    try {
      this.loggingService.info('ListaComponent initialized', {
        userId: this.usuario()?.email,
      });

      // Subscreve aos itens do Firestore
      const itensSubscription = this.firestoreService.itens$.subscribe(itens => {
        this.itensFirestore.set(itens);
        this.loggingService.debug('Itens updated from Firestore', { count: itens.length });
        // Força detecção de mudanças
        this.cdr.markForCheck();
      });

      // Subscreve ao status online/offline
      const onlineSubscription = this.firestoreService.isOnline$.subscribe(isOnline => {
        this.isOnline.set(isOnline);
        this.cdr.markForCheck();
      });

      // Subscreve a mudanças no usuário para atualizar header
      const userSubscription = this.authService.usuario$.subscribe(usuario => {
        this.loggingService.debug('User updated', {
          nome: usuario?.nome,
          email: usuario?.email,
        });
        this.cdr.markForCheck();
      });

      this.subscriptions.push(itensSubscription, onlineSubscription, userSubscription);
      this.erroCarregamento.set(null);
    } catch (error) {
      this.handleComponentError(error, 'inicializar o componente');
    }
  }

  /**
   * Cria o formulário para adicionar/editar itens
   */
  private criarFormulario(): FormGroup {
    return this.formBuilder.group({
      descricao: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      quantidade: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    });
  }

  /**
   * Submete o formulário para adicionar ou editar item
   */
  async onSubmit(): Promise<void> {
    if (this.formularioItem.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.isCarregando.set(true);

    try {
      const { descricao, quantidade } = this.formularioItem.value;

      if (this.modoEdicao()) {
        // Modo edição
        const itemAtual = this.itens().find(item => item.id === this.modoEdicao());
        if (itemAtual) {
          const itemAtualizado: ItemLista = {
            ...itemAtual,
            descricao,
            quantidade,
            atualizadoEm: new Date(),
          };

          const sucesso = await this.firestoreService.atualizarItem(itemAtualizado);
          if (sucesso) {
            this.toastService.success('Item editado com sucesso!');
            this.loggingService.info('Item edited', {
              itemId: this.modoEdicao(),
              descricao,
            });
            this.cancelarEdicao();
          } else {
            throw new Error('Falha ao editar item');
          }
        }
      } else {
        // Modo criação
        const itemCriado = await this.firestoreService.adicionarItem(descricao, quantidade);
        if (itemCriado) {
          this.toastService.success('Item adicionado com sucesso!');
          this.loggingService.info('Item created', {
            itemId: itemCriado.id,
            descricao,
          });

          this.formularioItem.reset({ quantidade: 1 });
        } else {
          throw new Error('Falha ao adicionar item');
        }
      }
    } catch (error) {
      this.handleComponentError(error, 'salvar o item');
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Inicia o modo de edição para um item
   */
  editarItem(item: ItemLista): void {
    try {
      this.modoEdicao.set(item.id!);
      this.formularioItem.patchValue({
        descricao: item.descricao,
        quantidade: item.quantidade,
      });

      this.loggingService.debug('Edit mode activated', { itemId: item.id });
    } catch (error) {
      this.handleComponentError(error, 'editar o item');
    }
  }

  /**
   * Cancela o modo de edição
   */
  cancelarEdicao(): void {
    this.modoEdicao.set(null);
    this.formularioItem.reset({ quantidade: 1 });
    this.loggingService.debug('Edit mode cancelled');
  }

  /**
   * Remove um item da lista
   */
  async removerItem(item: ItemLista): Promise<void> {
    if (confirm(`Deseja realmente remover "${item.descricao}"?`)) {
      try {
        const sucesso = await this.firestoreService.removerItem(item.id!);
        if (sucesso) {
          this.toastService.success('Item removido com sucesso!');
          this.loggingService.info('Item removed', {
            itemId: item.id,
            descricao: item.descricao,
          });
        } else {
          throw new Error('Falha ao remover item');
        }
      } catch (error) {
        this.handleComponentError(error, 'remover o item');
      }
    }
  }

  /**
   * Marca/desmarca item como concluído
   */
  async alterarStatusItem(item: ItemLista): Promise<void> {
    try {
      const itemAtualizado: ItemLista = {
        ...item,
        concluido: !item.concluido,
        atualizadoEm: new Date(),
      };

      const sucesso = await this.firestoreService.atualizarItem(itemAtualizado);

      if (sucesso) {
        const acao = itemAtualizado.concluido ? 'concluído' : 'reaberto';
        this.toastService.info(`Item ${acao}!`);
        this.loggingService.info('Item status changed', {
          itemId: item.id,
          concluido: itemAtualizado.concluido,
        });
      } else {
        throw new Error('Falha ao alterar status do item');
      }
    } catch (error) {
      this.handleComponentError(error, 'alterar status do item');
    }
  }

  /**
   * Alterna a visualização de itens concluídos
   */
  alternarVisualizacaoConcluidos(): void {
    this.mostrarConcluidos.update(valor => !valor);
    const acao = this.mostrarConcluidos() ? 'mostrando' : 'ocultando';
    this.loggingService.debug(`Toggled completed items visibility: ${acao}`);
  }

  /**
   * Remove todos os itens concluídos
   */
  async limparConcluidos(): Promise<void> {
    const totalConcluidos = this.itensConcluidos();

    if (totalConcluidos === 0) {
      this.toastService.info('Nenhum item concluído para remover');
      return;
    }

    if (confirm(`Deseja remover ${totalConcluidos} itens concluídos?`)) {
      try {
        this.isCarregando.set(true);
        const sucesso = await this.firestoreService.removerItensConcluidos();

        if (sucesso) {
          this.loggingService.info('Completed items cleared', { count: totalConcluidos });
        }
      } catch (error) {
        this.handleComponentError(error, 'limpar itens concluídos');
      } finally {
        this.isCarregando.set(false);
      }
    }
  }

  /**
   * Limpa toda a lista
   */
  async limparTodaLista(): Promise<void> {
    const total = this.totalItens();

    if (total === 0) {
      this.toastService.info('Lista já está vazia');
      return;
    }

    if (confirm(`Deseja realmente remover todos os ${total} itens da lista?`)) {
      try {
        this.isCarregando.set(true);
        const promises = this.itens().map(item =>
          item.id ? this.firestoreService.removerItem(item.id) : Promise.resolve(false)
        );

        const resultados = await Promise.all(promises);
        const sucessos = resultados.filter(Boolean).length;

        if (sucessos === total) {
          this.toastService.success('Lista limpa com sucesso!');
          this.loggingService.info('List cleared completely', { itemsRemoved: sucessos });
        } else {
          this.toastService.warning(`${sucessos}/${total} itens removidos`);
          this.loggingService.warn('Partial list clear', { sucessos, total });
        }
      } catch (error) {
        this.handleComponentError(error, 'limpar toda a lista');
      } finally {
        this.isCarregando.set(false);
      }
    }
  }

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      this.handleComponentError(error, 'fazer logout');
    }
  }

  /**
   * Tenta reconectar/recarregar dados
   */
  async tentarNovamente(): Promise<void> {
    this.tentativaReconexao.set(true);

    try {
      this.loggingService.info('Attempting to reconnect/reload');

      // Reinicia inicialização
      await this.inicializarComponente();

      this.toastService.success('Reconectado com sucesso!');
      this.erroCarregamento.set(null);
    } catch (error) {
      this.handleComponentError(error, 'reconectar');
    } finally {
      this.tentativaReconexao.set(false);
    }
  }

  /**
   * Trata erros do componente de forma centralizada
   */
  private handleComponentError(error: any, action: string): void {
    const errorMessage = `Erro ao ${action}`;

    this.loggingService.logError(error as Error, 'ListaComponent', {
      action,
      userId: this.usuario()?.email,
      itemCount: this.totalItens(),
    });

    this.erroCarregamento.set(errorMessage);
    this.toastService.error(errorMessage);
  }

  /**
   * Verifica se um campo do formulário tem erro específico
   */
  temErro(campo: string, tipoErro: string): boolean {
    const control = this.formularioItem.get(campo);
    return !!(control && control.errors?.[tipoErro] && control.touched);
  }

  /**
   * Obtém a mensagem de erro para um campo
   */
  obterMensagemErro(campo: string): string {
    const control = this.formularioItem.get(campo);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const erros = control.errors;

    if (erros['required']) {
      return `${this.obterLabelCampo(campo)} é obrigatório`;
    }

    if (erros['minlength']) {
      const min = erros['minlength'].requiredLength;
      return `${this.obterLabelCampo(campo)} deve ter pelo menos ${min} caracteres`;
    }

    if (erros['maxlength']) {
      const max = erros['maxlength'].requiredLength;
      return `${this.obterLabelCampo(campo)} deve ter no máximo ${max} caracteres`;
    }

    if (erros['min']) {
      const min = erros['min'].min;
      return `${this.obterLabelCampo(campo)} deve ser pelo menos ${min}`;
    }

    if (erros['max']) {
      const max = erros['max'].max;
      return `${this.obterLabelCampo(campo)} deve ser no máximo ${max}`;
    }

    return 'Campo inválido';
  }

  /**
   * Obtém o label amigável do campo
   */
  private obterLabelCampo(campo: string): string {
    const labels: Record<string, string> = {
      descricao: 'Descrição',
      quantidade: 'Quantidade',
    };
    return labels[campo] || campo;
  }

  /**
   * Marca todos os campos como tocados para exibir validações
   */
  private marcarCamposComoTocados(): void {
    Object.keys(this.formularioItem.controls).forEach(campo => {
      this.formularioItem.get(campo)?.markAsTouched();
    });
  }

  /**
   * Cleanup das subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.loggingService.info('ListaComponent destroyed');
  }
}
