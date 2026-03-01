import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard - DevFocus',
        loadChildren: () => import('../dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'tasks',
        title: 'Tasks - DevFocus',
        loadChildren: () => import('../tasks/tasks.module').then(m => m.TasksPageModule)
      },
      {
        path: 'pomodoro',
        title: 'Pomodoro - DevFocus',
        loadChildren: () => import('../pomodoro/pomodoro.module').then(m => m.PomodoroPageModule)
      },
      {
        path: 'projects',
        title: 'Projects - DevFocus',
        loadChildren: () => import('../projects/projects.module').then(m => m.ProjectsPageModule)
      },
      {
        path: 'profile',
        title: 'Settings - DevFocus',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
