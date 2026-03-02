import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ProjectService } from '../../../../services/project';

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.scss'],
  standalone: false,
})
export class AddTaskComponent implements OnInit {
  taskName: string = '';
  description: string = '';
  selectedProjectId: string | null = null;
  selectedPriority: string = 'medium';
  dueDate: string = new Date().toISOString();
  estimatedPomodoros: number = 1;

  projects: any[] = [];

  priorities = [
    { label: 'P1', value: 'urgent' },
    { label: 'P2', value: 'high' },
    { label: 'P3', value: 'medium' },
    { label: 'P4', value: 'low' }
  ];
  pomodoroOptions = [1, 2, 3, '4+'];

  constructor(
    private modalCtrl: ModalController,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects = res.data;
        if (this.projects.length > 0) {
          this.selectedProjectId = this.projects[0].id;
        }
      }
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  selectProject(projectId: string) {
    this.selectedProjectId = projectId;
  }

  selectPriority(priority: string) {
    this.selectedPriority = priority;
  }

  selectPomodoro(option: number | string) {
    this.estimatedPomodoros = option === '4+' ? 4 : (option as number);
  }

  createTask() {
    this.modalCtrl.dismiss({
      title: this.taskName,
      description: this.description,
      project_id: this.selectedProjectId,
      priority: this.selectedPriority,
      due_date: this.dueDate,
      estimated_pomodoros: this.estimatedPomodoros
    });
  }
}
