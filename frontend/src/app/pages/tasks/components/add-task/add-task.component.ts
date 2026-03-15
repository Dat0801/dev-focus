import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonModal, ModalController } from '@ionic/angular';
import { ProjectService } from '../../../../services/project';

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.scss'],
  standalone: false,
})
export class AddTaskComponent implements OnInit {
  @ViewChild('deadlineModal') deadlineModal!: IonModal;
  @ViewChild('startDateModal') startDateModal!: IonModal;
  @ViewChild('endDateModal') endDateModal!: IonModal;
  
  @Input() selectedProjectId: string | null = null;
  
  taskName: string = '';
  description: string = '';
  selectedPriority: string = 'medium';
  dueDate: string | null = null;
  startDate: string | null = null;
  endDate: string | null = null;
  workHours: number | null = null;
  workLogs: any[] = [];
  subTasks: any[] = [];
  estimatedPomodoros: number = 1;

  projects: any[] = [];

  priorities = [
    { label: 'P1', value: 'urgent' },
    { label: 'P2', value: 'high' },
    { label: 'P3', value: 'medium' },
    { label: 'P4', value: 'low' }
  ];
  pomodoroOptions = [1, 2, 3, '4+'];

  constructor(
    private modalCtrl: ModalController,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.addWorkLog(); // Start with one empty log
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data;
        if (this.projects.length > 0 && !this.selectedProjectId) {
          this.selectedProjectId = this.projects[0].id;
        }
      }
    });
  }

  addWorkLog() {
    this.workLogs.push({
      log_date: new Date().toISOString().split('T')[0],
      description: '',
      duration_minutes: 0
    });
  }

  removeWorkLog(index: number) {
    this.workLogs.splice(index, 1);
    this.calculateTotalHours();
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
        const currentLog = this.workLogs[index];
        const isEmpty = !currentLog.description && (!currentLog.duration_minutes || currentLog.duration_minutes === 0);

        if (isEmpty) {
          // Replace current empty log
          this.workLogs.splice(index, 1, ...parsedLogs);
        } else {
          // Insert after current log
          this.workLogs.splice(index + 1, 0, ...parsedLogs);
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
        priority: 'medium'
      }));

      const currentSubTask = this.subTasks[index];
      const isEmpty = !currentSubTask.title;

      if (isEmpty) {
        // Replace current empty sub-task
        this.subTasks.splice(index, 1, ...newSubTasks);
      } else {
        // Insert after current sub-task
        this.subTasks.splice(index + 1, 0, ...newSubTasks);
      }
    }
  }

  calculateTotalHours() {
    let totalMinutes = 0;
    this.workLogs.forEach((log: any) => {
      const mins = parseFloat(log.duration_minutes as any);
      totalMinutes += isNaN(mins) ? 0 : mins;
    });
    this.workHours = parseFloat((totalMinutes / 60).toFixed(2));
  }

  addSubTask() {
    this.subTasks.push({
      title: '',
      status: 'todo',
      priority: 'medium'
    });
  }

  removeSubTask(index: number) {
    this.subTasks.splice(index, 1);
  }

  toggleSubTaskStatus(index: number) {
    const subTask = this.subTasks[index];
    subTask.status = subTask.status === 'done' ? 'todo' : 'done';
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  openDeadlineModal() {
    if (!this.dueDate) {
      this.dueDate = new Date().toISOString();
    }
    this.deadlineModal.present();
  }

  openStartDateModal() {
    if (!this.startDate) {
      this.startDate = new Date().toISOString();
    }
    this.startDateModal.present();
  }

  openEndDateModal() {
    if (!this.endDate) {
      this.endDate = new Date().toISOString();
    }
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

  selectProject(projectId: string) {
    this.selectedProjectId = projectId;
  }

  selectPriority(priority: string) {
    this.selectedPriority = priority;
  }

  selectPomodoro(option: number | string) {
    if (option === '4+') {
      this.estimatedPomodoros = 4;
    } else {
      this.estimatedPomodoros = option as number;
    }
  }

  createTask() {
    this.calculateTotalHours();
    this.modalCtrl.dismiss({
      title: this.taskName,
      description: this.description,
      project_id: this.selectedProjectId,
      priority: this.selectedPriority,
      due_date: this.dueDate,
      start_date: this.startDate,
      end_date: this.endDate,
      work_hours: this.workHours,
      work_logs: this.workLogs.map((log: any) => ({
        log_date: log.log_date,
        description: log.description,
        duration_minutes: log.duration_minutes
      })),
      sub_tasks: this.subTasks.map((sub: any) => ({
        title: sub.title,
        status: sub.status,
        priority: sub.priority
      })),
      estimated_pomodoros: this.estimatedPomodoros
    });
  }
}
