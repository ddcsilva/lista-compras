import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ListaService } from '../services/lista.service';
import { ItemLista, NovoItemLista } from '../../../shared/models/item-lista.model';
import { LoggingService } from '../../../core/services/logging.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Componente standalone para gerenciar a lista de compras
 * Implementa CRUD de itens com interface responsiva e tratamento robusto de erros
 */
@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lista.component.html',
})
export class ListaComponent {
  formularioItem: FormGroup;

  // Signals para gerenciar estado do componente
  modoEdicao = signal<string | null>(null);
  isCarregando = signal(false);
  mostrarConcluidos = signal(true);
  erroCarregamento = signal<string | null>(null);
  tentativaReconexao = signal(false);

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private listaService: ListaService,
    private loggingService: LoggingService,
    private toastService: ToastService
  ) {
    this.formularioItem = this.criarFormulario();
    this.inicializarComponente();
  }

  // Getters para acessar dados dos serviços
  get usuario() {
    return this.authService.usuario;
  }

  get itens() {
    return this.listaService.itensLista;
  }

  get totalItens() {
    return this.listaService.totalItens;
  }

  get itensConcluidos() {
    return this.listaService.itensConcluidos;
  }

  get itensRestantes() {
    return this.listaService.itensRestantes;
  }

  /**
   * Filtra itens baseado na preferência de visualização
   */
  get itensVisiveis() {
    const todosItens = this.itens();
    if (this.mostrarConcluidos()) {
      return todosItens;
    }
    return todosItens.filter(item => !item.concluido);
  }

  /**
   * Inicializa o componente com tratamento de erro
   */
  private async inicializarComponente(): Promise<void> {
    try {
      this.loggingService.info('ListaComponent initialized', {
        userId: this.usuario()?.email,
      });

      // Aqui poderia haver uma chamada HTTP para carregar dados do servidor
      // Por enquanto, os dados vêm do localStorage via ListaService

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
        const sucesso = this.listaService.editarItem(this.modoEdicao()!, { descricao, quantidade });
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
      } else {
        // Modo criação
        const novoItem: NovoItemLista = { descricao, quantidade };
        const itemCriado = this.listaService.adicionarItem(novoItem);

        this.toastService.success('Item adicionado com sucesso!');
        this.loggingService.info('Item created', {
          itemId: itemCriado.id,
          descricao,
        });

        this.formularioItem.reset({ quantidade: 1 });
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
      this.modoEdicao.set(item.id);
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
  removerItem(item: ItemLista): void {
    if (confirm(`Deseja realmente remover "${item.descricao}"?`)) {
      try {
        const sucesso = this.listaService.removerItem(item.id);
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
  alterarStatusItem(item: ItemLista): void {
    try {
      const novoStatus = !item.concluido;
      const sucesso = this.listaService.marcarConcluido(item.id, novoStatus);

      if (sucesso) {
        const acao = novoStatus ? 'concluído' : 'reaberto';
        this.toastService.info(`Item ${acao}!`);
        this.loggingService.info('Item status changed', {
          itemId: item.id,
          concluido: novoStatus,
        });
      } else {
        throw new Error('Falha ao alterar status do item');
      }
    } catch (error) {
      this.handleComponentError(error, 'alterar o status do item');
    }
  }

  /**
   * Alterna visualização de itens concluídos
   */
  alternarVisualizacaoConcluidos(): void {
    this.mostrarConcluidos.update(valor => !valor);
    this.loggingService.debug('View filter changed', {
      mostrarConcluidos: this.mostrarConcluidos(),
    });
  }

  /**
   * Remove todos os itens concluídos
   */
  limparConcluidos(): void {
    const quantidadeConcluidos = this.itensConcluidos;
    if (quantidadeConcluidos === 0) return;

    const mensagem = `Deseja remover ${quantidadeConcluidos} ${quantidadeConcluidos === 1 ? 'item concluído' : 'itens concluídos'}?`;
    if (confirm(mensagem)) {
      try {
        this.listaService.removerConcluidos();
        this.toastService.success(`${quantidadeConcluidos} itens removidos!`);
        this.loggingService.info('Completed items cleared', {
          quantidade: quantidadeConcluidos,
        });
      } catch (error) {
        this.handleComponentError(error, 'limpar itens concluídos');
      }
    }
  }

  /**
   * Limpa toda a lista
   */
  limparTodaLista(): void {
    const total = this.totalItens;
    if (total === 0) return;

    const mensagem = `Deseja realmente remover todos os ${total} itens da lista?`;
    if (confirm(mensagem)) {
      try {
        this.listaService.limparLista();
        this.toastService.success('Lista limpa com sucesso!');
        this.loggingService.info('Entire list cleared', {
          totalItens: total,
        });
      } catch (error) {
        this.handleComponentError(error, 'limpar a lista');
      }
    }
  }

  /**
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    if (confirm('Deseja realmente sair?')) {
      try {
        this.loggingService.info('User logout initiated');
        await this.authService.logout();
      } catch (error) {
        this.handleComponentError(error, 'fazer logout');
      }
    }
  }

  /**
   * Tenta recarregar os dados em caso de erro
   */
  async tentarNovamente(): Promise<void> {
    this.tentativaReconexao.set(true);

    try {
      this.loggingService.info('Retry attempt initiated');
      await this.inicializarComponente();
      this.toastService.success('Dados recarregados com sucesso!');
    } catch (error) {
      this.handleComponentError(error, 'recarregar os dados');
    } finally {
      this.tentativaReconexao.set(false);
    }
  }

  /**
   * Tratamento centralizado de erros do componente
   */
  private handleComponentError(error: any, action: string): void {
    const errorMessage = `Não foi possível ${action}`;

    this.loggingService.logError(error, 'ListaComponent', {
      action,
      userId: this.usuario()?.email,
      timestamp: new Date().toISOString(),
    });

    // Define erro de carregamento para exibir fallback UI
    if (action.includes('carregar') || action.includes('inicializar')) {
      this.erroCarregamento.set(errorMessage);
    }

    // Exibe toast apenas se não for erro de carregamento inicial
    if (!action.includes('inicializar')) {
      this.toastService.showGenericError(action);
    }
  }

  /**
   * Verifica se um campo tem erro específico
   */
  temErro(campo: string, tipoErro: string): boolean {
    const control = this.formularioItem.get(campo);
    return !!(control && control.errors?.[tipoErro] && control.touched);
  }

  /**
   * Obtém mensagem de erro para um campo
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
}
