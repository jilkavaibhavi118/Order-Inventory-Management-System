import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  standalone: true,
  imports: [AuthLayoutComponent],
  template: `
    <app-auth-layout [headline]="'Test Headline'">
      <div id="test-form-content">Projected Form Content</div>
    </app-auth-layout>
  `
})
class TestHostComponent {}

describe('AuthLayoutComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, AuthLayoutComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should project content correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.querySelector('#test-form-content');
    expect(content).toBeTruthy();
    expect(content?.textContent).toContain('Projected Form Content');
  });

  it('should display brand headline and name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-headline')?.textContent).toContain('Test Headline');
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('OrderFlow');
  });
});
