import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, PreferredPanel } from '../../core/auth/auth.service';

@Component({
  selector: 'app-select-panel',
  standalone: true,
  template: `
    <main class="panel-selection">
      <section class="selection-card" aria-labelledby="selection-title">
        <div class="brand-badge-wrap">
          <span class="eyebrow"><i class="pi pi-box"></i> OrderFlow Portal</span>
        </div>
        <h1 id="selection-title">Select Your Workspace</h1>
        <p class="description">Choose where you'd like to continue your session.</p>

        <div class="panel-options">
          <button type="button" class="panel-option customer-option" (click)="selectPanel('customer')">
            <span class="option-icon customer-icon" aria-hidden="true">
              <i class="pi pi-shopping-bag"></i>
            </span>
            <span class="option-copy">
              <strong>Customer Marketplace</strong>
              <span>Browse products, check live availability & place orders.</span>
            </span>
            <span class="option-arrow" aria-hidden="true">
              <i class="pi pi-arrow-right"></i>
            </span>
          </button>

          <button type="button" class="panel-option admin-option" (click)="selectPanel('admin')">
            <span class="option-icon admin-icon" aria-hidden="true">
              <i class="pi pi-chart-bar"></i>
            </span>
            <span class="option-copy">
              <strong>Admin & Logistics Hub</strong>
              <span>Manage multi-warehouse inventory, suppliers, and fulfillment.</span>
            </span>
            <span class="option-arrow" aria-hidden="true">
              <i class="pi pi-arrow-right"></i>
            </span>
          </button>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background:
          radial-gradient(ellipse at top left, rgba(79, 70, 229, 0.15), transparent 45%),
          radial-gradient(ellipse at bottom right, rgba(124, 58, 237, 0.1), transparent 45%),
          #f8fafc;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }

      .panel-selection {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 2rem 1.25rem;
      }

      .selection-card {
        width: min(100%, 640px);
        padding: clamp(2rem, 5vw, 3.2rem);
        border: 1px solid #e2e8f0;
        border-radius: 1.75rem;
        background: #ffffff;
        box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.1);
      }

      .brand-badge-wrap {
        display: inline-flex;
        margin-bottom: 0.5rem;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin: 0;
        color: #4f46e5;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: #eef2ff;
        padding: 0.3rem 0.75rem;
        border-radius: 9999px;
      }

      h1 {
        margin: 0.85rem 0 0;
        color: #0f172a;
        font-size: clamp(2rem, 5.5vw, 2.6rem);
        font-weight: 850;
        letter-spacing: -0.04em;
        line-height: 1.15;
      }

      .description {
        margin: 0.65rem 0 2rem;
        color: #64748b;
        font-size: 0.98rem;
      }

      .panel-options {
        display: grid;
        gap: 1.1rem;
      }

      .panel-option {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        width: 100%;
        padding: 1.25rem;
        border: 1px solid #e2e8f0;
        border-radius: 1.25rem;
        background: #ffffff;
        color: #0f172a;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .panel-option:hover,
      .panel-option:focus-visible {
        border-color: #818cf8;
        box-shadow: 0 12px 28px -4px rgba(79, 70, 229, 0.15);
        transform: translateY(-2px);
      }

      .panel-option:focus-visible {
        outline: 3px solid rgba(79, 70, 229, 0.25);
        outline-offset: 3px;
      }

      .option-icon {
        display: grid;
        flex: 0 0 3.5rem;
        width: 3.5rem;
        height: 3.5rem;
        place-items: center;
        border-radius: 1.1rem;
        font-size: 1.45rem;
      }

      .customer-icon {
        background: linear-gradient(135deg, #eef2ff, #e0e7ff);
        color: #4f46e5;
      }

      .admin-icon {
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        color: #059669;
      }

      .option-copy {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 0.3rem;
        min-width: 0;
      }

      .option-copy strong {
        font-size: 1.12rem;
        font-weight: 750;
        color: #0f172a;
      }

      .option-copy span {
        color: #64748b;
        font-size: 0.88rem;
        line-height: 1.4;
      }

      .option-arrow {
        color: #94a3b8;
        font-size: 1.1rem;
        transition: transform 0.2s ease, color 0.2s ease;
      }

      .panel-option:hover .option-arrow {
        color: #4f46e5;
        transform: translateX(4px);
      }

      @media (max-width: 500px) {
        .panel-option {
          gap: 0.85rem;
          padding: 1rem;
        }

        .option-icon {
          width: 3rem;
          height: 3rem;
          flex: 0 0 3rem;
          font-size: 1.25rem;
        }

        .option-copy span {
          font-size: 0.78rem;
        }
      }
    `
  ]
})
export class SelectPanelComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected selectPanel(panel: PreferredPanel): void {
    this.authService.setPreferredPanel(panel);
    this.router.navigate([panel === 'admin' ? '/dashboard' : '/shop']);
  }
}
