import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ReportService } from '../../services/report';
import { LoadingController, ToastController } from '@ionic/angular';

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
    focus_time_today: '0h',
    weekly_focus_hours: 0,
    productivity_streak: 0,
    daily_goal_percentage: 0
  };

  upcomingTasks: any[] = [];
  weeklyPerformance: number[] = [0, 0, 0, 0, 0, 0, 0];

  currentDate: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private reportService: ReportService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    this.currentDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    }).format(new Date()).toUpperCase();
  }

  ngOnInit() {
    this.loadData();
  }

  viewAllTasks() {
    this.router.navigate(['/tabs/tasks']);
  }

  viewTasks(filter: string) {
    // Navigate to tasks tab with a filter
    this.router.navigate(['/tabs/tasks'], { queryParams: { filter } });
  }

  viewProject(projectId: string) {
    this.router.navigate(['/tabs/projects', projectId]);
  }

  loadData() {
    this.loadMetrics();
    this.loadUpcomingTasks();
  }

  loadMetrics() {
    this.http.get(`${environment.apiUrl}/dashboard/metrics`).subscribe((res: any) => {
      this.metrics = res;
      
      // Format focus time (e.g., from minutes to 4.5h or 30m)
      if (typeof res.focus_time_today === 'number') {
        if (res.focus_time_today >= 60) {
          this.metrics.focus_time_today = (res.focus_time_today / 60).toFixed(1) + 'h';
        } else {
          this.metrics.focus_time_today = res.focus_time_today + 'm';
        }
      }

      if (res.weekly_performance) {
        // Map counts to percentages (max 10 tasks for 100% height)
        this.weeklyPerformance = res.weekly_performance.map((count: number) => {
          const percentage = (count / 10) * 100;
          return percentage > 100 ? 100 : percentage;
        });
      }
    });
  }

  loadUpcomingTasks() {
    this.http.get(`${environment.apiUrl}/tasks/upcoming`).subscribe((res: any) => {
      // If the backend returns a wrapped response (e.g., from TaskResource::collection)
      this.upcomingTasks = res.data || res;
    });
  }

  async exportReport() {
    const loading = await this.loadingCtrl.create({
      message: 'Exporting report...',
      spinner: 'crescent'
    });
    await loading.present();

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    try {
      await this.reportService.exportTasksToExcel(currentMonth);
      const toast = await this.toastCtrl.create({
        message: 'Report exported successfully!',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Failed to export report.',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  ionViewWillEnter() {
    this.loadData();
  }
}
