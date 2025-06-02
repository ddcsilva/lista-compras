import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { AuthService } from './core/services/auth.service';

/**
 * Componente raiz da aplicação
 * Responsável por renderizar as rotas configuradas e o sistema de notificações
 * Exibe loading durante inicialização do Firebase Authentication
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoadingComponent],
  template: `
    @if (authService.isCarregando()) {
      <app-loading
        message="Inicializando aplicação..."
        subMessage="Verificando autenticação"
      />
    } @else {
      <router-outlet></router-outlet>
    }

    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {
  title = 'Vai na Lista';

  constructor(public authService: AuthService) {}
}
