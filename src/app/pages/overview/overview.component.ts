import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { SECTIONS } from "../../navigation";

interface Summary {
  vehicles: number;
  sites: number;
  openWorkOrders: number;
  openIncidents: number;
}

interface ViolationNotice extends Record<string, string | null> {
  id: string;
  Notice_Number: string | null;
  Owner: string | null;
  License_Plate: string | null;
  Vehicle: string | null;
  Notice_date: string | null;
  Notice_Reason: string | null;
  Amount: string | null;
  Feedback: string | null;
  Recommendation: string | null;
  Violation_Type: string | null;
  created_at: string | null;
}

interface NoticeCategory {
  violationType: string | null;
  label: string;
  count: number;
}

interface NoticeSummary {
  totalCount: number;
  categories: NoticeCategory[];
}

interface NoticeField {
  key: string;
  label: string;
  maxLength: number;
}

const NOTICE_FIELDS: NoticeField[] = [
  { key: "Notice_Number", label: "Notice number", maxLength: 180 },
  { key: "Owner", label: "Owner", maxLength: 60 },
  { key: "License_Plate", label: "License plate", maxLength: 500 },
  { key: "Vehicle", label: "Vehicle", maxLength: 40 },
  { key: "Notice_date", label: "Notice date", maxLength: 60 },
  { key: "Notice_Reason", label: "Notice reason", maxLength: 60 },
  { key: "Amount", label: "Amount", maxLength: 60 },
  { key: "Feedback", label: "Feedback", maxLength: 65535 },
  { key: "Recommendation", label: "Recommendation", maxLength: 180 },
  { key: "Violation_Type", label: "Violation type", maxLength: 180 },
];

const NOTICE_DETAILS = [
  ...NOTICE_FIELDS,
  { key: "created_at", label: "Created at", maxLength: 0 },
];

