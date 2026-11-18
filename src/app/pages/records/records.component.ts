import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Input } from "@angular/core";
import { catchError, of } from "rxjs";
import { SECTIONS } from "../../navigation";

type EntitySection = "sites" | "work-orders" | "incidents";
type RecordRow = Record<string, string | number | null>;

interface Field {
  key: string;
  label: string;
  type?: string;
  options?: string[];
}

const FIELDS: Record<EntitySection, Field[]> = {
  sites: [
    { key: "name", label: "Site name" },
    { key: "site_type", label: "Type", options: ["Facility", "Depot", "Office", "Other"] },
    { key: "address", label: "Address" },
    { key: "status", label: "Status", options: ["Active", "Inactive"] },
  ],
  "work-orders": [
    { key: "title", label: "Work order" },
    { key: "asset_id", label: "Vehicle" },
    { key: "priority", label: "Priority", options: ["Low", "Normal", "High", "Urgent"] },
    { key: "assigned_to", label: "Assigned to" },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "status", label: "Status", options: ["Open", "In progress", "Completed"] },
  ],
  incidents: [
    { key: "title", label: "Incident" },
    { key: "asset_id", label: "Vehicle" },
    { key: "severity", label: "Severity", options: ["Low", "Medium", "High", "Critical"] },
    { key: "description", label: "Description" },
    { key: "status", label: "Status", options: ["Open", "Investigating", "Resolved"] },
  ],
};

const HEADERS: Record<EntitySection, { key: string; label: string }[]> = {
  sites: [
    { key: "name", label: "Site" }, { key: "site_type", label: "Type" },
    { key: "address", label: "Address" }, { key: "status", label: "Status" },
  ],
  "work-orders": [
    { key: "title", label: "Work order" }, { key: "asset_name", label: "Vehicle" },
    { key: "priority", label: "Priority" }, { key: "assigned_to", label: "Assignee" },
    { key: "status", label: "Status" },
  ],
  incidents: [
    { key: "title", label: "Incident" }, { key: "asset_name", label: "Vehicle" },
    { key: "severity", label: "Severity" }, { key: "description", label: "Description" },
    { key: "status", label: "Status" },
  ],
};

const SINGULAR: Record<EntitySection, string> = {
  sites: "site",
  "work-orders": "work order",
  incidents: "incident",
};

