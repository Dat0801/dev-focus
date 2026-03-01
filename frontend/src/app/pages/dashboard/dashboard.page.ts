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
    tasks_today: 0,
    completed_today: 0,
    focus_time_today: 0,
    weekly_focus_hours: 0,
    productivity_streak: 0
  };

  constructor(private http: HttpClient) {}

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
