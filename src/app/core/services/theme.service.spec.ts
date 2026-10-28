import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem('orderflow-theme');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem('orderflow-theme');
    document.documentElement.removeAttribute('data-theme');
  });

  it('starts in light mode by default', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('toggles and persists the selected theme', () => {
    const service = TestBed.inject(ThemeService);

    service.toggleTheme();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('orderflow-theme')).toBe('dark');
  });
});
