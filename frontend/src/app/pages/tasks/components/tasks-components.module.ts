import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddTaskComponent } from './add-task/add-task.component';
import { TaskDetailComponent } from './task-detail/task-detail.component';
import { FormatWorkHoursPipe } from '../../../pipes/format-work-hours.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    FormatWorkHoursPipe
  ],
  declarations: [AddTaskComponent, TaskDetailComponent],
  exports: [AddTaskComponent, TaskDetailComponent]
})
export class TasksComponentsModule {}
