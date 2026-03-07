import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getTasksByMonth(month: string): Observable<any> {
    const params = new HttpParams().set('month', month);
    return this.http.get(`${this.apiUrl}/tasks-by-month`, { params });
  }

  async exportTasksToExcel(month: string) {
    const response: any = await firstValueFrom(this.getTasksByMonth(month));
    const tasks = response.data;
    
    const workbook = new ExcelJS.Workbook();
    const sheetName = month; // Format: YYYY-MM
    const worksheet = workbook.addWorksheet(sheetName);

    // Define columns
    worksheet.columns = [
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Project', key: 'project', width: 20 },
      { header: 'Start Date', key: 'start_date', width: 15 },
      { header: 'End Date', key: 'end_date', width: 15 },
      { header: 'Detail Task', key: 'title', width: 40 },
      { header: 'Remark', key: 'remark', width: 50 },
    ];

    // Styling header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    tasks.forEach((task: any) => {
      // Process remarks: group sessions by date
      const sessionsByDate: { [key: string]: number } = {};
      if (task.pomodoro_sessions && task.pomodoro_sessions.length > 0) {
        task.pomodoro_sessions.forEach((session: any) => {
          const date = new Date(session.start_time).toLocaleDateString('en-CA'); // YYYY-MM-DD
          const hours = session.duration_minutes / 60;
          sessionsByDate[date] = (sessionsByDate[date] || 0) + hours;
        });
      }

      const remark = Object.entries(sessionsByDate)
        .map(([date, hours]) => `${date}: ${hours.toFixed(1)}h`)
        .join(', ') || 'No sessions tracked';

      const formatStatus = (status: string) => {
        if (status === 'todo' || status === 'in_progress') return 'In progress';
        if (status === 'done') return 'Done';
        return status;
      };

      worksheet.addRow({
        status: formatStatus(task.status),
        project: task.project ? task.project.name : 'N/A',
        start_date: task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A',
        end_date: task.end_date ? new Date(task.end_date).toLocaleDateString() : 'N/A',
        title: task.title,
        remark: remark
      });
    });

    // Write to buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Report_${month}.xlsx`);
  }
}
