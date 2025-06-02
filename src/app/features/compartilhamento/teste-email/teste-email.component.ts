import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Componente de teste para validar funcionalidade de busca por email
 * Versão simplificada para teste de rota
 */
@Component({
  selector: 'app-teste-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
      <h2 class="text-xl font-semibold text-gray-900 mb-6">🧪 Teste de Validação de Email</h2>

      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <h3 class="text-sm font-medium text-green-900 mb-2">✅ Rota funcionando!</h3>
        <p class="text-sm text-green-700">A rota /teste-email está funcionando corretamente.</p>
      </div>

      <!-- Campo de entrada básico -->
      <div class="mb-4">
        <label for="emailTeste" class="block text-sm font-medium text-gray-700 mb-2">
          Digite um email para testar:
        </label>
        <input
          id="emailTeste"
          type="email"
          [(ngModel)]="emailDigitado"
          placeholder="exemplo@email.com"
          class="w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 class="text-sm font-medium text-blue-900 mb-1">📧 Email digitado:</h3>
        <p class="text-sm text-blue-700">{{ emailDigitado || 'Nenhum' }}</p>
      </div>

      <div class="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 class="text-sm font-medium text-yellow-900 mb-1">🔧 Próximos passos:</h3>
        <ul class="text-xs text-yellow-700 space-y-1">
          <li>✅ Rota configurada corretamente</li>
          <li>✅ Componente carrega sem erros</li>
          <li>⏳ Implementar validação completa</li>
        </ul>
      </div>
    </div>
  `,
})
export class TesteEmailComponent {
  emailDigitado = '';

  constructor() {
    console.log('🧪 TesteEmailComponent carregado com sucesso!');
  }
}
