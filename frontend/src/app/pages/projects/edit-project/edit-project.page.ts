import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonModal, LoadingController, NavController, ToastController } from '@ionic/angular';
import { ProjectService } from '../../../services/project';

@Component({
  selector: 'app-edit-project',
  templateUrl: './edit-project.page.html',
  styleUrls: ['./edit-project.page.scss'],
  standalone: false
})
export class EditProjectPage implements OnInit {
  @ViewChild('deadlineModal') deadlineModal!: IonModal;
  
  projectId: string | null = null;
  project: any = {
    name: '',
    description: '',
    deadline: null,
    icon: 'folder',
    color: '#ffdce0',
    pomodoro_enabled: true
  };

  colors = [
    '#ffdce0', // Pink
    '#e0f2f1', // Teal
    '#fff9c4', // Yellow
    '#e1bee7', // Purple
    '#ffe0b2', // Orange
    '#dcedc8'  // Light Green
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private projectService: ProjectService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.loadProject();
    }
  }

  async loadProject() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading project...',
      spinner: 'circles'
    });
    await loading.present();

    this.projectService.getProject(this.projectId!).subscribe({
      next: (res: any) => {
        const data = res.data;
        this.project = { 
          ...this.project, 
          ...data,
          deadline: data.deadline ? new Date(data.deadline).toISOString() : null
        };
        loading.dismiss();
      },
      error: (err) => {
        loading.dismiss();
        this.showToast('Failed to load project');
        this.navCtrl.back();
      }
    });
  }

  selectColor(color: string) {
    this.project.color = color;
  }

  openDeadlineModal() {
    if (!this.project.deadline) {
      this.project.deadline = new Date().toISOString();
    }
    this.deadlineModal.present();
  }

  onDateChange() {
    this.deadlineModal.dismiss();
  }

  async updateProject() {
    if (!this.project.name) {
      this.showToast('Please enter a project name');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Updating project...',
      spinner: 'circles'
    });
    await loading.present();

    this.projectService.updateProject(this.projectId!, this.project).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Project updated successfully');
        this.navCtrl.back();
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Failed to update project');
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
