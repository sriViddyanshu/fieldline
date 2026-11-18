import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { catchError, of } from "rxjs";
import { SECTIONS } from "../../navigation";

interface Summary {
  vehicles: number;
  sites: number;
  openWorkOrders: number;
  openIncidents: number;
}

@Component({
  selector: "fieldline-overview-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <div><p class="eyebrow">WORKSPACE</p><h1>Overview</h1><p class="lede">{{ description }}</p></div>
        <span class="live-pill"><span class="status-dot"></span>{{ apiState }}</span>
      </header>
      <div class="stat-grid">
        <article class="stat-card"><span>Vehicles</span><strong>{{ summary.vehicles }}</strong><small>In the managed fleet</small></article>
        <article class="stat-card"><span>Sites</span><strong>{{ summary.sites }}</strong><small>Operating locations</small></article>
        <article class="stat-card"><span>Open work orders</span><strong>{{ summary.openWorkOrders }}</strong><small>Tasks to follow up</small></article>
        <article class="stat-card"><span>Open incidents</span><strong>{{ summary.openIncidents }}</strong><small>Issues requiring attention</small></article>
      </div>
      <article class="panel welcome"><div class="welcome-mark">F</div><div><p class="eyebrow">YOUR WORKSPACE</p><h2>Vehicle operations, in one place.</h2><p>Register fleet vehicles and track their ownership, assignments, lifecycle events, mileage, and documents. Sites, work orders, and incidents remain available as supporting modules.</p><div class="quick-links"><a routerLink="/vehicles">Manage vehicles <span>→</span></a><a routerLink="/sites">Set up sites <span>→</span></a><a routerLink="/work-orders">Review work <span>→</span></a></div></div></article>
      <div class="overview-grid">
        <article class="panel"><div class="panel-head"><div><h2>Workspace sections</h2><p>Jump directly to the area you need.</p></div></div><div class="section-shortcuts"><a *ngFor="let section of shortcuts" [routerLink]="['/', section.id]"><span>{{ section.group }}</span><strong>{{ section.label }}</strong><span aria-hidden="true">→</span></a></div></article>
        <article class="panel"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest updates from your operations workspace</p></div></div><p class="empty-note">Activity will appear here as your team adds and updates records.</p></article>
      </div>
    </section>
  `,
})
export class OverviewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly description = SECTIONS[0].description;
  readonly shortcuts = SECTIONS.filter((section) => ["vehicles", "sites", "work-orders", "incidents"].includes(section.id));
  summary: Summary = { vehicles: 0, sites: 0, openWorkOrders: 0, openIncidents: 0 };
  apiState = "Checking API";

  ngOnInit(): void {
    this.http.get<Summary>("/api/summary").pipe(catchError(() => of(null))).subscribe((summary) => {
      this.apiState = summary ? "API connected" : "API offline";
      if (summary) this.summary = summary;
    });
  }
}
