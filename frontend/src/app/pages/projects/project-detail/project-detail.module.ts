import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ProjectDetailPage } from './project-detail.page';
import { RouterModule, Routes } from '@angular/router';
import { TasksComponentsModule } from '../../tasks/components/tasks-components.module';

const routes: Routes = [
  {
    path: '',
    component: ProjectDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TasksComponentsModule
  ],
  declarations: [ProjectDetailPage]
})
export class ProjectDetailPageModule {}
