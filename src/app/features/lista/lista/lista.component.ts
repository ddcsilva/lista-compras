import { Component, signal, computed, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ListaService } from '../../../core/services/lista.service';
import { LoggingService } from '../../../core/services/logging.service';
import { ToastService } from '../../../core/services/toast.service';
import { PwaService } from '../../../core/services/pwa.service';
import { Lista, ItemLista, NovoItemLista, EdicaoItemLista } from '../../../shared/models/item-lista.model';
import { Subscription } from 'rxjs';

/**
 * Componente standalone para gerenciar listas de compras
 * Refatorado para usar a nova arquitetura com itens embutidos
 * Otimizado com computed signals e OnPush para máxima performance
 * Integrado com PWA para funcionalidades offline e instalação
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
  formularioLista: FormGroup;

  // Signals para gerenciar estado do componente
  private listaAtual = signal<Lista | null>(null);
  private listasUsuario = signal<Lista[]>([]);
  modoEdicao = signal<string | null>(null);
  modoEdicaoLista = signal(false);
  isCarregando = signal(false);
  mostrarConcluidos = signal(true);
  erroCarregamento = signal<string | null>(null);
  tentativaReconexao = signal(false);
  isOnline = signal(navigator.onLine);
  mostrarSeletorListas = signal(false);
  mostrarMenuPWA = signal(false);

  // PWA Signals
  isInstallable = signal(false);
  isInstalled = signal(false);
  hasUpdate = signal(false);

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Computed signals para melhor performance (cached e reativo)
  readonly usuario = computed(() => this.authService.usuario());
  readonly lista = computed(() => this.listaAtual());
  readonly listas = computed(() => this.listasUsuario());
  readonly itens = computed(() => this.lista()?.itens || []);
  readonly totalItens = computed(() => this.itens().length);
  readonly itensConcluidos = computed(() => this.itens().filter(item => item.concluido).length);
  readonly itensRestantes = computed(() => this.itens().filter(item => !item.concluido).length);
  readonly estatisticas = computed(() => this.listaService.obterEstatisticas());

  // Computed para filtrar itens baseado na preferência de visualização
  readonly itensVisiveis = computed(() => {
    const todosItens = this.itens();
    if (this.mostrarConcluidos()) {
      return todosItens.sort((a, b) => a.ordem - b.ordem);
    }
    return todosItens.filter(item => !item.concluido).sort((a, b) => a.ordem - b.ordem);
  });

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private listaService: ListaService,
    private loggingService: LoggingService,
    private toastService: ToastService,
    private pwaService: PwaService,
    private cdr: ChangeDetectorRef
  ) {
    this.formularioItem = this.criarFormularioItem();
    this.formularioLista = this.criarFormularioLista();
    this.inicializarComponente();
    this.inicializarPWA();
  }

  /**
   * Inicializa o componente com sincronização do ListaService
   */
  private async inicializarComponente(): Promise<void> {
    try {
      this.loggingService.info('ListaComponent initialized', {
        userId: this.usuario()?.email,
      });

      // Subscreve à lista atual
      const listaAtualSubscription = this.listaService.listaAtual$.subscribe(lista => {
        this.listaAtual.set(lista);
        this.loggingService.debug('Lista atual updated', {
          listaId: lista?.id,
          itensCount: lista?.itens?.length || 0,
        });
        this.cdr.markForCheck();
      });

      // Subscreve às listas do usuário
      const listasUsuarioSubscription = this.listaService.listasUsuario$.subscribe(listas => {
        this.listasUsuario.set(listas);
        this.loggingService.debug('Listas do usuário updated', {
          listasCount: listas.length,
        });
        this.cdr.markForCheck();
      });

      // Subscreve ao status online/offline
      const onlineSubscription = this.listaService.isOnline$.subscribe(isOnline => {
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

      this.subscriptions.push(listaAtualSubscription, listasUsuarioSubscription, onlineSubscription, userSubscription);

      this.erroCarregamento.set(null);
    } catch (error) {
      this.handleComponentError(error, 'inicializar o componente');
    }
  }

  // ==========================================
  // MÉTODOS DE FORMULÁRIOS
  // ==========================================

  /**
   * Cria o formulário para adicionar/editar itens
   */
  private criarFormularioItem(): FormGroup {
    return this.formBuilder.group({
      nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      categoria: ['Geral'],
      quantidade: [1, [Validators.required, Validators.min(1), Validators.max(999)]],
    });
  }

  /**
   * Cria o formulário para criar/editar listas
   */
  private criarFormularioLista(): FormGroup {
    return this.formBuilder.group({
      nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      categoria: ['Compras'],
      cor: ['#3B82F6'],
    });
  }

  // ==========================================
  // MÉTODOS DE GESTÃO DE LISTAS
  // ==========================================

  /**
   * Cria uma nova lista
   */
  async criarLista(): Promise<void> {
    if (this.formularioLista.invalid) {
      this.marcarCamposComoTocados(this.formularioLista);
      return;
    }

    this.isCarregando.set(true);

    try {
      const { nome, categoria, cor } = this.formularioLista.value;
      const novaLista = await this.listaService.criarLista({ nome, categoria, cor });

      if (novaLista) {
        this.formularioLista.reset({ categoria: 'Compras', cor: '#3B82F6' });
        this.modoEdicaoLista.set(false);
        this.loggingService.info('Lista created successfully', { listaId: novaLista.id });
      }
    } catch (error) {
      this.handleComponentError(error, 'criar lista');
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Seleciona uma lista diferente
   */
  selecionarLista(listaId: string): void {
    this.listaService.selecionarLista(listaId);
    this.mostrarSeletorListas.set(false);
    this.loggingService.info('Lista selected from component', { listaId });
  }

  /**
   * Alterna o modo de edição da lista
   */
  alternarModoEdicaoLista(): void {
    this.modoEdicaoLista.update(modo => !modo);

    if (this.modoEdicaoLista()) {
      const lista = this.lista();
      if (lista) {
        this.formularioLista.patchValue({
          nome: lista.nome,
          categoria: lista.categoria,
          cor: lista.cor || '#3B82F6',
        });
      }
    } else {
      this.formularioLista.reset({ categoria: 'Compras', cor: '#3B82F6' });
    }
  }

  // ==========================================
  // MÉTODOS DE GESTÃO DE ITENS
  // ==========================================

  /**
   * Submete o formulário para adicionar ou editar item
   */
  async onSubmit(): Promise<void> {
    if (this.formularioItem.invalid) {
      this.marcarCamposComoTocados(this.formularioItem);
      return;
    }

    if (!this.lista()) {
      this.toastService.error('Nenhuma lista selecionada');
      return;
    }

    this.isCarregando.set(true);

    try {
      const { nome, categoria, quantidade } = this.formularioItem.value;

      if (this.modoEdicao()) {
        // Modo edição
        const edicao: EdicaoItemLista = {
          nome: nome.trim(),
          categoria,
          quantidade,
        };

        const sucesso = await this.listaService.atualizarItem(this.modoEdicao()!, edicao);
        if (sucesso) {
          this.loggingService.info('Item edited', {
            itemId: this.modoEdicao(),
            nome,
          });
          this.cancelarEdicao();
        }
      } else {
        // Modo criação
        const novoItem: NovoItemLista = {
          nome: nome.trim(),
          categoria,
          quantidade,
        };

        const itemCriado = await this.listaService.adicionarItem(novoItem);
        if (itemCriado) {
          this.loggingService.info('Item created', {
            itemId: itemCriado.id,
            nome,
          });
          this.formularioItem.reset({ categoria: 'Geral', quantidade: 1 });
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
        nome: item.nome,
        categoria: item.categoria,
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
    this.formularioItem.reset({ categoria: 'Geral', quantidade: 1 });
    this.loggingService.debug('Edit mode cancelled');
  }

  /**
   * Remove um item da lista
   */
  async removerItem(item: ItemLista): Promise<void> {
    if (confirm(`Deseja realmente remover "${item.nome}"?`)) {
      try {
        const sucesso = await this.listaService.removerItem(item.id);
        if (sucesso) {
          this.loggingService.info('Item removed', {
            itemId: item.id,
            nome: item.nome,
          });
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
      const edicao: EdicaoItemLista = {
        concluido: !item.concluido,
      };

      const sucesso = await this.listaService.atualizarItem(item.id, edicao);

      if (sucesso) {
        const acao = !item.concluido ? 'concluído' : 'reaberto';
        this.toastService.info(`Item ${acao}!`);
        this.loggingService.info('Item status changed', {
          itemId: item.id,
          concluido: !item.concluido,
        });
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
        const sucesso = await this.listaService.removerItensConcluidos();

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
   * Limpa toda a lista (remove todos os itens)
   */
  async limparTodaLista(): Promise<void> {
    const lista = this.lista();
    if (!lista) {
      this.toastService.error('Nenhuma lista selecionada');
      return;
    }

    const total = this.totalItens();

    if (total === 0) {
      this.toastService.info('Lista já está vazia');
      return;
    }

    if (confirm(`Deseja realmente remover todos os ${total} itens da lista "${lista.nome}"?`)) {
      try {
        this.isCarregando.set(true);

        // Remove todos os itens individualmente para manter histórico
        const promises = this.itens().map(item => this.listaService.removerItem(item.id));

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
   * Arquiva a lista atual
   */
  async arquivarLista(): Promise<void> {
    const lista = this.lista();
    if (!lista?.id) {
      this.toastService.error('Nenhuma lista selecionada');
      return;
    }

    if (confirm(`Deseja arquivar a lista "${lista.nome}"?`)) {
      try {
        const sucesso = await this.listaService.arquivarLista(lista.id);
        if (sucesso) {
          this.loggingService.info('Lista archived', { listaId: lista.id });
        }
      } catch (error) {
        this.handleComponentError(error, 'arquivar lista');
      }
    }
  }

  /**
   * Remove permanentemente a lista atual
   */
  async removerLista(): Promise<void> {
    const lista = this.lista();
    if (!lista?.id) {
      this.toastService.error('Nenhuma lista selecionada');
      return;
    }

    if (confirm(`Deseja PERMANENTEMENTE remover a lista "${lista.nome}"? Esta ação não pode ser desfeita!`)) {
      try {
        const sucesso = await this.listaService.removerLista(lista.id);
        if (sucesso) {
          this.loggingService.info('Lista deleted', { listaId: lista.id });
        }
      } catch (error) {
        this.handleComponentError(error, 'remover lista');
      }
    }
  }

  // ==========================================
  // MÉTODOS DE INTERFACE E NAVEGAÇÃO
  // ==========================================

  /**
   * Alterna a visibilidade do seletor de listas
   */
  alternarSeletorListas(): void {
    this.mostrarSeletorListas.update(valor => !valor);
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

  // ==========================================
  // MÉTODOS AUXILIARES E VALIDAÇÃO
  // ==========================================

  /**
   * Trata erros do componente de forma centralizada
   */
  private handleComponentError(error: any, action: string): void {
    const errorMessage = `Erro ao ${action}`;

    this.loggingService.logError(error as Error, 'ListaComponent', {
      action,
      userId: this.usuario()?.email,
      listaId: this.lista()?.id,
      itemCount: this.totalItens(),
    });

    this.erroCarregamento.set(errorMessage);
    this.toastService.error(errorMessage);
  }

  /**
   * Verifica se um campo do formulário tem erro específico
   */
  temErro(campo: string, tipoErro: string, formGroup?: FormGroup): boolean {
    const form = formGroup || this.formularioItem;
    const control = form.get(campo);
    return !!(control && control.errors?.[tipoErro] && control.touched);
  }

  /**
   * Obtém a mensagem de erro para um campo
   */
  obterMensagemErro(campo: string, formGroup?: FormGroup): string {
    const form = formGroup || this.formularioItem;
    const control = form.get(campo);

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
      nome: 'Nome',
      categoria: 'Categoria',
      quantidade: 'Quantidade',
    };
    return labels[campo] || campo;
  }

  /**
   * Marca todos os campos como tocados para exibir validações
   */
  private marcarCamposComoTocados(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(campo => {
      formGroup.get(campo)?.markAsTouched();
    });
  }

  // ==========================================
  // MÉTODOS PWA
  // ==========================================

  /**
   * Inicializa funcionalidades PWA
   */
  private inicializarPWA(): void {
    // Subscreve aos observables do PWA service
    const installableSubscription = this.pwaService.isInstallable$.subscribe(isInstallable => {
      this.isInstallable.set(isInstallable);
      this.cdr.markForCheck();
    });

    const installedSubscription = this.pwaService.isInstalled$.subscribe(isInstalled => {
      this.isInstalled.set(isInstalled);
      this.cdr.markForCheck();
    });

    const updateSubscription = this.pwaService.hasUpdate$.subscribe(hasUpdate => {
      this.hasUpdate.set(hasUpdate);
      this.cdr.markForCheck();
    });

    this.subscriptions.push(installableSubscription, installedSubscription, updateSubscription);
  }

  /**
   * Instala o app como PWA
   */
  async instalarApp(): Promise<void> {
    try {
      const sucesso = await this.pwaService.showInstallPrompt();
      if (sucesso) {
        this.loggingService.info('PWA installation prompt accepted');
      }
    } catch (error) {
      this.loggingService.error('Failed to show install prompt', { error });
      this.toastService.error('Não foi possível instalar o app', 'Erro na Instalação');
    }
  }

  /**
   * Aplica atualização disponível
   */
  async atualizarApp(): Promise<void> {
    await this.pwaService.applyUpdate();
  }

  /**
   * Verifica manualmente por atualizações
   */
  async verificarAtualizacoes(): Promise<void> {
    try {
      const hasUpdate = await this.pwaService.checkForUpdate();
      if (!hasUpdate) {
        this.toastService.info('Você já está usando a versão mais recente', 'App Atualizado');
      }
    } catch (error) {
      this.loggingService.error('Manual update check failed', { error });
    }
  }

  /**
   * Obtém informações do cache
   */
  async obterInfoCache(): Promise<void> {
    try {
      const cacheInfo = await this.pwaService.getCacheInfo();
      const totalItens = cacheInfo.reduce((total, cache) => total + cache.size, 0);

      this.toastService.info(`${cacheInfo.length} caches ativos com ${totalItens} itens`, 'Informações do Cache', 5000);

      this.loggingService.info('Cache info retrieved', { cacheInfo });
    } catch (error) {
      this.loggingService.error('Failed to get cache info', { error });
    }
  }

  /**
   * Limpa cache do app
   */
  async limparCache(): Promise<void> {
    if (confirm('Deseja limpar o cache do aplicativo? Isso pode afetar a performance offline.')) {
      await this.pwaService.clearCache();
    }
  }

  /**
   * Cleanup das subscriptions
   */
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.loggingService.info('ListaComponent destroyed');
  }
}
