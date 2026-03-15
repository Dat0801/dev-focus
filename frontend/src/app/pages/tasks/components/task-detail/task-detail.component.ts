import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonModal, ModalController, AlertController, ToastController } from '@ionic/angular';
import { ProjectService } from '../../../../services/project';
import { TaskService } from '../../../../services/task';
import { FormatWorkHoursPipe } from '../../../../pipes/format-work-hours.pipe';

@Component({
  selector: 'app-task-detail',
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss'],
  standalone: false,
  providers: [FormatWorkHoursPipe]
})
export class TaskDetailComponent implements OnInit {
  @Input() task: any;
  @ViewChild('deadlineModal') deadlineModal!: IonModal;
  @ViewChild('startDateModal') startDateModal!: IonModal;
  @ViewChild('endDateModal') endDateModal!: IonModal;
  
  editedTask: any;
  projects: any[] = [];
  isEditingWorkHours: boolean = false;
  
  priorities = [
    { label: 'P1', value: 'urgent' },
    { label: 'P2', value: 'high' },
    { label: 'P3', value: 'medium' },
    { label: 'P4', value: 'low' }
  ];
  pomodoroOptions = [1, 2, 3, '4+'];

  statuses = [
    { label: 'To Do', value: 'todo' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done', value: 'done' }
  ];

  constructor(
    private modalCtrl: ModalController,
    private projectService: ProjectService,
    private taskService: TaskService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.editedTask = { ...this.task };
    
    // Ensure work_logs is an array
    if (!this.editedTask.work_logs) {
      this.editedTask.work_logs = [];
    }

    if (!this.editedTask.sub_tasks) {
      this.editedTask.sub_tasks = [];
    }
    
    // Format work logs for UI
    this.editedTask.work_logs = this.editedTask.work_logs.map((log: any) => ({
      ...log,
      log_date: log.log_date ? new Date(log.log_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      duration_minutes: log.duration_minutes || 0
    }));

    // Format sub-tasks
    this.editedTask.sub_tasks = this.editedTask.sub_tasks.map((sub: any) => ({
      ...sub,
      due_date: sub.due_date ? new Date(sub.due_date).toISOString() : null,
    }));

    // Format dates for ion-datetime (it expects ISO string or similar)
    if (this.editedTask.due_date) {
      this.editedTask.due_date = new Date(this.editedTask.due_date).toISOString();
    }
    if (this.editedTask.start_date) {
      this.editedTask.start_date = new Date(this.editedTask.start_date).toISOString();
    }
    if (this.editedTask.end_date) {
      this.editedTask.end_date = new Date(this.editedTask.end_date).toISOString();
    }

    if (this.editedTask.estimated_pomodoros === null) {
      this.editedTask.estimated_pomodoros = 1;
    }
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data;
      }
    });
  }

  dismiss(data?: any) {
    this.modalCtrl.dismiss(data);
  }

  toggleStatus() {
    const newStatus = this.editedTask.status === 'done' ? 'todo' : 'done';
    this.taskService.updateTask(this.editedTask.id, { status: newStatus }).subscribe({
      next: () => {
        this.editedTask.status = newStatus;
        if (newStatus === 'done' && this.editedTask.sub_tasks) {
          this.editedTask.sub_tasks.forEach((sub: any) => sub.status = 'done');
        }
        this.showToast(newStatus === 'done' ? 'Task completed!' : 'Task reopened');
      },
      error: () => this.showToast('Failed to update status')
    });
  }

  addWorkLog() {
    this.editedTask.work_logs.push({
      log_date: new Date().toISOString().split('T')[0],
      description: '',
      duration_minutes: 0
    });
  }

  removeWorkLog(index: number) {
    this.editedTask.work_logs.splice(index, 1);
    this.onWorkLogItemChange();
  }

  onPasteWorkLog(event: ClipboardEvent, index: number) {
    let pastedText = event.clipboardData?.getData('text');
    if (!pastedText) return;

    // Remove BOM and other potential invisible characters at the beginning
    pastedText = pastedText.replace(/^\uFEFF/, '').trim();

    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    
    // Check if the pasted text matches our special format: DD.MM.YYYY: ...
    // Using a more flexible regex for day/month
    const dateRegex = /\d{1,2}\.\d{1,2}\.\d{4}/;
    const isSpecialFormat = lines.some(line => dateRegex.test(line.trim()));

    if (isSpecialFormat) {
      event.preventDefault();
      
      const parsedLogs: any[] = [];
      lines.forEach(line => {
        const parsed = this.parseSingleWorkLogLine(line.trim());
        if (parsed) {
          parsedLogs.push(parsed);
        }
      });

      if (parsedLogs.length > 0) {
        const currentLog = this.editedTask.work_logs[index];
        const isEmpty = !currentLog.description && (!currentLog.duration_minutes || currentLog.duration_minutes === 0);

        if (isEmpty) {
          // Replace current empty log
          this.editedTask.work_logs.splice(index, 1, ...parsedLogs);
        } else {
          // Insert after current log
          this.editedTask.work_logs.splice(index + 1, 0, ...parsedLogs);
        }
        this.calculateTotalHours();
      }
    }
  }

  private parseSingleWorkLogLine(line: string) {
    // Supports: 
    // 1. DD.MM.YYYY: Description: Duration
    // 2. DD.MM.YYYY: Duration
    const parts = line.split(':').map(p => p.trim());
    if (parts.length < 2) return null;

    const dateStr = parts[0];
    let durationStr = '';
    let description = '';

    if (parts.length === 2) {
      // Case: DD.MM.YYYY: Duration
      durationStr = parts[1];
      description = '';
    } else {
      // Case: DD.MM.YYYY: Description: Duration
      durationStr = parts[parts.length - 1];
      description = parts.slice(1, -1).join(':').trim();
    }

    // Parse Date: DD.MM.YYYY -> YYYY-MM-DD
    // Using regex to extract only digits to avoid invisible characters
    const dateMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!dateMatch) return null;
    
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    const formattedDate = `${year}-${month}-${day}`;

    // Parse Duration: 1h, 30p, etc.
    let durationMinutes = 0;
    const durationMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*([hp])/i);
    if (durationMatch) {
      const value = parseFloat(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit === 'h') {
        durationMinutes = value * 60;
      } else if (unit === 'p') {
        durationMinutes = value;
      }
    } else {
      const val = parseFloat(durationStr);
      if (!isNaN(val)) durationMinutes = val; // Default to minutes if no unit
    }

    return {
      log_date: formattedDate,
      description: description,
      duration_minutes: durationMinutes
    };
  }

  onWorkLogItemChange() {
    this.calculateTotalHours();
  }

  onPasteSubTask(event: ClipboardEvent, index: number) {
    const pastedText = event.clipboardData?.getData('text');
    if (!pastedText) return;

    const lines = pastedText.split('\n').map(line => line.trim()).filter(line => line !== '');
    if (lines.length > 1) {
      event.preventDefault();
      
      const newSubTasks = lines.map(line => ({
        title: line,
        status: 'todo',
        priority: 'medium',
        parent_id: this.editedTask.id,
        project_id: this.editedTask.project_id,
        user_id: this.editedTask.user_id
      }));

      const currentSubTask = this.editedTask.sub_tasks[index];
      const isEmpty = !currentSubTask.title;

      if (isEmpty) {
        // Replace current empty sub-task
        this.editedTask.sub_tasks.splice(index, 1, ...newSubTasks);
      } else {
        // Insert after current sub-task
        this.editedTask.sub_tasks.splice(index + 1, 0, ...newSubTasks);
      }
    }
  }

  calculateTotalHours() {
    let totalMinutes = 0;
    this.editedTask.work_logs.forEach((log: any) => {
      const mins = parseFloat(log.duration_minutes as any);
      totalMinutes += isNaN(mins) ? 0 : mins;
    });
    this.editedTask.work_hours = parseFloat((totalMinutes / 60).toFixed(2));
  }

  addSubTask() {
    this.editedTask.sub_tasks.push({
      title: '',
      status: 'todo',
      priority: 'medium',
      parent_id: this.editedTask.id,
      project_id: this.editedTask.project_id,
      user_id: this.editedTask.user_id
    });
  }

  removeSubTask(index: number) {
    const subTask = this.editedTask.sub_tasks[index];
    if (subTask.id) {
      this.taskService.deleteTask(subTask.id).subscribe({
        next: () => {
          this.editedTask.sub_tasks.splice(index, 1);
          this.showToast('Sub-task deleted');
        },
        error: () => this.showToast('Failed to delete sub-task')
      });
    } else {
      this.editedTask.sub_tasks.splice(index, 1);
    }
  }

  toggleSubTaskStatus(index: number) {
    const subTask = this.editedTask.sub_tasks[index];
    const newStatus = subTask.status === 'done' ? 'todo' : 'done';
    
    if (subTask.id) {
      this.taskService.updateTask(subTask.id, { status: newStatus }).subscribe({
        next: () => {
          subTask.status = newStatus;
        },
        error: () => this.showToast('Failed to update sub-task status')
      });
    } else {
      subTask.status = newStatus;
    }
  }

  updateTask() {
    // Recalculate just in case
    this.calculateTotalHours();

    // Prepare work logs for saving
    const work_logs = this.editedTask.work_logs.map((log: any) => ({
      log_date: log.log_date,
      description: log.description,
      duration_minutes: log.duration_minutes || 0
    }));

    // Prepare sub tasks for saving
    const sub_tasks = this.editedTask.sub_tasks.map((sub: any) => ({
      id: sub.id,
      title: sub.title,
      status: sub.status,
      priority: sub.priority,
      due_date: sub.due_date
    }));

    const updateData = {
      ...this.editedTask,
      work_logs,
      sub_tasks
    };

    this.taskService.updateTask(this.editedTask.id, updateData).subscribe({
      next: (res: any) => {
        this.dismiss(res.data);
      },
      error: () => this.showToast('Failed to update task')
    });
  }

  async deleteTask() {
    const alert = await this.alertCtrl.create({
      header: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.taskService.deleteTask(this.editedTask.id).subscribe({
              next: () => {
                this.showToast('Task deleted');
                this.dismiss({ deleted: true, id: this.editedTask.id });
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  selectProject(projectId: string) {
    this.editedTask.project_id = projectId;
  }

  selectPriority(priority: string) {
    this.editedTask.priority = priority;
  }

  selectStatus(status: string) {
    this.editedTask.status = status;
  }

  openDeadlineModal() {
    this.deadlineModal.present();
  }

  openStartDateModal() {
    this.startDateModal.present();
  }

  openEndDateModal() {
    this.endDateModal.present();
  }

  onDateChange(type: 'deadline' | 'start' | 'end') {
    if (type === 'deadline') {
      this.deadlineModal.dismiss();
    } else if (type === 'start') {
      this.startDateModal.dismiss();
    } else if (type === 'end') {
      this.endDateModal.dismiss();
    }
  }

  selectPomodoro(option: number | string) {
    if (option === '4+') {
      this.editedTask.estimated_pomodoros = 4;
    } else {
      this.editedTask.estimated_pomodoros = option as number;
    }
  }

  incrementPomodoro() {
    this.editedTask.completed_pomodoros = (this.editedTask.completed_pomodoros || 0) + 1;
    this.updatePomodoros();
  }

  decrementPomodoro() {
    if (this.editedTask.completed_pomodoros > 0) {
      this.editedTask.completed_pomodoros--;
      this.updatePomodoros();
    }
  }

  updatePomodoros() {
    this.taskService.updateTask(this.editedTask.id, { 
      completed_pomodoros: this.editedTask.completed_pomodoros 
    }).subscribe();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'dark'
    });
    toast.present();
  }
}
