import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'OrderFlow — Sign In'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'OrderFlow — Create Customer Account'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
