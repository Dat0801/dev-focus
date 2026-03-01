import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { TaskService } from '../../services/task';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit {
  tasks: any[] = [];
  filter: string = 'all';

  constructor(
    private taskService: TaskService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadTasks();
  }

  async loadTasks() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading tasks...'
    });
    await loading.present();

    let obs;
    if (this.filter === 'today') {
      obs = this.taskService.getTodayTasks();
    } else if (this.filter === 'upcoming') {
      obs = this.taskService.getUpcomingTasks();
    } else {
      obs = this.taskService.getTasks();
    }

    obs.subscribe({
      next: (res: any) => {
        this.tasks = res.data;
        loading.dismiss();
      },
      error: (err) => {
        loading.dismiss();
        this.showToast('Failed to load tasks');
      }
    });
  }

  async addTask() {
    const alert = await this.alertCtrl.create({
      header: 'New Task',
      inputs: [
        { name: 'title', type: 'text', placeholder: 'Task title' },
        { name: 'description', type: 'textarea', placeholder: 'Description' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (!data.title) return false;
            this.taskService.createTask(data).subscribe({
              next: () => {
                this.loadTasks();
                this.showToast('Task added');
              },
              error: () => this.showToast('Failed to add task')
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  toggleStatus(task: any) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => {
        task.status = newStatus;
        this.showToast('Status updated');
      }
    });
  }

  async deleteTask(task: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: () => {
            this.taskService.deleteTask(task.id).subscribe({
              next: () => {
                this.tasks = this.tasks.filter(t => t.id !== task.id);
                this.showToast('Task deleted');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'dark'
    });
    toast.present();
  }

  segmentChanged(ev: any) {
    this.filter = ev.detail.value;
    this.loadTasks();
  }
}
