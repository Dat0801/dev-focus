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
    this.workLogs.unshift({
      log_date: new Date().toISOString().split('T')[0],
      description: '',
      duration_hours: '0.00',
      duration_minutes: 0
    });
  }

  removeWorkLog(index: number) {
    this.workLogs.splice(index, 1);
    this.calculateTotalHours();
  }

  onWorkLogItemChange() {
    this.calculateTotalHours();
  }

  calculateTotalHours() {
    let totalMinutes = 0;
    this.workLogs.forEach((log: any) => {
      const mins = parseFloat(log.duration_hours) * 60;
      log.duration_minutes = isNaN(mins) ? 0 : mins;
      totalMinutes += log.duration_minutes;
    });
    this.workHours = parseFloat((totalMinutes / 60).toFixed(2));
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
      estimated_pomodoros: this.estimatedPomodoros
    });
  }
}
