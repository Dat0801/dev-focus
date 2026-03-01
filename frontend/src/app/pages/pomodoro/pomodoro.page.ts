import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController } from '@ionic/angular';
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
  isRunning: boolean = false;
  isBreak: boolean = false;
  
  tasks: any[] = [];
  selectedTaskId: string | null = null;

  constructor(
    private taskService: TaskService,
    private toastCtrl: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadTasks();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadTasks() {
    this.taskService.getTasks({ status: 'todo' }).subscribe((res: any) => {
      this.tasks = res.data;
    });
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
      const data = {
        task_id: this.selectedTaskId,
        start_time: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: 25
      };

      this.http.post(`${environment.apiUrl}/pomodoro`, data).subscribe({
        next: () => this.showToast('Focus session completed!'),
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