@Component({
  selector: "fieldline-overview-page",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

      <section class="notice-overview" aria-labelledby="violation-notices-heading">
        <div class="notice-section-head">
          <div><p class="eyebrow">TOLL OPERATIONS</p><h2 id="violation-notices-heading">Toll Violation Notices</h2><p class="lede">Review notice totals by violation type, filter the notice list, and open a record for full details.</p></div>
          <button class="primary" type="button" (click)="openForm()">＋ Add notice</button>
        </div>
        <p *ngIf="noticeError" class="notice error" role="alert">{{ noticeError }}</p>
        <div class="notice-category-grid" aria-label="Violation notice counts by type">
          <button class="notice-category-card" type="button" [class.selected]="!selectedFilter" [attr.aria-pressed]="!selectedFilter" (click)="selectFilter('')">
            <span>All notices</span><strong>{{ noticeSummary.totalCount }}</strong><small>Show every notice</small>
          </button>
          <button *ngFor="let category of noticeSummary.categories" class="notice-category-card" type="button"
            [class.selected]="selectedFilter === categoryFilterValue(category)" [attr.aria-pressed]="selectedFilter === categoryFilterValue(category)"
            (click)="selectFilter(categoryFilterValue(category))">
            <span>{{ category.label }}</span><strong>{{ category.count }}</strong><small>Show details →</small>
          </button>
        </div>

        <article class="panel table-panel notice-table-panel">
          <div class="notice-list-head">
            <div><h3>Notices</h3><p>{{ notices.length }} {{ notices.length === 1 ? "notice" : "notices" }} shown</p></div>
            <label class="notice-filter">Filter by violation type
              <select [ngModel]="selectedFilter" (ngModelChange)="selectFilter($event)" aria-label="Filter notices by violation type">
                <option value="">All violation types</option>
                <option *ngFor="let category of noticeSummary.categories" [value]="categoryFilterValue(category)">{{ category.label }}</option>
              </select>
            </label>
          </div>
          <div class="history-table">
            <table *ngIf="notices.length; else noNotices">
              <thead><tr><th>Notice number</th><th>Owner</th><th>License plate</th><th>Notice reason</th><th>Comments</th><th>Amount</th><th>Actions</th></tr></thead>
              <tbody>
                <ng-container *ngFor="let notice of notices">
                  <tr>
                    <td>{{ displayValue(notice.Notice_Number) }}</td>
                    <td>{{ displayValue(notice.Owner) }}</td>
                    <td>{{ displayValue(notice.License_Plate) }}</td>
                    <td>{{ displayValue(notice.Notice_Reason) }}</td>
                    <td>{{ displayValue(notice.Violation_Type) }}</td>
                    <td>{{ displayValue(notice.Amount) }}</td>
                    <td class="actions-cell">
                      <button class="text-button" type="button" [attr.aria-expanded]="expandedId === notice.id" (click)="toggleDetails(notice.id)">{{ expandedId === notice.id ? "Hide details" : "Show details" }}</button>
                      <button class="text-button" type="button" (click)="openForm(notice)">Edit</button>
                    </td>
                  </tr>
                  <tr *ngIf="expandedId === notice.id">
                    <td colspan="7" class="notice-detail-cell">
                      <dl class="notice-detail-grid">
                        <div *ngFor="let field of detailFields" [class.wide]="field.key === 'Feedback' || field.key === 'Recommendation'">
                          <dt>{{ field.label }}</dt><dd>{{ displayValue(notice[field.key]) }}</dd>
                        </div>
                      </dl>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
            <ng-template #noNotices>
              <div class="empty-state">
                <div class="empty-icon">!</div>
                <h3>{{ selectedFilter ? "No notices in this category" : "No toll violation notices yet" }}</h3>
                <p>{{ selectedFilter ? "Choose another violation type or view all notices." : "Add a notice to start tracking toll violation records." }}</p>
                <button *ngIf="!selectedFilter" class="secondary" type="button" (click)="openForm()">Add notice</button>
              </div>
            </ng-template>
          </div>
        </article>
      </section>

      <div class="overview-grid">
        <article class="panel"><div class="panel-head"><div><h2>Workspace sections</h2><p>Jump directly to the area you need.</p></div></div><div class="section-shortcuts"><a *ngFor="let section of shortcuts" [routerLink]="['/', section.id]"><span>{{ section.group }}</span><strong>{{ section.label }}</strong><span aria-hidden="true">→</span></a></div></article>
        <article class="panel"><div class="panel-head"><div><h2>Recent activity</h2><p>Latest updates from your operations workspace</p></div></div><p class="empty-note">Activity will appear here as your team adds and updates records.</p></article>
      </div>

      <div class="modal-backdrop" *ngIf="formOpen" (click)="closeForm()">
        <form class="modal notice-form" (ngSubmit)="saveNotice()" (click)="$event.stopPropagation()">
          <div class="modal-head"><div><p class="eyebrow">{{ editing ? "UPDATE NOTICE" : "NEW NOTICE" }}</p><h2>{{ editing ? "Edit toll violation notice" : "Add toll violation notice" }}</h2></div><button type="button" class="icon-button" aria-label="Close dialog" (click)="closeForm()">×</button></div>
          <div class="fleet-form-grid">
            <label *ngFor="let field of fields">{{ field.label }}
              <textarea *ngIf="field.key === 'Feedback'; else textField" [(ngModel)]="draft[field.key]" [name]="field.key" rows="3" [attr.maxlength]="field.maxLength"></textarea>
              <ng-template #textField><input type="text" [(ngModel)]="draft[field.key]" [name]="field.key" [attr.maxlength]="field.maxLength"></ng-template>
            </label>
          </div>
          <p *ngIf="formError" class="notice error" role="alert">{{ formError }}</p>
          <div class="modal-actions"><button type="button" class="secondary" (click)="closeForm()">Cancel</button><button type="submit" class="primary" [disabled]="saving">{{ saving ? "Saving…" : "Save notice" }}</button></div>
        </form>
      </div>
    </section>
  `,
})
export class OverviewComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly description = SECTIONS[0].description;
  readonly shortcuts = SECTIONS.filter((section) => ["vehicles", "sites", "work-orders", "incidents"].includes(section.id));
  readonly fields = NOTICE_FIELDS;
  readonly detailFields = NOTICE_DETAILS;
  summary: Summary = { vehicles: 0, sites: 0, openWorkOrders: 0, openIncidents: 0 };
  noticeSummary: NoticeSummary = { totalCount: 0, categories: [] };
  notices: ViolationNotice[] = [];
  selectedFilter = "";
  expandedId = "";
  apiState = "Checking API";
  noticeError = "";
  formError = "";
  formOpen = false;
  saving = false;
  editing: ViolationNotice | null = null;
  draft: Record<string, string> = {};

  ngOnInit(): void {
    this.http.get<Summary>("/api/summary").subscribe({
      next: (summary) => { this.summary = summary; this.apiState = "API connected"; },
      error: () => { this.apiState = "API offline"; },
    });
    this.loadNoticeSummary();
    this.loadNotices();
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  }

  categoryFilterValue(category: NoticeCategory): string {
    return category.violationType === null ? "unclassified" : `type:${category.violationType}`;
  }

  selectFilter(value: string): void {
    this.selectedFilter = value;
    this.expandedId = "";
    this.loadNotices();
  }

  toggleDetails(id: string): void {
    this.expandedId = this.expandedId === id ? "" : id;
  }

  openForm(notice: ViolationNotice | null = null): void {
    this.editing = notice;
    this.draft = Object.fromEntries(this.fields.map((field) => [field.key, notice ? notice[field.key] ?? "" : ""]));
    this.formError = "";
    this.formOpen = true;
  }

  closeForm(): void {
    this.formOpen = false;
    this.formError = "";
  }

  saveNotice(): void {
    this.saving = true;
    this.formError = "";
    const request = this.editing
      ? this.http.put(`/api/violation-notices/${encodeURIComponent(this.editing.id)}`, this.draft)
      : this.http.post("/api/violation-notices", this.draft);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.closeForm();
        this.loadNoticeSummary();
        this.loadNotices();
      },
      error: (error: { error?: { error?: string } }) => {
        this.saving = false;
        this.formError = error.error?.error ?? "Could not save this notice.";
      },
    });
  }

  private loadNoticeSummary(): void {
    this.http.get<NoticeSummary>("/api/violation-notices/summary").subscribe({
      next: (summary) => {
        this.noticeSummary = summary;
        this.apiState = "API connected";
      },
      error: (error: { error?: { error?: string } }) => {
        this.noticeError = error.error?.error ?? "Could not load toll violation notice counts.";
        this.apiState = "API offline";
      },
    });
  }

  private loadNotices(): void {
    this.noticeError = "";
    this.expandedId = "";
    const params = this.selectedFilter === "unclassified"
      ? "?unclassified=true"
      : this.selectedFilter.startsWith("type:")
        ? `?violationType=${encodeURIComponent(this.selectedFilter.slice(5))}`
        : "";
    this.http.get<ViolationNotice[]>(`/api/violation-notices${params}`).subscribe({
      next: (notices) => { this.notices = notices; },
      error: (error: { error?: { error?: string } }) => {
        this.noticeError = error.error?.error ?? "Could not load toll violation notices.";
        this.notices = [];
      },
    });
  }
}
