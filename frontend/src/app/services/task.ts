import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

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
}
