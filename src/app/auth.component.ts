import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";

interface AuthResponse {
  user: { id: string; name: string; email: string; role: string };
}

@Component({
  selector: "fieldline-auth",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <div class="auth-glow" aria-hidden="true"></div>
      <section class="auth-card" aria-labelledby="auth-title">
        <a class="auth-brand" routerLink="/login">
          <img src="/assets/everlume-solutions.png" alt="Everlume Solutions — Illuminate Next">
          <span>FIELDLINE · ASSET OPERATIONS</span>
        </a>
        <p class="eyebrow">{{ setupMode ? "FIRST-TIME SETUP" : "WELCOME BACK" }}</p>
        <h1 id="auth-title">{{ setupMode ? "Create your administrator account" : "Sign in to Fieldline" }}</h1>
        <p class="auth-description">{{ setupMode ? "Set up the first account for this Fieldline workspace." : "Use your workspace account to continue." }}</p>

        <form (ngSubmit)="submit()" #authForm="ngForm">
          <label *ngIf="setupMode" for="display-name">Full name</label>
          <input *ngIf="setupMode" id="display-name" name="name" [(ngModel)]="name" autocomplete="name" maxlength="120" placeholder="Your name" required>

          <label for="email">Email address</label>
          <input id="email" name="email" [(ngModel)]="email" type="email" autocomplete="email" maxlength="254" placeholder="you@company.com" required>

          <label for="password">Password</label>
          <input id="password" name="password" [(ngModel)]="password" type="password" [attr.autocomplete]="setupMode ? 'new-password' : 'current-password'" [minlength]="setupMode ? 12 : 1" maxlength="128" [placeholder]="setupMode ? 'At least 12 characters' : 'Enter your password'" required>

          <p *ngIf="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
          <button class="primary auth-submit" type="submit" [disabled]="saving || !authForm.valid">{{ saving ? "Please wait…" : setupMode ? "Create account" : "Sign in" }}</button>
        </form>

        <p *ngIf="!setupMode" class="auth-footnote">Contact your workspace administrator if you need an account.</p>
        <p *ngIf="setupMode" class="auth-footnote">This one-time setup creates the first administrator. Keep your password secure.</p>
      </section>
    </main>
  `,
})
export class AuthComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  setupMode = false;
  name = "";
  email = "";
  password = "";
  errorMessage = "";
  saving = false;

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.setupMode = data["mode"] === "setup";
      this.checkSetupStatus();
    });
  }

  submit(): void {
    this.saving = true;
    this.errorMessage = "";
    const endpoint = this.setupMode ? "/api/auth/setup" : "/api/auth/login";
    const body = this.setupMode
      ? { name: this.name, email: this.email, password: this.password }
      : { email: this.email, password: this.password };

    this.http.post<AuthResponse>(endpoint, body).subscribe({
      next: () => { void this.router.navigateByUrl("/overview"); },
      error: (error: { error?: { error?: string } }) => {
        this.saving = false;
        this.errorMessage = error.error?.error ?? "Could not connect to Fieldline. Check that the API is running.";
      },
    });
  }

  private checkSetupStatus(): void {
    this.http.get<{ setupRequired: boolean }>("/api/auth/status").subscribe({
      next: ({ setupRequired }) => {
        if (setupRequired && !this.setupMode) void this.router.navigateByUrl("/setup");
        if (!setupRequired && this.setupMode) void this.router.navigateByUrl("/login");
      },
      error: () => { this.errorMessage = "Could not connect to Fieldline. Check that the API is running."; },
    });
  }
}
