import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ColorTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly theme = signal<ColorTheme>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(nextTheme);
    this.applyTheme(nextTheme);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('orderflow-theme', nextTheme);
    }
  }

  private getInitialTheme(): ColorTheme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'dark';
    }

    return localStorage.getItem('orderflow-theme') === 'light' ? 'light' : 'dark';
  }

  private applyTheme(theme: ColorTheme): void {
    const rootElement = this.document.documentElement;
    if (rootElement && typeof rootElement.setAttribute === 'function') {
      rootElement.setAttribute('data-theme', theme);
    }
  }
}
