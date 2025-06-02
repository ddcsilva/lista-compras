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
      const fullKey = this.PREFIX + key;
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: '1.0',
      });

      localStorage.setItem(fullKey, serializedValue);

      this.loggingService.debug('Item stored in localStorage', {
        key: fullKey,
        dataType: typeof value,
        size: serializedValue.length,
      });
    } catch (error: any) {
      this.loggingService.error('Failed to store item in localStorage', {
        key,
        error: error.message,
      });
    }
  }

  /**
   * Obtém um item do localStorage
   */
  getItem<T>(key: string): T | null {
    try {
      const fullKey = this.PREFIX + key;
      const item = localStorage.getItem(fullKey);

      if (!item) {
        return null;
      }

      const parsed = JSON.parse(item);

      this.loggingService.debug('Item retrieved from localStorage', {
        key: fullKey,
        hasData: !!parsed.data,
        timestamp: parsed.timestamp,
      });

      return parsed.data;
    } catch (error: any) {
      this.loggingService.error('Failed to retrieve item from localStorage', {
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Remove um item do localStorage
   */
  removeItem(key: string): void {
    try {
      const fullKey = this.PREFIX + key;
      localStorage.removeItem(fullKey);

      this.loggingService.debug('Item removed from localStorage', {
        key: fullKey,
      });
    } catch (error: any) {
      this.loggingService.error('Failed to remove item from localStorage', {
        key,
        error: error.message,
      });
    }
  }

  /**
   * Limpa todos os dados da aplicação
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));

      keys.forEach(key => localStorage.removeItem(key));

      this.loggingService.info('localStorage cleared', {
        itemsRemoved: keys.length,
      });
    } catch (error: any) {
      this.loggingService.error('Failed to clear localStorage', {
        error: error.message,
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
