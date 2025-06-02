import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ListaService } from '../services/lista.service';
import { ItemLista, NovoItemLista } from '../../../shared/models/item-lista.model';

/**
 * Componente standalone para gerenciar a lista de compras
 * Implementa CRUD de itens com interface responsiva
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

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private listaService: ListaService
  ) {
    this.formularioItem = this.criarFormulario();
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
        this.listaService.editarItem(this.modoEdicao()!, { descricao, quantidade });
        this.cancelarEdicao();
      } else {
        // Modo criação
        const novoItem: NovoItemLista = { descricao, quantidade };
        this.listaService.adicionarItem(novoItem);
        this.formularioItem.reset({ quantidade: 1 });
      }
    } catch (error) {
      console.error('Erro ao salvar item:', error);
    } finally {
      this.isCarregando.set(false);
    }
  }

  /**
   * Inicia o modo de edição para um item
   */
  editarItem(item: ItemLista): void {
    this.modoEdicao.set(item.id);
    this.formularioItem.patchValue({
      descricao: item.descricao,
      quantidade: item.quantidade,
    });
  }

  /**
   * Cancela o modo de edição
   */
  cancelarEdicao(): void {
    this.modoEdicao.set(null);
    this.formularioItem.reset({ quantidade: 1 });
  }

  /**
   * Remove um item da lista
   */
  removerItem(item: ItemLista): void {
    if (confirm(`Deseja realmente remover "${item.descricao}"?`)) {
      this.listaService.removerItem(item.id);
    }
  }

  /**
   * Marca/desmarca item como concluído
   */
  alterarStatusItem(item: ItemLista): void {
    this.listaService.marcarConcluido(item.id, !item.concluido);
  }

  /**
   * Alterna visualização de itens concluídos
   */
  alternarVisualizacaoConcluidos(): void {
    this.mostrarConcluidos.update(valor => !valor);
  }

  /**
   * Remove todos os itens concluídos
   */
  limparConcluidos(): void {
    const quantidadeConcluidos = this.itensConcluidos;
    if (quantidadeConcluidos === 0) return;

    const mensagem = `Deseja remover ${quantidadeConcluidos} ${quantidadeConcluidos === 1 ? 'item concluído' : 'itens concluídos'}?`;
    if (confirm(mensagem)) {
      this.listaService.removerConcluidos();
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
      this.listaService.limparLista();
    }
  }

  /**
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    if (confirm('Deseja realmente sair?')) {
      await this.authService.logout();
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
