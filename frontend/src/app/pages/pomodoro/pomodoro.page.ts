import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
  
  // Track elapsed time in current run to save on stop/refresh
  private sessionSeconds: number = 0;
  private sessionStartTime: number | null = null;

  tasks: any[] = [];
  selectedTaskId: string | null = null;
  selectedTaskName: string = 'Select a task';

  // Stats for the UI
  dailyGoalMinutes: number = 360; // 6h
  focusedMinutesToday: number = 270; // 4.5h
  
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: any) {
    if (this.isRunning && !this.isBreak && this.selectedTaskId) {
      this.saveSessionSync();
    }
  }

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

  ionViewWillEnter() {
    this.loadTasks();
    this.loadTodaySummary();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadTasks() {
    this.taskService.getTasks({ include_subtasks: true, per_page: 'all' }).subscribe({
      next: (res: any) => {
        const tasksArray = Array.isArray(res) ? res : (res.data || []);
        // Filter tasks that are NOT done and DON'T have sub-tasks
        // (We only want the leaf tasks or sub-tasks for focus timer)
        this.tasks = tasksArray.filter((t: any) => {
          const isNotDone = t.status !== 'done';
          const hasSubTasks = t.sub_tasks && t.sub_tasks.length > 0;
          return isNotDone && !hasSubTasks;
        });
        console.log('Loaded tasks for pomodoro:', this.tasks);
      },
      error: (err) => {
        console.error('Error loading tasks for pomodoro:', err);
        this.showToast('Failed to load tasks');
      }
    });
  }

  loadTodaySummary() {
    this.http.get(`${environment.apiUrl}/pomodoro/today`).subscribe((res: any) => {
      this.focusedMinutesToday = res.focus_time_minutes;
    });
  }

  async selectTask() {
    if (this.tasks.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'No pending tasks found. Create a task first!',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Select Task',
      inputs: this.tasks.map(task => {
        let label = task.title;
        if (task.parent_id && task.parent) {
          label = `${task.parent.title} > ${task.title}`;
        }
        return {
          type: 'radio',
          label: label,
          value: task.id,
          checked: this.selectedTaskId === task.id
        };
      }),
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
    this.sessionSeconds = 0;
    this.sessionStartTime = Date.now();
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.sessionSeconds++;
        this.updateDisplay();
      } else {
        this.completeSession();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.isRunning) {
      this.isRunning = false;
      clearInterval(this.timer);
      
      // Save session if we were in focus mode and some time elapsed
      if (!this.isBreak && this.sessionSeconds > 0) {
        this.saveSession(this.sessionSeconds);
      }
      this.sessionSeconds = 0;
      this.sessionStartTime = null;
    }
  }

  private saveSession(seconds: number) {
    if (!this.selectedTaskId) return;

    const durationMinutes = seconds / 60;
    // Don't save sessions shorter than 10 seconds unless it's a completion
    if (seconds < 10 && this.timeLeft > 0) return;

    const startTime = this.sessionStartTime 
      ? new Date(this.sessionStartTime).toISOString() 
      : new Date(Date.now() - seconds * 1000).toISOString();

    const data = {
      task_id: this.selectedTaskId,
      start_time: startTime,
      end_time: new Date().toISOString(),
      duration_minutes: durationMinutes
    };

    this.http.post(`${environment.apiUrl}/pomodoro`, data).subscribe({
      next: () => {
        this.loadTasks();
        this.loadTodaySummary();
      },
      error: () => console.error('Failed to save session')
    });
  }

  /**
   * Used for beforeunload to ensure request is sent even if browser closes
   */
  private saveSessionSync() {
    if (!this.selectedTaskId || this.sessionSeconds < 10) return;

    const durationMinutes = this.sessionSeconds / 60;
    const startTime = this.sessionStartTime 
      ? new Date(this.sessionStartTime).toISOString() 
      : new Date(Date.now() - this.sessionSeconds * 1000).toISOString();

    const data = {
      task_id: this.selectedTaskId,
      start_time: startTime,
      end_time: new Date().toISOString(),
      duration_minutes: durationMinutes
    };

    const token = localStorage.getItem('token');
    if (!token) return;

    // Use fetch with keepalive for more reliable delivery on close with custom headers
    fetch(`${environment.apiUrl}/pomodoro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
      keepalive: true
    });
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
    // When completed, we want to save the session and toggle break
    const secondsToSave = this.sessionSeconds;
    this.stopTimer(); // This will call saveSession if sessionSeconds > 0
    
    if (this.isBreak) {
      this.showToast('Break over! Time to focus.');
    } else {
      this.showToast('Focus session completed!');
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
