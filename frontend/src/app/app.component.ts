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
    { title: 'Home', url: '/tabs/dashboard', icon: 'home' },
    { title: 'Task', url: '/tabs/tasks', icon: 'checkbox' },
    { title: 'Pomodoro', url: '/tabs/pomodoro', icon: 'timer' },
    { title: 'Project', url: '/tabs/projects', icon: 'folder' },
    { title: 'Profile', url: '/tabs/profile', icon: 'person' },
  ];

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  logout() {
    this.authService.logout().subscribe({
      complete: () => {
        this.router.navigateByUrl('/login');
      },
      error: () => {
        // Vẫn chuyển hướng về login ngay cả khi API logout lỗi
        this.router.navigateByUrl('/login');
      }
    });
  }
}
