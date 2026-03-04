import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProjectsPage } from './projects.page';

const routes: Routes = [
  {
    path: '',
    component: ProjectsPage
  },
  {
    path: 'create-project',
    loadChildren: () => import('./create-project/create-project.module').then( m => m.CreateProjectPageModule)
  },
  {
    path: 'edit-project/:id',
    loadChildren: () => import('./edit-project/edit-project.module').then( m => m.EditProjectPageModule)
  },
  {
    path: ':id',
    loadChildren: () => import('./project-detail/project-detail.module').then( m => m.ProjectDetailPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectsPageRoutingModule {}
