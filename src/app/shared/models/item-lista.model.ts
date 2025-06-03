import { ConvitePendente, MembroLista } from './compartilhamento.model';

/**
 * Interface que define a estrutura de um item dentro da lista de compras
 * Agora os itens são armazenados como array dentro do documento da lista
 */
export interface ItemLista {
  id: string; // UUID gerado localmente
  nome: string; // Nome/descrição do item
  categoria: string; // Categoria do produto (ex: "Alimentação", "Limpeza")
  concluido: boolean; // Status de conclusão
  ordem: number; // Ordem de exibição na lista
  quantidade: number; // Quantidade a comprar
  criadoPor: string; // UID do usuário que criou
  dataAdicao: Date; // Quando foi adicionado à lista
}

/**
 * Interface principal da Lista de Compras
 * Contém todos os itens como array embutido
 */
export interface Lista {
  id?: string; // ID do documento no Firestore
  nome: string; // Nome da lista (ex: "Supermercado - Semana")
  categoria: string; // Categoria da lista (ex: "Compras", "Farmácia")
  criadoPor: string; // UID do usuário proprietário
  dataCriacao: Date; // Data de criação da lista
  dataAtualizacao: Date; // Última modificação
  itens: ItemLista[]; // Array de itens embutidos
  compartilhadaCom?: string[]; // Array de UIDs para compartilhamento (futuro)
  ativa: boolean; // Se a lista está ativa ou arquivada
  cor?: string; // Cor da lista para personalização
  tipoLista?: 'individual' | 'compartilhada';
  membros?: MembroLista[];
  convitesPendentes?: ConvitePendente[];
}

/**
 * Interface para criação de um novo item (dados mínimos)
 */
export interface NovoItemLista {
  nome: string;
  categoria?: string;
  quantidade?: number;
}

/**
 * Interface para edição de um item existente
 */
export interface EdicaoItemLista {
  nome?: string;
  categoria?: string;
  quantidade?: number;
  concluido?: boolean;
  ordem?: number;
}

/**
 * Interface para criação de uma nova lista
 */
export interface NovaLista {
  nome: string;
  categoria?: string;
  cor?: string;
}

/**
 * Interface para estatísticas da lista
 */
export interface EstatisticasLista {
  totalItens: number;
  itensConcluidos: number;
  itensRestantes: number;
  percentualConcluido: number;
  categorias: string[];
  ultimaAtualizacao: Date;
}
