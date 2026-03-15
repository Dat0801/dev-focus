import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import { ProjectService } from '../../../services/project';
import { TaskService } from '../../../services/task';
import { AddTaskComponent } from '../../tasks/components/add-task/add-task.component';
import { TaskDetailComponent } from '../../tasks/components/task-detail/task-detail.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.page.html',
  styleUrls: ['./project-detail.page.scss'],
  standalone: false,
})
export class ProjectDetailPage implements OnInit {
  projectId: string | null = null;
  projectTitle: string = 'Loading...';
  selectedTab: string = 'all';
  searchQuery: string = '';
  selectedPriority: string = 'all';
  selectedDeadline: string = 'all';
  project: any;

  getCompletedSubTasksCount(task: any): number {
    if (!task.sub_tasks) return 0;
    return task.sub_tasks.filter((sub: any) => sub.status === 'done').length;
  }

  stats = [
    { label: 'PROGRESS', value: '0%', type: 'progress' },
    { label: 'TOTAL TASKS', value: '0', type: 'tasks' },
    { label: 'DEADLINE', value: 'N/A', type: 'deadline' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private projectService: ProjectService,
    private taskService: TaskService,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  get filteredTasks() {
    if (!this.project || !this.project.tasks) return [];
    
    return this.project.tasks.filter((task: any) => {
      // Status filter
      const status = task.status || 'todo';
      let matchesStatus = true;
      if (this.selectedTab !== 'all') {
        matchesStatus = status === this.selectedTab;
      }

      // Priority filter
      let matchesPriority = true;
      if (this.selectedPriority !== 'all') {
        matchesPriority = task.priority === this.selectedPriority;
      }

      // Deadline filter
      let matchesDeadline = true;
      if (this.selectedDeadline !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        if (!task.due_date) {
          matchesDeadline = false;
        } else {
          const dueDate = new Date(task.due_date);
          dueDate.setHours(0, 0, 0, 0);

          if (this.selectedDeadline === 'overdue') {
            matchesDeadline = dueDate < today && task.status !== 'done';
          } else if (this.selectedDeadline === 'today') {
            matchesDeadline = dueDate.getTime() === today.getTime();
          } else if (this.selectedDeadline === 'this_week') {
            matchesDeadline = dueDate >= today && dueDate <= nextWeek;
          }
        }
      }

      // Search filter
      let matchesSearch = true;
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        const query = this.searchQuery.toLowerCase().trim();
        matchesSearch = task.title.toLowerCase().includes(query) || 
                       (task.description && task.description.toLowerCase().includes(query));
      }

      return matchesStatus && matchesSearch && matchesPriority && matchesDeadline;
    });
  }

  async presentPriorityFilter() {
    const alert = await this.alertCtrl.create({
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
          }
        },
        {
          text: 'High',
          handler: () => {
            this.selectedPriority = 'high';
          }
        },
        {
          text: 'Medium',
          handler: () => {
            this.selectedPriority = 'medium';
          }
        },
        {
          text: 'Low',
          handler: () => {
            this.selectedPriority = 'low';
          }
        }
      ]
    });

    await alert.present();
  }

  async presentDeadlineFilter() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Filter by Deadline',
      buttons: [
        {
          text: 'All',
          cssClass: this.selectedDeadline === 'all' ? 'selected-filter' : '',
          handler: () => {
            this.selectedDeadline = 'all';
          }
        },
        {
          text: 'Overdue',
          cssClass: this.selectedDeadline === 'overdue' ? 'selected-filter' : '',
          handler: () => {
            this.selectedDeadline = 'overdue';
          }
        },
        {
          text: 'Due Today',
          cssClass: this.selectedDeadline === 'today' ? 'selected-filter' : '',
          handler: () => {
            this.selectedDeadline = 'today';
          }
        },
        {
          text: 'Due this Week',
          cssClass: this.selectedDeadline === 'this_week' ? 'selected-filter' : '',
          handler: () => {
            this.selectedDeadline = 'this_week';
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ').toUpperCase();
  }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.loadProjectDetails();
    }
  }

  loadProjectDetails() {
    if (!this.projectId) return;

    this.projectService.getProject(this.projectId).subscribe({
      next: (res: any) => {
        this.project = res.data;
        this.projectTitle = this.project.name;
        
        // Update stats
        this.stats[0].value = `${Math.round(this.project.progress || 0)}%`;
        this.stats[1].value = `${this.project.tasks_count || 0}`;
        
        if (this.project.deadline) {
          const date = new Date(this.project.deadline);
          this.stats[2].value = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          this.stats[2].value = 'No deadline';
        }
      },
      error: () => {
        this.projectTitle = 'Error loading project';
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  segmentChanged(ev: any) {
    this.selectedTab = ev.detail.value;
  }

  handleSearch(ev: any) {
    this.searchQuery = ev.detail.value;
  }

  async addTask() {
    const modal = await this.modalCtrl.create({
      component: AddTaskComponent,
      componentProps: {
        selectedProjectId: this.projectId
      },
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
        project_id: data.project_id || this.projectId,
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
          this.loadProjectDetails();
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
        this.project.tasks = this.project.tasks.filter((t: any) => t.id !== data.id);
      } else {
        this.loadProjectDetails();
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
        this.showToast(newStatus === 'done' ? 'Task completed!' : 'Task reopened');
      },
      error: () => this.showToast('Failed to update status')
    });
  }

  startTask(task: any) {
    this.taskService.updateTask(task.id, { status: 'in_progress' }).subscribe({
      next: () => {
        task.status = 'in_progress';
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
          role: 'destructive',
          handler: () => {
            this.taskService.deleteTask(task.id).subscribe({
              next: () => {
                this.project.tasks = this.project.tasks.filter((t: any) => t.id !== task.id);
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

  async presentActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Project Options',
      buttons: [
        {
          text: 'Edit Project',
          icon: 'create-outline',
          handler: () => {
            this.router.navigate(['/tabs/projects/edit-project', this.projectId]);
          }
        },
        {
          text: 'Delete Project',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            // Implement delete if needed, but the user didn't ask for it
            console.log('Delete clicked');
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });
    await actionSheet.present();
  }
}
