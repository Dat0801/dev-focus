import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  metrics: any = {
    tasks_today: 12,
    completed_today: 8,
    focus_time_today: '4.5h',
    weekly_focus_hours: 15.2,
    productivity_streak: 15,
    daily_goal_percentage: 70
  };

  upcomingTasks: any[] = [
    { id: 1, title: 'Finish Dashboard Design', time: '10:00 AM', priority: 'High Priority', userInitials: 'JD', completed: false },
    { id: 2, title: 'Review Sprint Backlog', time: '09:00 AM', priority: 'Routine', userInitials: '', completed: true },
    { id: 3, title: 'Team Sync Meeting', time: '02:30 PM', priority: 'Meeting', userInitials: '', completed: false }
  ];

  currentDate: string = '';

  constructor(private http: HttpClient) {
    this.currentDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).format(new Date()).toUpperCase();
  }

  ngOnInit() {
    this.loadMetrics();
  }

  loadMetrics() {
    this.http.get(`${environment.apiUrl}/dashboard/metrics`).subscribe((res: any) => {
      this.metrics = res;
    });
  }

  ionViewWillEnter() {
    this.loadMetrics();
  }
}
