import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ProjectService } from '../../services/project';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone: false,
})
export class ProjectsPage implements OnInit {
  projects: any[] = [];
  selectedTab: string = 'all';

  constructor(
    private projectService: ProjectService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  get filteredProjects() {
    if (this.selectedTab === 'all') return this.projects;
    return this.projects.filter(p => p.status === this.selectedTab);
  }

  async loadProjects() {
    const loading = await this.loadingCtrl.create({ message: 'Loading projects...' });
    await loading.present();

    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data;
        loading.dismiss();
      },
      error: () => {
        loading.dismiss();
        this.showToast('Failed to load projects');
      }
    });
  }

  addProject() {
    this.router.navigate(['/tabs/projects/create-project']);
  }

  async createProject(data: any) {
    const loading = await this.loadingCtrl.create({ message: 'Creating project...' });
    await loading.present();

    this.projectService.createProject(data).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Project created successfully');
        this.loadProjects();
      },
      error: () => {
        loading.dismiss();
        this.showToast('Failed to create project');
      }
    });
  }

  async editProject(project: any) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Project',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: project.name,
          placeholder: 'Project Name'
        },
        {
          name: 'category',
          type: 'text',
          value: project.category,
          placeholder: 'Category'
        },
        {
          name: 'color',
          type: 'text',
          value: project.color,
          placeholder: 'Color'
        },
        {
          name: 'deadline',
          type: 'date',
          value: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '',
          placeholder: 'Deadline'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: (data) => {
            this.updateProject(project.id, data);
          }
        }
      ]
    });

    await alert.present();
  }

  async updateProject(id: string, data: any) {
    const loading = await this.loadingCtrl.create({ message: 'Updating project...' });
    await loading.present();

    this.projectService.updateProject(id, data).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Project updated successfully');
        this.loadProjects();
      },
      error: () => {
        loading.dismiss();
        this.showToast('Failed to update project');
      }
    });
  }

  async deleteProject(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Project',
      message: 'Are you sure you want to delete this project?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.performDelete(id);
          }
        }
      ]
    });

    await alert.present();
  }

  async performDelete(id: string) {
    const loading = await this.loadingCtrl.create({ message: 'Deleting project...' });
    await loading.present();

    this.projectService.deleteProject(id).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Project deleted successfully');
        this.loadProjects();
      },
      error: () => {
        loading.dismiss();
        this.showToast('Failed to delete project');
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