@Component({
  selector: "fieldline-records-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div><p class="eyebrow">{{ section.group }}</p><h1>{{ section.label }}</h1><p class="lede">{{ section.description }}</p></div>
        <span class="live-pill"><span class="status-dot"></span>{{ apiState }}</span>
      </header>
      <div class="toolbar"><label class="search"><span aria-hidden="true">⌕</span><input [(ngModel)]="filterText" placeholder="Filter {{ section.label.toLowerCase() }}" aria-label="Filter records"></label><button class="primary" type="button" (click)="openForm()">＋ Add {{ singular }}</button></div>
      <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
      <article class="panel table-panel">
        <table *ngIf="filteredRows.length; else empty">
          <thead><tr><th *ngFor="let header of headers">{{ header.label }}</th><th class="actions-heading">Actions</th></tr></thead>
          <tbody><tr *ngFor="let row of filteredRows"><td *ngFor="let header of headers"><span [class]="header.key === 'status' ? 'state state-' + slug(row[header.key]) : ''">{{ displayValue(row[header.key]) }}</span></td><td class="actions-cell"><button class="text-button" type="button" (click)="openForm(row)">Edit</button><button class="text-button danger-text" type="button" (click)="remove(row)">Delete</button></td></tr></tbody>
        </table>
        <ng-template #empty><div class="empty-state"><div class="empty-icon">＋</div><h3>{{ filterText ? "No matching records" : "No " + section.label.toLowerCase() + " yet" }}</h3><p>{{ filterText ? "Try another search term." : "Create your first record to start organizing this workspace." }}</p><button *ngIf="!filterText" class="secondary" type="button" (click)="openForm()">Add {{ singular }}</button></div></ng-template>
      </article>
      <div class="modal-backdrop" *ngIf="formOpen" (click)="closeForm()">
        <form class="modal" (ngSubmit)="save()" (click)="$event.stopPropagation()">
          <div class="modal-head"><div><p class="eyebrow">{{ editing ? "UPDATE RECORD" : "NEW RECORD" }}</p><h2>{{ editing ? "Edit " + singular : "Add " + singular }}</h2></div><button type="button" class="icon-button" aria-label="Close dialog" (click)="closeForm()">×</button></div>
          <label *ngFor="let field of fields">{{ field.label }}
            <select *ngIf="field.options || field.key === 'site_id' || field.key === 'asset_id'; else textInput" [(ngModel)]="draft[field.key]" [name]="field.key" [required]="field.key === 'name' || field.key === 'title'">
              <option value="">Select…</option><option *ngFor="let option of selectOptions(field)" [value]="option.value">{{ option.label }}</option>
            </select>
            <ng-template #textInput><textarea *ngIf="field.key === 'description'; else inputField" [(ngModel)]="draft[field.key]" [name]="field.key" rows="3"></textarea><ng-template #inputField><input [type]="field.type ?? 'text'" [(ngModel)]="draft[field.key]" [name]="field.key" [required]="field.key === 'name' || field.key === 'title'"></ng-template></ng-template>
          </label>
          <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
          <div class="modal-actions"><button type="button" class="secondary" (click)="closeForm()">Cancel</button><button type="submit" class="primary" [disabled]="saving">{{ saving ? "Saving…" : "Save record" }}</button></div>
        </form>
      </div>
    </section>
  `,
})
export class RecordsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  @Input({ required: true }) entity!: EntitySection;
  section = SECTIONS[0];
  apiState = "Checking API";
  rows: RecordRow[] = [];
  filterText = "";
  formOpen = false;
  saving = false;
  editing: RecordRow | null = null;
  draft: Record<string, string> = {};
  errorMessage = "";
  assetOptions: { id: string; name: string }[] = [];

  ngOnInit(): void {
    this.section = SECTIONS.find((section) => section.id === this.entity) ?? SECTIONS[0];
    this.load();
  }

  get singular(): string { return SINGULAR[this.entity]; }
  get fields(): Field[] { return FIELDS[this.entity]; }
  get headers(): { key: string; label: string }[] { return HEADERS[this.entity]; }
  get filteredRows(): RecordRow[] {
    const filter = this.filterText.trim().toLowerCase();
    return filter ? this.rows.filter((row) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(filter))) : this.rows;
  }

  displayValue(value: unknown): string { return value == null || value === "" ? "—" : String(value); }
  slug(value: unknown): string { return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

  selectOptions(field: Field): { value: string; label: string }[] {
    if (field.options) return field.options.map((value) => ({ value, label: value }));
    return this.assetOptions.map((record) => ({ value: record.id, label: record.name }));
  }

  openForm(row: RecordRow | null = null): void {
    this.editing = row;
    this.draft = {};
    for (const field of this.fields) this.draft[field.key] = row ? String(row[field.key] ?? "") : "";
    if (!row) this.draft["status"] = this.entity === "sites" ? "Active" : "Open";
    this.errorMessage = "";
    this.formOpen = true;
  }

  closeForm(): void { this.formOpen = false; this.errorMessage = ""; }

  save(): void {
    this.saving = true;
    this.errorMessage = "";
    const request = this.editing
      ? this.http.put(`/api/${this.entity}/${this.editing["id"]}`, this.draft)
      : this.http.post(`/api/${this.entity}`, this.draft);
    request.subscribe({
      next: () => { this.saving = false; this.closeForm(); this.load(); },
      error: (error: { error?: { error?: string } }) => {
        this.saving = false;
        this.errorMessage = error.error?.error ?? "Could not save this record.";
      },
    });
  }

  remove(row: RecordRow): void {
    if (!window.confirm(`Delete this ${this.singular}? This cannot be undone.`)) return;
    this.http.delete(`/api/${this.entity}/${row["id"]}`).subscribe({
      next: () => this.load(),
      error: () => { this.errorMessage = "Could not delete this record."; },
    });
  }

  private load(): void {
    this.errorMessage = "";
    this.http.get("/api/health").subscribe({
      next: () => { this.apiState = "API connected"; },
      error: () => { this.apiState = "API offline"; },
    });
    if (this.entity === "work-orders" || this.entity === "incidents") {
      this.http.get<{ id: string; name: string }[]>("/api/options/assets").subscribe({
        next: (assets) => { this.assetOptions = assets; },
        error: () => { this.assetOptions = []; },
      });
    }
    this.http.get<RecordRow[]>(`/api/${this.entity}`).pipe(
      catchError((error: { error?: { error?: string } }) => {
        this.errorMessage = error.error?.error ?? "Could not load records.";
        return of([]);
      }),
    ).subscribe((rows) => { this.rows = rows; });
  }
}
