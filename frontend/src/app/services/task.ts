import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as ExcelJS from 'exceljs';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });
    return this.http.get(this.apiUrl, { params });
  }

  getTask(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  createTask(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateTask(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getTodayTasks(date?: string): Observable<any> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get(`${this.apiUrl}/today`, { params });
  }

  getUpcomingTasks(date?: string): Observable<any> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get(`${this.apiUrl}/upcoming`, { params });
  }

  importTasks(file: File): Observable<any> {
    return from(this.parseExcelFile(file)).pipe(
      // Once parsed, send to backend
      switchMap((tasks: any[]) => {
        return this.http.post(`${environment.apiUrl}/tasks/import`, { tasks });
      })
    );
  }

  getImportLogs(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/tasks/import/logs`);
  }

  getImportStatus(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/tasks/import/${id}`);
  }

  private async parseExcelFile(file: File): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    const tasks: any[] = [];

    workbook.eachSheet((worksheet) => {
      let projectColumnIndex = -1;
      let titleColumnIndex = -1;
      let statusColumnIndex = -1;
      let startDateColumnIndex = -1;
      let endDateColumnIndex = -1;
      let remarkColumnIndex = -1;

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Detect columns from header
          row.eachCell((cell, colNumber) => {
            const header = cell.value?.toString().toLowerCase() || '';
            if (header.includes('project')) projectColumnIndex = colNumber;
            if (header.includes('title') || header.includes('tên')) titleColumnIndex = colNumber;
            if (header.includes('status') || header.includes('trạng thái')) statusColumnIndex = colNumber;
            if (header.includes('start') || header.includes('bắt đầu')) startDateColumnIndex = colNumber;
            if (header.includes('end') || header.includes('kết thúc')) endDateColumnIndex = colNumber;
            if (header.includes('remark') || header.includes('ghi chú')) remarkColumnIndex = colNumber;
          });
          return;
        }

        // Use detected indices or fallback to defaults
        const statusRaw = row.getCell(statusColumnIndex !== -1 ? statusColumnIndex : 1).value?.toString();
        const startDateRaw = row.getCell(startDateColumnIndex !== -1 ? startDateColumnIndex : 2).value?.toString();
        const endDateRaw = row.getCell(endDateColumnIndex !== -1 ? endDateColumnIndex : 3).value?.toString();
        const title = row.getCell(titleColumnIndex !== -1 ? titleColumnIndex : 4).value?.toString();
        const remark = row.getCell(remarkColumnIndex !== -1 ? remarkColumnIndex : 5).value?.toString() || '';
        const projectName = projectColumnIndex !== -1 
          ? row.getCell(projectColumnIndex).value?.toString() 
          : worksheet.name;

        if (!title) return; // Skip rows without title

        tasks.push({
          title: title,
          status_raw: statusRaw,
          start_date_raw: startDateRaw,
          end_date_raw: endDateRaw,
          remark: remark,
          project_name: projectName || worksheet.name,
          priority: 'medium',
          estimated_pomodoros: 1
        });
      });
    });

    return tasks;
  }

  private formatDate(value: any): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return null;
  }
}

