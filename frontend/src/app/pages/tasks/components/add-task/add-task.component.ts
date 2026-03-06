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
    this.modalCtrl.dismiss({
      title: this.taskName,
      description: this.description,
      project_id: this.selectedProjectId,
      priority: this.selectedPriority,
      due_date: this.dueDate,
      start_date: this.startDate,
      end_date: this.endDate,
      work_hours: this.workHours,
      estimated_pomodoros: this.estimatedPomodoros
    });
  }
}
