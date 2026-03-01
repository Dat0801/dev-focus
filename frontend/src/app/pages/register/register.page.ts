import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {}

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('password_confirmation')?.value
      ? null : { 'mismatch': true };
  }

  async onRegister() {
    if (this.registerForm.invalid) return;

    const loading = await this.loadingCtrl.create({
      message: 'Creating account...'
    });
    await loading.present();

    this.authService.register(this.registerForm.value).subscribe({
      next: (res) => {
        loading.dismiss();
        this.router.navigateByUrl('/dashboard');
      },
      error: async (err) => {
        loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Registration failed',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }
}
