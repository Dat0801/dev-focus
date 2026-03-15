import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ToastController, AlertController } from '@ionic/angular';
import { TaskService } from '../../services/task';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-pomodoro',
  templateUrl: './pomodoro.page.html',
  styleUrls: ['./pomodoro.page.scss'],
  standalone: false,
})
export class PomodoroPage implements OnInit, OnDestroy {
  focusMinutes: number = 25;
  breakMinutes: number = 5;

  timeDisplay: string = '25:00';
  timer: any;
  timeLeft: number = 25 * 60;
  totalTime: number = 25 * 60;
  isRunning: boolean = false;
  isBreak: boolean = false;

  private originalTitle: string = 'Dev Focus';

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
    private http: HttpClient,
    private titleService: Title,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.originalTitle = this.titleService.getTitle();
    this.loadUserSettings();
    this.loadTasks();
    this.loadTodaySummary();
    this.requestNotificationPermission();
  }

  private loadUserSettings() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.focusMinutes = user.pomodoro_focus_duration || 25;
        this.breakMinutes = user.pomodoro_break_duration || 5;
        
        if (!this.isRunning) {
          this.resetTimer();
        }
      }
    });
  }

  private async requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        await Notification.requestPermission();
      }
    }
  }

  private sendNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: 'assets/icon/favicon.png' // Adjust icon path if needed
      });
    }
  }

  ionViewWillEnter() {
    this.originalTitle = this.titleService.getTitle();
    this.loadTasks();
    this.loadTodaySummary();
  }

  ngOnDestroy() {
    this.stopTimer();
    this.titleService.setTitle(this.originalTitle);
  }

  ionViewWillLeave() {
    this.titleService.setTitle(this.originalTitle);
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
    this.http.get(`${environment.apiUrl}/pomodoro/today`).subscribe({
      next: (res: any) => {
        this.focusedMinutesToday = res.focus_time_minutes || 0;
      },
      error: (err) => {
        console.error('Error loading today summary:', err);
        // Default to 0 or cached value on error to avoid breaking the UI
        this.focusedMinutesToday = 0;
      }
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
    this.timeLeft = this.isBreak ? this.breakMinutes * 60 : this.focusMinutes * 60;
    this.totalTime = this.timeLeft;
    this.updateDisplay();
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    this.timeDisplay = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update browser title
    if (this.isRunning) {
      this.titleService.setTitle(`${this.timeDisplay} - ${this.isBreak ? 'Break' : 'Focus'}`);
    } else {
      this.titleService.setTitle(this.originalTitle);
    }
  }

  async completeSession() {
    // When manually skipping or timer ends, save session if in Focus mode
    if (!this.isBreak && this.sessionSeconds > 0) {
      this.saveSession(this.sessionSeconds);
    }
    
    this.isRunning = false;
    clearInterval(this.timer);
    this.sessionSeconds = 0;
    this.sessionStartTime = null;
    
    if (this.isBreak) {
      this.showToast('Break skipped! Time to focus.');
      this.sendNotification('Dev Focus', 'Break over! Time to focus.');
    } else {
      this.showToast('Focus session completed!');
      this.sendNotification('Dev Focus', 'Focus session completed! Take a break.');
    }

    this.isBreak = !this.isBreak;
    this.resetTimer();
  }

  async openSettings() {
    if (this.isRunning) {
      const confirm = await this.alertCtrl.create({
        header: 'Timer is running',
        message: 'Do you want to stop the timer and change settings?',
        buttons: [
          { text: 'No', role: 'cancel' },
          {
            text: 'Yes',
            handler: () => {
              this.stopTimer();
              this.showSettingsAlert();
            }
          }
        ]
      });
      await confirm.present();
    } else {
      this.showSettingsAlert();
    }
  }

  private async showSettingsAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Timer Settings',
      inputs: [
        {
          name: 'focusMinutes',
          type: 'number',
          placeholder: 'Focus Minutes',
          value: this.focusMinutes.toString(),
          min: 1,
          max: 60
        },
        {
          name: 'breakMinutes',
          type: 'number',
          placeholder: 'Break Minutes',
          value: this.breakMinutes.toString(),
          min: 1,
          max: 30
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (data) => {
            const newFocus = parseInt(data.focusMinutes, 10);
            const newBreak = parseInt(data.breakMinutes, 10);
            
            if (!isNaN(newFocus) && newFocus > 0 && !isNaN(newBreak) && newBreak > 0) {
              this.authService.updatePomodoroSettings(newFocus, newBreak).subscribe({
                next: () => {
                  this.focusMinutes = newFocus;
                  this.breakMinutes = newBreak;
                  this.resetTimer();
                  this.showToast('Timer settings saved to profile!');
                },
                error: (err) => {
                  console.error('Failed to save settings:', err);
                  this.showToast('Failed to save settings to profile');
                }
              });
            } else {
              this.showToast('Invalid input! Please enter positive numbers.');
              return false; // keep alert open
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
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
