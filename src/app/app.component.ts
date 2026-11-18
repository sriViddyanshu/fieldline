import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter } from "rxjs";
import { SECTIONS } from "./navigation";
import { ThemeService } from "./theme.service";

@Component({
  selector: "fieldline-root",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <ng-container *ngIf="isAuthPage; else workspace">
      <router-outlet></router-outlet>
    </ng-container>
    <ng-template #workspace>
      <div class="shell">
        <aside class="sidebar">
          <a class="brand" routerLink="/overview">
            <img src="/assets/everlume-solutions.png" alt="Everlume Solutions — Illuminate Next">
            <span class="brand-caption">FIELDLINE · VEHICLE FLEET</span>
          </a>
          <nav aria-label="Main navigation">
            <ng-container *ngFor="let group of groups">
              <p class="nav-group">{{ group }}</p>
              <a *ngFor="let item of sectionsFor(group)" [routerLink]="['/', item.id]" routerLinkActive="active">
                <span class="nav-dot" aria-hidden="true"></span>{{ item.label }}
              </a>
            </ng-container>
          </nav>
          <div class="sidebar-foot"><span class="status-dot"></span> Local workspace</div>
        </aside>
        <main class="main">
          <header class="topbar">
            <div class="breadcrumbs">Workspace <span>/</span> {{ activeLabel }}</div>
            <div class="topbar-actions">
              <div class="user-chip"><span class="avatar">{{ userName.slice(0, 1).toUpperCase() }}</span><span>{{ userName }}<small>{{ userEmail || "Workspace user" }}</small></span></div>
              <button class="logout-button" type="button" (click)="logout()">Sign out</button>
            </div>
          </header>
          <router-outlet></router-outlet>
          <footer>Fieldline · Vehicle fleet workspace</footer>
        </main>
      </div>
    </ng-template>
  `,
})
export class AppComponent {
  readonly groups = [...new Set(SECTIONS.map((section) => section.group))];
  readonly theme = inject(ThemeService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  activeLabel = "Overview";
  userName = "Operator";
  userEmail = "";

  constructor() {
    const updatePage = () => {
      const current = SECTIONS.find((section) => section.id === this.router.url.split("/")[1]);
      this.activeLabel = current?.label ?? "Overview";
      if (!this.isAuthPage) this.loadCurrentUser();
    };
    updatePage();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(updatePage);
  }

  get isAuthPage(): boolean {
    return ["/login", "/setup"].includes(this.router.url.split("?")[0]);
  }

  sectionsFor(group: string) {
    return SECTIONS.filter((section) => section.group === group);
  }

  logout(): void {
    this.http.post("/api/auth/logout", {}).subscribe({
      next: () => { void this.router.navigateByUrl("/login"); },
      error: () => { void this.router.navigateByUrl("/login"); },
    });
  }

  private loadCurrentUser(): void {
    this.http.get<{ user: { name: string; email: string } }>("/api/auth/me").subscribe({
      next: ({ user }) => { this.userName = user.name; this.userEmail = user.email; },
      error: () => { this.userName = "Operator"; this.userEmail = ""; },
    });
  }
}
