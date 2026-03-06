import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonModal, ModalController, AlertController, ToastController } from '@ionic/angular';
import { ProjectService } from '../../../../services/project';
import { TaskService } from '../../../../services/task';

@Component({
  selector: 'app-task-detail',
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.scss'],
  standalone: false,
})
export class TaskDetailComponent implements OnInit {
  @Input() task: any;
  @ViewChild('deadlineModal') deadlineModal!: IonModal;
  @ViewChild('startDateModal') startDateModal!: IonModal;
  @ViewChild('endDateModal') endDateModal!: IonModal;
  
  editedTask: any;
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
    private projectService: ProjectService,
    private taskService: TaskService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.editedTask = { ...this.task };
    
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
        this.showToast(newStatus === 'done' ? 'Task completed!' : 'Task reopened');
      },
      error: () => this.showToast('Failed to update status')
    });
  }

  updateTask() {
    const updateData = {
      title: this.editedTask.title,
      description: this.editedTask.description,
      priority: this.editedTask.priority,
      project_id: this.editedTask.project_id,
      due_date: this.editedTask.due_date,
      start_date: this.editedTask.start_date,
      end_date: this.editedTask.end_date,
      work_hours: this.editedTask.work_hours,
      estimated_pomodoros: this.editedTask.estimated_pomodoros
    };

    this.taskService.updateTask(this.editedTask.id, updateData).subscribe({
      next: (res: any) => {
        this.showToast('Task updated');
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
