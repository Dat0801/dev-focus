import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  public appPages = [
    { title: 'Home', url: '/dashboard', icon: 'home' },
    { title: 'Task', url: '/tasks', icon: 'checkbox' },
    { title: 'Pomodoro', url: '/pomodoro', icon: 'timer' },
    { title: 'Project', url: '/projects', icon: 'folder' },
    { title: 'Profile', url: '/profile', icon: 'person' },
  ];

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigateByUrl('/login');
    });
  }
}
