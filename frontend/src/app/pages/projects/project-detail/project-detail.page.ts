import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, NavController } from '@ionic/angular';
import { ProjectService } from '../../../services/project';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.page.html',
  styleUrls: ['./project-detail.page.scss'],
  standalone: false,
})
export class ProjectDetailPage implements OnInit {
  projectId: string | null = null;
  projectTitle: string = 'Loading...';
  selectedTab: string = 'todo';
  project: any;

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
    private actionSheetCtrl: ActionSheetController
  ) { }

  get filteredTasks() {
    if (!this.project || !this.project.tasks) return [];
    
    return this.project.tasks.filter((task: any) => {
      const status = task.status || 'todo';
      if (this.selectedTab === 'todo') return status === 'todo';
      if (this.selectedTab === 'in-progress') return status === 'in_progress';
      if (this.selectedTab === 'done') return status === 'done';
      return true;
    });
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
