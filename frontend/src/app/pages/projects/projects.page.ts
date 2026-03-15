import { Component } from '@angular/core';
import { AlertController, LoadingController, ToastController, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ProjectService } from '../../services/project';
import { ReportService } from '../../services/report';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone: false,
})
export class ProjectsPage {
  projects: any[] = [];
  selectedTab: string = 'all';

  constructor(
    private projectService: ProjectService,
    private reportService: ReportService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController,
    private router: Router
  ) {}

  ionViewWillEnter() {
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

  viewProjectDetail(project: any) {
    this.router.navigate(['/tabs/projects', project.id]);
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
    this.router.navigate(['/tabs/projects/edit-project', project.id]);
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

  async openReportModal() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading months...'
    });
    await loading.present();

    this.reportService.getMonthsWithData().subscribe({
      next: async (months: string[]) => {
        await loading.dismiss();
        
        if (months.length === 0) {
          this.showToast('No data available for report');
          return;
        }

        const buttons = months.map(month => ({
          text: this.formatMonthLabel(month),
          handler: () => {
            this.exportReport(month);
          }
        }));

        const actionSheet = await this.actionSheetCtrl.create({
          header: 'Select Month for Report',
          buttons: [
            ...buttons,
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]
        });

        await actionSheet.present();
      },
      error: async () => {
        await loading.dismiss();
        this.showToast('Failed to load months');
      }
    });
  }

  formatMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  async exportReport(month: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Generating Excel report...'
    });
    await loading.present();

    try {
      await this.reportService.exportTasksToExcel(month);
      this.showToast('Report exported successfully');
    } catch (error) {
      console.error(error);
      this.showToast('Failed to export report');
    } finally {
      await loading.dismiss();
    }
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
