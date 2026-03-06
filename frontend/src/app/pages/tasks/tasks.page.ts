import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../services/task';
import { AddTaskComponent } from './components/add-task/add-task.component';
import { TaskDetailComponent } from './components/task-detail/task-detail.component';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit {
  tasks: any[] = [];
  filteredTasks: any[] = [];
  filter: string = 'all';
  searchQuery: string = '';
  todayDate: string = '';

  constructor(
    private taskService: TaskService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.setTodayDate();
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.filter = params['filter'];
      }
      this.loadTasks();
    });
  }

  goToProjects() {
    this.router.navigate(['/tabs/projects']);
  }

  setTodayDate() {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    this.todayDate = new Date().toLocaleDateString('en-US', options);
  }

  async loadTasks() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading tasks...',
      spinner: 'crescent'
    });
    await loading.present();

    let obs;
    if (this.filter === 'today') {
      const localDate = new Date().toISOString().split('T')[0];
      obs = this.taskService.getTodayTasks(localDate);
    } else if (this.filter === 'upcoming') {
      const localDate = new Date().toISOString().split('T')[0];
      obs = this.taskService.getUpcomingTasks(localDate);
    } else if (this.filter === 'completed') {
      // Assuming there's a way to filter completed tasks, or we filter locally
      obs = this.taskService.getTasks();
    } else {
      obs = this.taskService.getTasks();
    }

    obs.subscribe({
      next: (res: any) => {
        this.tasks = res.data;
        this.applyFilters();
        loading.dismiss();
      },
      error: () => {
        loading.dismiss();
        this.showToast('Failed to load tasks');
      }
    });
  }

  applyFilters() {
    let tempTasks = [...this.tasks];

    // Filter by segment
    if (this.filter === 'completed') {
      tempTasks = tempTasks.filter(t => t.status === 'done');
    } else if (this.filter === 'all') {
      // Show all except maybe we want to show everything
    }

    // Filter by search query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase();
      tempTasks = tempTasks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    this.filteredTasks = tempTasks;
  }

  handleSearch(ev: any) {
    this.searchQuery = ev.detail.value;
    this.applyFilters();
  }

  async addTask() {
    const modal = await this.modalCtrl.create({
      component: AddTaskComponent,
      cssClass: 'full-screen-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data) {
      const taskData = {
        title: data.title,
        description: data.description,
        status: 'todo',
        priority: data.priority,
        project_id: data.project_id,
        due_date: data.due_date,
        start_date: data.start_date,
        end_date: data.end_date,
        work_hours: data.work_hours,
        estimated_pomodoros: data.estimated_pomodoros,
        completed_pomodoros: 0
      };

      this.taskService.createTask(taskData).subscribe({
        next: () => {
          this.loadTasks();
          this.showToast('Task created successfully');
        },
        error: () => this.showToast('Failed to create task')
      });
    }
  }

  async openTaskDetail(task: any) {
    const modal = await this.modalCtrl.create({
      component: TaskDetailComponent,
      componentProps: {
        task: task
      },
      cssClass: 'full-screen-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) {
      if (data.deleted) {
        this.tasks = this.tasks.filter(t => t.id !== data.id);
        this.applyFilters();
      } else {
        // Task was updated
        this.loadTasks();
      }
    }
  }

  toggleStatus(task: any) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => {
        task.status = newStatus;
        this.applyFilters();
        this.showToast(newStatus === 'done' ? 'Task completed!' : 'Task reopened');
      },
      error: () => this.showToast('Failed to update status')
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
