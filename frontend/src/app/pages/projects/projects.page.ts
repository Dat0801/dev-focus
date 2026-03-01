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
  projects: any[] = [
    {
      id: 1,
      name: 'Mobile App Refresh',
      category: 'DESIGN SYSTEM',
      categoryColor: '#3498db',
      progress: 65,
      dueDate: 'Oct 24',
      tasksCount: 12,
      members: [
        { avatar: 'assets/avatars/user1.png' },
        { avatar: 'assets/avatars/user2.png' }
      ],
      status: 'in_progress'
    },
    {
      id: 2,
      name: 'API Integration',
      category: 'DEVELOPMENT',
      categoryColor: '#2ecc71',
      progress: 32,
      dueDate: 'Nov 02',
      tasksCount: 8,
      members: [
        { avatar: 'assets/avatars/user3.png' }
      ],
      status: 'in_progress'
    },
    {
      id: 3,
      name: 'Learning Rust',
      category: 'PERSONAL',
      categoryColor: '#f39c12',
      progress: 88,
      dueDate: 'Dec 15',
      tasksCount: 24,
      members: [],
      status: 'in_progress'
    },
    {
      id: 4,
      name: 'Brand Identity',
      category: 'MARKETING',
      categoryColor: '#95a5a6',
      progress: 100,
      dueDate: 'Finished Sep 20',
      tasksCount: 0,
      members: [],
      status: 'completed'
    }
  ];
  selectedTab: string = 'all';

  constructor(
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // this.loadProjects(); // Temporarily disabled to use mock data
  }

  get filteredProjects() {
    if (this.selectedTab === 'all') return this.projects;
    return this.projects.filter(p => p.status === this.selectedTab);
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
