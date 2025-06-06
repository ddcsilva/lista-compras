export enum PermissaoMembro {
  OWNER = 'owner',
  EDITOR = 'editor',
  // VIEWER = 'viewer' // Futuro
}

export enum StatusConvite {
  PENDENTE = 'pendente',
  ACEITO = 'aceito',
  REJEITADO = 'rejeitado',
  EXPIRADO = 'expirado',
}

export interface MembroLista {
  uid: string;
  email: string;
  nome: string;
  photoURL?: string;
  permissao: PermissaoMembro;
  dataEntrada: Date;
  adicionadoPor: string;
}

export interface ConvitePendente {
  id: string;
  email: string;
  listaId: string;
  nomeLista: string;
  convidadoPor: string;
  nomeConvidadoPor: string;
  dataConvite: Date;
  dataExpiracao: Date;
  status: StatusConvite;
  permissaoOferecida: PermissaoMembro;
}

export interface ListaCompartilhada {
  tipoLista: 'individual' | 'compartilhada';
  membros: MembroLista[];
  convitesPendentes: ConvitePendente[];
}
