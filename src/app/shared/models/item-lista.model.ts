/**
 * Interface que define a estrutura de um item da lista de compras
 */
export interface ItemLista {
  id: string;
  descricao: string;
  quantidade: number;
  concluido: boolean;
  dataAtualizacao: Date;
}

/**
 * Interface para criação de um novo item (sem id e metadata)
 */
export interface NovoItemLista {
  descricao: string;
  quantidade: number;
}

/**
 * Interface para edição de um item existente
 */
export interface EdicaoItemLista {
  descricao?: string;
  quantidade?: number;
  concluido?: boolean;
}
