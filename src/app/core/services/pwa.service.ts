import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ToastService } from './toast.service';
import { LoggingService } from './logging.service';
import { BehaviorSubject, interval, concat } from 'rxjs';
import { first, filter, tap } from 'rxjs/operators';

/**
 * Serviço para gerenciar funcionalidades PWA
 * - Detecção de atualizações
 * - Install prompt
 * - Conectividade offline/online
 * - Cache management
 */
@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private deferredPrompt: any;
  private isInstallableSubject = new BehaviorSubject<boolean>(false);
  private isInstalledSubject = new BehaviorSubject<boolean>(false);
  private hasUpdateSubject = new BehaviorSubject<boolean>(false);

  // Observables públicos
  public isInstallable$ = this.isInstallableSubject.asObservable();
  public isInstalled$ = this.isInstalledSubject.asObservable();
  public hasUpdate$ = this.hasUpdateSubject.asObservable();

  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
    private toastService: ToastService,
    private loggingService: LoggingService
  ) {
    this.initializePWA();
  }

  /**
   * Inicializa funcionalidades PWA
   */
  private initializePWA(): void {
    try {
      if (!this.swUpdate.isEnabled) {
        return;
      }

      this.setupUpdateChecks();
      this.setupInstallPrompt();
      this.checkIfInstalled();
      this.setupVersionUpdates();
    } catch (error) {
      this.loggingService.error('Erro ao inicializar PWA', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Configura verificação automática de atualizações
   */
  private setupUpdateChecks(): void {
    // Verifica atualizações quando a app se torna estável
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000); // 6 horas
    const checkForUpdates$ = concat(appIsStable$, everySixHours$);

    checkForUpdates$.subscribe(async () => {
      try {
        const updateFound = await this.swUpdate.checkForUpdate();
        if (updateFound) {
          this.loggingService.info('Update check completed - update found');
        } else {
          this.loggingService.debug('Update check completed - no updates');
        }
      } catch (error) {
        this.loggingService.error('Failed to check for updates', { error });
      }
    });
  }

  /**
   * Configura listeners para atualizações de versão
   */
  private setupVersionUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        tap(evt => this.loggingService.info('New version available', { version: evt.latestVersion }))
      )
      .subscribe(() => {
        this.hasUpdateSubject.next(true);
        this.showUpdateNotification();
      });

    // Handle no new version available
    this.swUpdate.versionUpdates.pipe(filter(evt => evt.type === 'NO_NEW_VERSION_DETECTED')).subscribe(() => {
      this.loggingService.debug('No new version available');
    });
  }

  /**
   * Mostra notificação de atualização disponível
   */
  private showUpdateNotification(): void {
    this.toastService.info('Uma nova versão do app está disponível', 'Atualização Disponível');
  }

  /**
   * Aplica atualização disponível
   */
  async applyUpdate(): Promise<void> {
    try {
      this.loggingService.info('Applying app update');
      await this.swUpdate.activateUpdate();
      this.hasUpdateSubject.next(false);

      this.toastService.success('Recarregando para aplicar as mudanças...', 'App Atualizado', 2000);

      // Recarrega a página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      this.loggingService.error('Failed to apply update', { error });
      this.toastService.error('Não foi possível atualizar o app. Tente novamente.', 'Erro na Atualização');
    }
  }

  /**
   * Configura prompt de instalação
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      // Previne o prompt automático
      e.preventDefault();
      this.deferredPrompt = e;
      this.isInstallableSubject.next(true);

      this.loggingService.info('PWA install prompt available');
    });

    // Detecta quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      this.loggingService.info('PWA was installed');
      this.isInstalledSubject.next(true);
      this.isInstallableSubject.next(false);
      this.deferredPrompt = null;

      this.toastService.success('Vai na Lista foi instalado com sucesso!', 'App Instalado');
    });
  }

  /**
   * Verifica se o app já está instalado
   */
  private checkIfInstalled(): void {
    // Verifica se está em modo standalone (instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    if (isStandalone || isIOSStandalone) {
      this.isInstalledSubject.next(true);
      this.loggingService.info('PWA is running in installed mode');
    }
  }

  /**
   * Mostra prompt de instalação
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      this.loggingService.warn('Install prompt not available');
      return false;
    }

    try {
      this.loggingService.info('Showing PWA install prompt');
      const result = await this.deferredPrompt.prompt();
      this.loggingService.info('Install prompt result', { outcome: result.outcome });

      if (result.outcome === 'accepted') {
        this.isInstallableSubject.next(false);
        return true;
      }

      return false;
    } catch (error) {
      this.loggingService.error('Failed to show install prompt', { error });
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  /**
   * Força verificação de atualização
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      return await this.swUpdate.checkForUpdate();
    } catch (error) {
      this.loggingService.error('Manual update check failed', { error });
      return false;
    }
  }

  /**
   * Obtém informações sobre o cache
   */
  async getCacheInfo(): Promise<{ name: string; size: number }[]> {
    if (!('caches' in window)) {
      return [];
    }

    try {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async name => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, size: keys.length };
        })
      );

      return cacheInfo;
    } catch (error) {
      this.loggingService.error('Failed to get cache info', { error });
      return [];
    }
  }

  /**
   * Limpa cache do service worker
   */
  async clearCache(): Promise<void> {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      this.loggingService.info('All caches cleared');
      this.toastService.success('Cache do aplicativo foi limpo com sucesso', 'Cache Limpo');
    } catch (error) {
      this.loggingService.error('Failed to clear cache', { error });
      this.toastService.error('Não foi possível limpar o cache', 'Erro');
    }
  }
}
