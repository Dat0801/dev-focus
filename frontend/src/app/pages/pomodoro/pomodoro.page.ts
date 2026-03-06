import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController } from '@ionic/angular';
import { TaskService } from '../../services/task';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-pomodoro',
  templateUrl: './pomodoro.page.html',
  styleUrls: ['./pomodoro.page.scss'],
  standalone: false,
})
export class PomodoroPage implements OnInit, OnDestroy {
  timeDisplay: string = '25:00';
  timer: any;
  timeLeft: number = 25 * 60;
  totalTime: number = 25 * 60;
  isRunning: boolean = false;
  isBreak: boolean = false;
  
  tasks: any[] = [];
  selectedTaskId: string | null = null;
  selectedTaskName: string = 'Select a task';

  // Stats for the UI
  dailyGoalMinutes: number = 360; // 6h
  focusedMinutesToday: number = 270; // 4.5h
  
  get progressPercentage(): number {
    return (1 - (this.timeLeft / this.totalTime)) * 100;
  }

  get circularProgressOffset(): number {
    // Circumference = 2 * PI * r
    // For r=45, circumference is ~282.7
    const circumference = 282.7;
    return circumference - (this.progressPercentage / 100) * circumference;
  }

  get selectedTask(): any {
    return this.tasks.find(t => t.id === this.selectedTaskId);
  }

  constructor(
    private taskService: TaskService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadTasks();
    this.loadTodaySummary();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadTasks() {
    this.taskService.getTodayTasks().subscribe((res: any) => {
      this.tasks = res.data;
    });
  }

  loadTodaySummary() {
    this.http.get(`${environment.apiUrl}/pomodoro/today`).subscribe((res: any) => {
      this.focusedMinutesToday = res.focus_time_minutes;
    });
  }

  async selectTask() {
    const alert = await this.alertCtrl.create({
      header: 'Select Task',
      inputs: this.tasks.map(task => ({
        type: 'radio',
        label: task.title,
        value: task.id,
        checked: this.selectedTaskId === task.id
      })),
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Select',
          handler: (data) => {
            this.selectedTaskId = data;
          }
        }
      ]
    });
    await alert.present();
  }

  toggleTimer() {
    if (this.isRunning) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateDisplay();
      } else {
        this.completeSession();
      }
    }, 1000);
  }

  stopTimer() {
    this.isRunning = false;
    clearInterval(this.timer);
  }

  resetTimer() {
    this.stopTimer();
    this.timeLeft = this.isBreak ? 5 * 60 : 25 * 60;
    this.totalTime = this.timeLeft;
    this.updateDisplay();
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    this.timeDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async completeSession() {
    this.stopTimer();
    
    if (!this.isBreak) {
      const durationMinutes = Math.floor(this.totalTime / 60);
      const data = {
        task_id: this.selectedTaskId,
        start_time: new Date(Date.now() - this.totalTime * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: durationMinutes
      };

      this.http.post(`${environment.apiUrl}/pomodoro`, data).subscribe({
        next: () => {
          this.showToast('Focus session completed!');
          this.loadTasks(); // Refresh tasks to get updated work_hours/completed_pomodoros
          this.loadTodaySummary(); // Refresh daily stats
        },
        error: () => this.showToast('Failed to save session')
      });
    } else {
      this.showToast('Break over! Time to focus.');
    }

    this.isBreak = !this.isBreak;
    this.resetTimer();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'primary',
      position: 'top'
    });
    toast.present();
  }
}
