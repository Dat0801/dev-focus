import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TasksPageRoutingModule } from './tasks-routing.module';
import { TasksPage } from './tasks.page';
import { TasksComponentsModule } from './components/tasks-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TasksPageRoutingModule,
    TasksComponentsModule
  ],
  declarations: [TasksPage]
})
export class TasksPageModule {}
