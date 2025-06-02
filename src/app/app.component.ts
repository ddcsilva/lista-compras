import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterOutlet, ToastComponent, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Vai na Lista';

  constructor(public authService: AuthService) {}
}
