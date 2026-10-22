import { Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {
  readonly brandName = input<string>('OrderFlow');
  readonly headline = input<string>('Manage Orders. Simplify Operations.');
  readonly description = input<string>(
    'The unified enterprise platform for high-velocity order fulfillment, warehouse orchestration, and real-time inventory visibility.'
  );
}
