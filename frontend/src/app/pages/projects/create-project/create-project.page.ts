import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonModal, LoadingController, ToastController } from '@ionic/angular';
import { ProjectService } from '../../../services/project';

@Component({
  selector: 'app-create-project',
  templateUrl: './create-project.page.html',
  styleUrls: ['./create-project.page.scss'],
  standalone: false
})
export class CreateProjectPage implements OnInit {
  @ViewChild('deadlineModal') deadlineModal!: IonModal;
  
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
    private router: Router,
    private projectService: ProjectService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {}

  selectColor(color: string) {
    this.project.color = color;
  }

  openDeadlineModal() {
    if (!this.project.deadline) {
      this.project.deadline = new Date().toISOString();
    }
    this.deadlineModal.present();
  }

  async createProject() {
    if (!this.project.name) {
      this.showToast('Please enter a project name');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating project...',
      spinner: 'circles'
    });
    await loading.present();

    this.projectService.createProject(this.project).subscribe({
      next: () => {
        loading.dismiss();
        this.showToast('Project created successfully');
        this.router.navigate(['/tabs/projects']);
      },
      error: (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Failed to create project');
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
