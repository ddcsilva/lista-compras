import { Injectable } from '@angular/core';

/**
 * Serviço responsável pela persistência de dados no localStorage
 * Segue o padrão Repository para abstrair o mecanismo de storage
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  /**
   * Salva um item no localStorage
   * @param key Chave para identificar o item
   * @param value Valor a ser armazenado (será serializado como JSON)
   */
  setItem<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error('Erro ao salvar item no localStorage:', error);
    }
  }

  /**
   * Recupera um item do localStorage
   * @param key Chave do item a ser recuperado
   * @returns O valor deserializado ou null se não encontrado
   */
  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Erro ao recuperar item do localStorage:', error);
      return null;
    }
  }

  /**
   * Remove um item do localStorage
   * @param key Chave do item a ser removido
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erro ao remover item do localStorage:', error);
    }
  }

  /**
   * Verifica se uma chave existe no localStorage
   * @param key Chave a ser verificada
   * @returns true se a chave existe, false caso contrário
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Limpa todo o localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
  }
}
