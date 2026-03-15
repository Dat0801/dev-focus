import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../services/task';
import { ReportService } from '../../services/report';
import { AddTaskComponent } from './components/add-task/add-task.component';
import { TaskDetailComponent } from './components/task-detail/task-detail.component';
import { ImportLogsComponent } from './components/import-logs/import-logs.component';
import { ViewChild, ElementRef } from '@angular/core';

import { ProjectService } from '../../services/project';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  tasks: any[] = [];
  filteredTasks: any[] = [];
  filter: string = 'all';
  searchQuery: string = '';
  todayDate: string = '';
  selectedPriority: string = 'all';
  selectedProject: string = 'all';
  projects: any[] = [];

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private reportService: ReportService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.setTodayDate();
    this.loadProjects();
    this.route.queryParams.subscribe(params => {
      if (params['filter']) {
        this.filter = params['filter'];
      }
      this.loadTasks();
    });
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data;
      }
    });
  }

  goToProjects() {
    this.router.navigate(['/tabs/projects']);
  }

  getCompletedSubTasksCount(task: any): number {
    if (!task.sub_tasks) return 0;
    return task.sub_tasks.filter((sub: any) => sub.status === 'done').length;
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

    // Status filter (only if not a time-based filter)
    if (this.filter !== 'all' && this.filter !== 'today' && this.filter !== 'upcoming') {
      tempTasks = tempTasks.filter(t => t.status === this.filter);
    }

    // Priority filter
    if (this.selectedPriority !== 'all') {
      tempTasks = tempTasks.filter(t => t.priority === this.selectedPriority);
    }

    // Project filter
    if (this.selectedProject !== 'all') {
      tempTasks = tempTasks.filter(t => t.project_id === this.selectedProject);
    }

    // Search filter
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      tempTasks = tempTasks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    this.filteredTasks = tempTasks;
  }

  async presentPriorityFilter() {
    const actionSheet = await this.alertCtrl.create({
      header: 'Filter by Priority',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'All',
          handler: () => {
            this.selectedPriority = 'all';
            this.applyFilters();
          }
        },
        {
          text: 'High',
          handler: () => {
            this.selectedPriority = 'high';
            this.applyFilters();
          }
        },
        {
          text: 'Medium',
          handler: () => {
            this.selectedPriority = 'medium';
            this.applyFilters();
          }
        },
        {
          text: 'Low',
          handler: () => {
            this.selectedPriority = 'low';
            this.applyFilters();
          }
        }
      ]
    });

    await actionSheet.present();
  }

  async presentProjectFilter() {
    if (this.projects.length === 0) {
      this.showToast('No projects found');
      return;
    }

    const inputs = this.projects.map(p => ({
      name: 'project',
      type: 'radio' as const,
      label: p.name,
      value: p.id,
      checked: this.selectedProject === p.id
    }));

    const alert = await this.alertCtrl.create({
      header: 'Filter by Project',
      inputs: [
        {
          name: 'project',
          type: 'radio',
          label: 'All Projects',
          value: 'all',
          checked: this.selectedProject === 'all'
        },
        ...inputs
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Apply',
          handler: (value) => {
            this.selectedProject = value;
            this.applyFilters();
          }
        }
      ]
    });

    await alert.present();
  }

  getProjectName(id: string): string {
    const project = this.projects.find(p => p.id === id);
    return project ? project.name : 'Project';
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
        work_logs: data.work_logs,
        sub_tasks: data.sub_tasks,
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
        if (newStatus === 'done' && task.sub_tasks) {
          task.sub_tasks.forEach((sub: any) => sub.status = 'done');
        }
        this.applyFilters();
        this.showToast(newStatus === 'done' ? 'Task completed!' : 'Task reopened');
      },
      error: () => this.showToast('Failed to update status')
    });
  }

  startTask(task: any) {
    this.taskService.updateTask(task.id, { status: 'in_progress' }).subscribe({
      next: () => {
        task.status = 'in_progress';
        this.applyFilters();
        this.showToast('Task started!');
      },
      error: () => this.showToast('Failed to start task')
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

  async downloadTemplate() {
    try {
      await this.reportService.downloadTaskImportTemplate();
      this.showToast('Template downloaded');
    } catch (error) {
      this.showToast('Failed to download template');
    }
  }

  async openImportLogs() {
    const modal = await this.modalCtrl.create({
      component: ImportLogsComponent
    });
    return await modal.present();
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const loading = await this.loadingCtrl.create({
        message: 'Importing tasks...',
        spinner: 'crescent'
      });
      await loading.present();

      this.taskService.importTasks(file).subscribe({
        next: (res) => {
          loading.dismiss();
          this.showToast(res.message || 'Tiến trình import đã bắt đầu. Hãy kiểm tra log để xem chi tiết.');
          this.loadTasks();
          // Reset file input
          this.fileInput.nativeElement.value = '';
          if (res.import_log_id) {
            this.openImportLogs();
          }
        },
        error: (err) => {
          loading.dismiss();
          const errorMessage = err.error?.message || 'Failed to import tasks';
          this.showToast(errorMessage);
          console.error('Import error:', err);
          // Reset file input
          this.fileInput.nativeElement.value = '';
        }
      });
    }
  }
}
