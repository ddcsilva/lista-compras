import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';

/**
 * Serviço para gerenciar dados no localStorage
 * Usado como backup offline para dados do Firestore
 * Implementa caching e sincronização para PWA
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly PREFIX = 'vai-na-lista-';

  constructor(private loggingService: LoggingService) {}

  /**
   * Armazena um item no localStorage
   */
  setItem<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      this.loggingService.error('Failed to store item in localStorage', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Obtém um item do localStorage
   */
  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }

      return JSON.parse(item) as T;
    } catch (error) {
      this.loggingService.error('Failed to retrieve item from localStorage', {
        key,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Remove um item do localStorage
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      this.loggingService.error('Failed to remove item from localStorage', {
        key,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Limpa todos os dados do localStorage relacionados ao app
   */
  clear(): void {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      this.loggingService.error('Failed to clear localStorage', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Obtém informações sobre o uso do storage
   */
  getStorageInfo(): { used: number; available: number; keys: string[] } {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));

      let used = 0;
      keys.forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length;
        }
      });

      // Estima 5MB como limite do localStorage
      const available = 5 * 1024 * 1024 - used;

      return {
        used,
        available: Math.max(0, available),
        keys: keys.map(key => key.replace(this.PREFIX, '')),
      };
    } catch (error: any) {
      this.loggingService.error('Failed to get storage info', {
        error: error.message,
      });

      return { used: 0, available: 0, keys: [] };
    }
  }

  /**
   * Salva dados da lista como backup offline
   */
  backupListaOffline<T>(userId: string, itens: T[]): void {
    const backupKey = `backup-lista-${userId}`;
    this.setItem(backupKey, {
      itens,
      lastSync: Date.now(),
      itemCount: itens.length,
    });

    this.loggingService.info('Lista backed up offline', {
      userId,
      itemCount: itens.length,
    });
  }

  /**
   * Recupera backup offline da lista
   */
  getBackupListaOffline<T>(userId: string): { itens: T[]; lastSync: number; itemCount: number } | null {
    const backupKey = `backup-lista-${userId}`;
    const backup = this.getItem<{ itens: T[]; lastSync: number; itemCount: number }>(backupKey);

    if (backup) {
      this.loggingService.info('Offline backup retrieved', {
        userId,
        itemCount: backup.itemCount,
        lastSync: new Date(backup.lastSync).toISOString(),
      });
    }

    return backup;
  }

  /**
   * Remove backup offline
   */
  removeBackupListaOffline(userId: string): void {
    const backupKey = `backup-lista-${userId}`;
    this.removeItem(backupKey);

    this.loggingService.info('Offline backup removed', { userId });
  }
}
