import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone: false,
})
export class ProjectsPage implements OnInit {
  projects: any[] = [];

  constructor(
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  async loadProjects() {
    const loading = await this.loadingCtrl.create({ message: 'Loading projects...' });
    await loading.present();

    this.http.get(`${environment.apiUrl}/projects`).subscribe({
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

  async addProject() {
    const alert = await this.alertCtrl.create({
      header: 'New Project',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Project name' },
        { name: 'color', type: 'text', placeholder: 'Color (e.g. #ff0000)' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (data) => {
            if (!data.name) return false;
            this.http.post(`${environment.apiUrl}/projects`, data).subscribe({
              next: () => {
                this.loadProjects();
                this.showToast('Project added');
              }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    toast.present();
  }
}
