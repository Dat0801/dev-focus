import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TaskService } from '../../../../services/task';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-import-logs',
  templateUrl: './import-logs.component.html',
  styleUrls: ['./import-logs.component.scss'],
  standalone: false,
})
export class ImportLogsComponent implements OnInit, OnDestroy {
  logs: any[] = [];
  isLoading = true;
  private refreshSub?: Subscription;

  constructor(
    private modalCtrl: ModalController,
    private taskService: TaskService
  ) {}

  ngOnInit() {
    this.loadLogs();
    // Poll for updates every 5 seconds while modal is open
    this.refreshSub = interval(5000).subscribe(() => {
      this.loadLogs(false);
    });
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }

  loadLogs(showLoading = true) {
    if (showLoading) this.isLoading = true;
    this.taskService.getImportLogs().subscribe({
      next: (res) => {
        this.logs = res.import_logs;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'failed': return 'danger';
      case 'pending': return 'warning';
      default: return 'medium';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      case 'pending': return 'Pending';
      default: return status;
    }
  }

  getProgress(log: any): number {
    if (!log.total_count) return 0;
    return (log.processed_count + log.error_count) / log.total_count;
  }
}