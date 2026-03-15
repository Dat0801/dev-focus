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

  getMonthsWithData(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/months-with-data`);
  }

  getExportData(month: string): Observable<any> {
    const params = new HttpParams().set('month', month);
    return this.http.get(`${this.apiUrl}/export-data`, { params });
  }

  async exportTasksToExcel(month: string) {
    const response: any = await firstValueFrom(this.getExportData(month));
    const projects = response.data;
    
    const workbook = new ExcelJS.Workbook();

    if (!projects || projects.length === 0) {
      const worksheet = workbook.addWorksheet('No Data');
      worksheet.addRow(['No data found for this month']);
    } else {
      projects.forEach((project: any) => {
        // Create a sheet for each project
        const sheetName = project.name.substring(0, 31); // Excel sheet name limit is 31 chars
        const worksheet = workbook.addWorksheet(sheetName);

        // Define columns
        worksheet.columns = [
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Start Date', key: 'start_date', width: 15 },
          { header: 'End Date', key: 'end_date', width: 15 },
          { header: 'Detail Task', key: 'title', width: 40 },
          { header: 'Remark', key: 'remark', width: 60 },
        ];

        // Styling header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF7C4DFF' } // Primary purple
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add filter to headers
        worksheet.autoFilter = {
          from: 'A1',
          to: `E1`
        };

        // Add tasks
        if (project.tasks && project.tasks.length > 0) {
          project.tasks.forEach((task: any) => {
            // Process work logs for remark
             // Format: date: description: time
             const workLogs: string[] = [];
            
            // Collect logs from task itself
            if (task.work_logs && task.work_logs.length > 0) {
              task.work_logs.forEach((log: any) => {
                const date = new Date(log.log_date).toLocaleDateString('en-GB'); // DD/MM/YYYY
                const duration = log.duration_minutes ? `${(log.duration_minutes / 60).toFixed(1)}h` : '0h';
                workLogs.push(`${date}: ${log.description || ''}: ${duration}`);
              });
            }

            // Collect logs from sub-tasks
            if (task.sub_tasks && task.sub_tasks.length > 0) {
              task.sub_tasks.forEach((subTask: any) => {
                if (subTask.work_logs && subTask.work_logs.length > 0) {
                  subTask.work_logs.forEach((log: any) => {
                    const date = new Date(log.log_date).toLocaleDateString('en-GB');
                    const duration = log.duration_minutes ? `${(log.duration_minutes / 60).toFixed(1)}h` : '0h';
                    workLogs.push(`[${subTask.title}] ${date}: ${log.description || ''}: ${duration}`);
                  });
                }
              });
            }

            const remark = workLogs.join('\n');

            const statusMap: any = {
              'todo': 'Not Started',
              'in_progress': 'In Progress',
              'done': 'Completed',
              'on_hold': 'On Hold'
            };

            const row = worksheet.addRow({
              status: statusMap[task.status] || task.status,
              start_date: task.start_date ? new Date(task.start_date).toLocaleDateString('en-GB') : '',
              end_date: task.end_date ? new Date(task.end_date).toLocaleDateString('en-GB') : '',
              title: task.title,
              remark: remark
            });

            // Set alignment for remark to wrap text
            row.getCell('remark').alignment = { wrapText: true, vertical: 'top' };
            row.getCell('title').alignment = { vertical: 'top' };
            row.getCell('status').alignment = { vertical: 'top', horizontal: 'center' };

            // Conditional formatting for Status
            const statusCell = row.getCell('status');
            let bgColor = '';
            let textColor = 'FF000000'; // Black

            switch (task.status) {
              case 'in_progress':
                bgColor = 'FFC8E6C9'; // Light green
                break;
              case 'done':
                bgColor = 'FF2E7D32'; // Dark green
                textColor = 'FFFFFFFF'; // White
                break;
              case 'on_hold':
                bgColor = 'FFBDBDBD'; // Gray
                break;
              case 'todo':
                bgColor = 'FFB3E5FC'; // Light blue
                break;
            }

            if (bgColor) {
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor }
              };
              statusCell.font = { color: { argb: textColor } };
            }
          });
        }
      });
    }

    // Write to buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `DevFocus_Report_${month}.xlsx`);
  }
}
