import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

type VehicleRow = Record<string, string | number | null>;
type HistoryKey = "ownership" | "registrations" | "assignments" | "events" | "mileage" | "documents" | "activity";

interface Field {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
}

interface HistorySection {
  key: HistoryKey;
  label: string;
  singular: string;
  fields: Field[];
  columns: { key: string; label: string }[];
}

const VEHICLE_FIELDS: Field[] = [
  { key: "name", label: "Vehicle name", required: true },
  { key: "vehicle_type", label: "Vehicle type", options: ["Truck", "Car", "Trailer", "Equipment"], required: true },
  { key: "internal_asset_id", label: "Internal asset ID", required: true },
  { key: "fleet_unit_number", label: "Fleet unit number" },
  { key: "vin", label: "VIN" },
  { key: "manufacturer", label: "Make" },
  { key: "model", label: "Model" },
  { key: "year", label: "Year", type: "number" },
  { key: "color", label: "Color" },
  { key: "fuel_type", label: "Fuel type" },
  { key: "ownership_type", label: "Ownership type", options: ["Owned", "Leased", "Rental", "Customer-owned", "Other"] },
  { key: "legal_owner", label: "Legal owner" },
  { key: "leasing_company", label: "Leasing company" },
  { key: "managing_fmc", label: "Managing FMC" },
  { key: "fleet_entry_date", label: "Fleet entry date", type: "date" },
  { key: "fleet_exit_date", label: "Fleet exit date", type: "date" },
  { key: "acquisition_date", label: "Acquisition date", type: "date" },
  { key: "lease_start_date", label: "Lease start date", type: "date" },
  { key: "lease_end_date", label: "Lease end date", type: "date" },
  { key: "site_id", label: "Branch or yard", options: [] },
  { key: "status", label: "Lifecycle status", options: ["In service", "In yard", "Out for maintenance", "Stolen", "Recovered", "Sold", "Returned to lessor", "Retired", "Active", "Maintenance", "Inactive"], required: true },
];

const HISTORY: HistorySection[] = [
  {
    key: "ownership", label: "Ownership", singular: "ownership period",
    fields: [
      { key: "legal_owner", label: "Legal owner" }, { key: "leasing_company", label: "Leasing company" },
      { key: "managing_fmc", label: "Managing FMC" }, { key: "ownership_type", label: "Ownership type" },
      { key: "fleet_entry_date", label: "Fleet entry date", type: "date" }, { key: "fleet_exit_date", label: "Fleet exit date", type: "date" },
      { key: "acquisition_date", label: "Acquisition date", type: "date" }, { key: "lease_start_date", label: "Lease start date", type: "date" },
      { key: "lease_end_date", label: "Lease end date", type: "date" }, { key: "effective_start", label: "Effective from", type: "date", required: true },
      { key: "effective_end", label: "Effective through", type: "date" },
    ],
    columns: [{ key: "effective_start", label: "Effective from" }, { key: "effective_end", label: "Through" }, { key: "legal_owner", label: "Legal owner" }, { key: "leasing_company", label: "Leasing company" }, { key: "ownership_type", label: "Type" }],
  },
  {
    key: "registrations", label: "Plates & registration", singular: "registration",
    fields: [
      { key: "plate_number", label: "Plate number", required: true }, { key: "issuing_state", label: "Issuing state" },
      { key: "plate_type", label: "Plate type" }, { key: "registration_expiration", label: "Registration expires", type: "date" },
      { key: "effective_start", label: "Effective from", type: "date", required: true }, { key: "effective_end", label: "Effective through", type: "date" },
      { key: "document_id", label: "Registration document", options: [] },
    ],
    columns: [{ key: "plate_number", label: "Plate" }, { key: "issuing_state", label: "State" }, { key: "plate_type", label: "Type" }, { key: "registration_expiration", label: "Expires" }, { key: "effective_start", label: "From" }, { key: "effective_end", label: "Through" }, { key: "document_id", label: "Document" }],
  },
  {
    key: "assignments", label: "Assignments", singular: "assignment",
    fields: [
      { key: "assignment_status", label: "Assignment", options: ["Assigned", "Unassigned"], required: true },
      { key: "customer", label: "Customer" }, { key: "contract", label: "Contract" },
      { key: "assigned_driver", label: "Assigned driver" }, { key: "driver_pool", label: "Driver pool" },
      { key: "branch", label: "Branch" }, { key: "yard", label: "Yard" },
      { key: "assignment_start", label: "Starts at", type: "datetime-local", required: true },
      { key: "assignment_end", label: "Ends at", type: "datetime-local" },
      { key: "handover_notes", label: "Handover record", type: "textarea" },
      { key: "handover_document_id", label: "Handover document", options: [] },
    ],
    columns: [{ key: "assignment_status", label: "Assignment" }, { key: "customer", label: "Customer" }, { key: "assigned_driver", label: "Driver" }, { key: "driver_pool", label: "Pool" }, { key: "branch", label: "Branch" }, { key: "yard", label: "Yard" }, { key: "assignment_start", label: "From" }, { key: "assignment_end", label: "Through" }, { key: "handover_document_id", label: "Handover doc" }],
  },
  {
    key: "events", label: "Status & events", singular: "event",
    fields: [
      { key: "event_type", label: "Event", options: ["In service", "In yard", "Out for maintenance", "Stolen", "Recovered", "Sold", "Returned to lessor", "Retired", "Handover", "Other"], required: true },
      { key: "effective_at", label: "Effective at", type: "datetime-local", required: true },
      { key: "reason", label: "Reason", type: "textarea" }, { key: "report_reference", label: "Report reference" },
      { key: "reported_start", label: "Reported period starts", type: "datetime-local" },
      { key: "reported_end", label: "Reported period ends", type: "datetime-local" },
      { key: "recovery_at", label: "Recovered at", type: "datetime-local" },
      { key: "handover_at", label: "Transfer or handover at", type: "datetime-local" },
      { key: "evidence_document_id", label: "Evidence document", options: [] },
    ],
    columns: [{ key: "event_type", label: "Event" }, { key: "effective_at", label: "Effective at" }, { key: "reason", label: "Reason" }, { key: "report_reference", label: "Reference" }, { key: "recovery_at", label: "Recovered" }, { key: "handover_at", label: "Handover" }, { key: "evidence_document_id", label: "Evidence" }],
  },
  {
    key: "mileage", label: "Mileage", singular: "odometer reading",
    fields: [
      { key: "reading", label: "Odometer reading", type: "number", required: true },
      { key: "unit", label: "Unit", options: ["km", "mi"], required: true },
      { key: "reading_at", label: "Reading date and time", type: "datetime-local", required: true },
      { key: "source", label: "Source", options: ["Manual entry", "Service record", "Telematics"], required: true },
      { key: "notes", label: "Notes" },
    ],
    columns: [{ key: "reading", label: "Reading" }, { key: "unit", label: "Unit" }, { key: "reading_at", label: "Date" }, { key: "source", label: "Source" }, { key: "notes", label: "Notes" }],
  },
  {
    key: "documents", label: "Documents", singular: "document",
    fields: [
      { key: "document_type", label: "Document type", options: ["Title", "Registration", "Lease", "Inspection", "Insurance", "Handover", "Sale", "Theft", "Other"], required: true },
      { key: "reference", label: "Reference" }, { key: "issuing_party", label: "Issuing party" },
      { key: "issue_date", label: "Issue date", type: "date" }, { key: "expiration_date", label: "Expiration date", type: "date" },
      { key: "file_url", label: "File link", type: "url" },
    ],
    columns: [{ key: "document_type", label: "Type" }, { key: "reference", label: "Reference" }, { key: "issuing_party", label: "Issuing party" }, { key: "issue_date", label: "Issued" }, { key: "expiration_date", label: "Expires" }, { key: "file_url", label: "File" }],
  },
  {
    key: "activity", label: "Activity log", singular: "activity entry",
    fields: [],
    columns: [{ key: "created_at", label: "When" }, { key: "actor_name", label: "Changed by" }, { key: "actor_type", label: "Actor" }, { key: "action", label: "Action" }, { key: "entity_type", label: "Record type" }, { key: "change_data", label: "Before and after" }],
  },
];

@Component({
  selector: "fieldline-vehicles-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div><p class="eyebrow">FLEET MANAGEMENT</p><h1>Vehicles</h1><p class="lede">Manage vehicle records, lifecycle, assignments, mileage, and supporting documents.</p></div>
        <span class="live-pill"><span class="status-dot"></span>{{ apiState }}</span>
      </header>
      <div class="toolbar">
        <label class="search"><span aria-hidden="true">⌕</span><input [(ngModel)]="filterText" placeholder="Search vehicles" aria-label="Search vehicles"></label>
        <button class="primary" type="button" (click)="openVehicleForm()">＋ Add vehicle</button>
      </div>
      <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
      <article class="panel table-panel">
        <table *ngIf="filteredVehicles.length; else noVehicles">
          <thead><tr><th>Vehicle</th><th>Asset ID / unit</th><th>Year · make · model</th><th>VIN</th><th>Lifecycle</th><th>Site</th><th>Actions</th></tr></thead>
          <tbody><tr *ngFor="let vehicle of filteredVehicles">
            <td><strong>{{ display(vehicle["name"]) }}</strong><small class="cell-subtitle">{{ display(vehicle["vehicle_type"] || (vehicle["category"] === "Vehicle" ? "Needs classification" : vehicle["category"])) }}</small></td>
            <td>{{ display(vehicle["internal_asset_id"]) }}<small class="cell-subtitle">{{ display(vehicle["fleet_unit_number"]) }}</small></td>
            <td>{{ yearMakeModel(vehicle) }}</td><td>{{ display(vehicle["vin"]) }}</td>
            <td><span class="state">{{ display(vehicle["status"]) }}</span></td><td>{{ display(vehicle["site_name"]) }}</td>
            <td class="actions-cell"><button class="text-button" type="button" (click)="selectVehicle(vehicle)">Manage</button><button class="text-button" type="button" (click)="openVehicleForm(vehicle)">Edit</button></td>
          </tr></tbody>
        </table>
        <ng-template #noVehicles><div class="empty-state"><div class="empty-icon">＋</div><h3>{{ filterText ? "No matching vehicles" : "No vehicles yet" }}</h3><p>Register trucks, cars, trailers, and equipment. Legacy Device and Other records remain stored but are not shown here.</p><button class="secondary" type="button" (click)="openVehicleForm()">Add vehicle</button></div></ng-template>
      </article>

      <article class="panel vehicle-detail" *ngIf="selectedVehicle">
        <div class="panel-head vehicle-detail-head">
          <div><p class="eyebrow">VEHICLE RECORD</p><h2>{{ display(selectedVehicle["name"]) }}</h2><p>{{ display(selectedVehicle["internal_asset_id"]) }} · {{ yearMakeModel(selectedVehicle) }} · {{ display(selectedVehicle["status"]) }}</p></div>
          <button type="button" class="secondary" (click)="selectedVehicle = null">Close details</button>
        </div>
        <div class="vehicle-tabs" role="tablist" aria-label="Vehicle details">
          <button *ngFor="let section of historySections" type="button" role="tab" [attr.aria-selected]="activeHistory === section.key" [class.active]="activeHistory === section.key" (click)="selectHistory(section)">{{ section.label }}</button>
        </div>
        <div class="toolbar detail-toolbar"><div><h3>{{ activeSection.label }}</h3><p class="lede">{{ activeHistory === "activity" ? "Append-only changes for this vehicle and its linked fleet records." : "Effective-dated records are retained so prior fleet history remains available." }}</p></div><button *ngIf="activeHistory !== 'activity'" class="primary" type="button" (click)="openHistoryForm()">＋ Add {{ activeSection.singular }}</button></div>
        <article class="panel table-panel history-table">
          <table *ngIf="historyRows.length; else noHistory">
            <thead><tr><th *ngFor="let column of activeSection.columns">{{ column.label }}</th><th *ngIf="activeHistory !== 'activity'" class="actions-heading">Actions</th></tr></thead>
            <tbody><tr *ngFor="let row of historyRows"><td *ngFor="let column of activeSection.columns">
              <ng-container *ngIf="column.key === 'file_url' && row[column.key]; else textValue"><a [href]="safeLink(row[column.key])" target="_blank" rel="noopener noreferrer">Open document</a></ng-container>
              <ng-template #textValue>{{ column.key === "change_data" ? activitySummary(row[column.key]) : display(row[column.key]) }}</ng-template>
            </td><td *ngIf="activeHistory !== 'activity'" class="actions-cell"><button class="text-button" type="button" (click)="openHistoryForm(row)">Edit</button><button class="text-button danger-text" type="button" (click)="removeHistory(row)">Delete</button></td></tr></tbody>
          </table>
          <ng-template #noHistory><div class="empty-state compact-empty"><h3>No {{ activeSection.label.toLowerCase() }} recorded</h3><p>Add a record to start this vehicle's history.</p></div></ng-template>
        </article>
      </article>

      <div class="modal-backdrop" *ngIf="vehicleFormOpen" (click)="closeVehicleForm()">
        <form class="modal fleet-modal" (ngSubmit)="saveVehicle()" (click)="$event.stopPropagation()">
          <div class="modal-head"><div><p class="eyebrow">{{ editingVehicle ? "UPDATE VEHICLE" : "NEW VEHICLE" }}</p><h2>{{ editingVehicle ? "Edit vehicle" : "Add vehicle" }}</h2></div><button type="button" class="icon-button" aria-label="Close dialog" (click)="closeVehicleForm()">×</button></div>
          <div class="fleet-form-grid"><label *ngFor="let field of vehicleFields">{{ field.label }}
            <select *ngIf="field.key === 'site_id' || field.options; else vehicleInput" [(ngModel)]="vehicleDraft[field.key]" [name]="field.key" [required]="field.required ?? false">
              <option value="">Select…</option><option *ngIf="field.key === 'site_id' && vehicleDraft[field.key] && !hasSite(vehicleDraft[field.key])" [value]="vehicleDraft[field.key]">Existing site</option>
              <option *ngFor="let option of fieldOptions(field)" [value]="option.value">{{ option.label }}</option>
            </select>
            <ng-template #vehicleInput><input [type]="field.type ?? 'text'" [(ngModel)]="vehicleDraft[field.key]" [name]="field.key" [required]="field.required ?? false" [min]="field.type === 'number' ? 1886 : null" [max]="field.type === 'number' ? currentYear + 2 : null"></ng-template>
          </label></div>
          <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
          <div class="modal-actions"><button type="button" class="secondary" (click)="closeVehicleForm()">Cancel</button><button type="submit" class="primary" [disabled]="saving">{{ saving ? "Saving…" : "Save vehicle" }}</button></div>
        </form>
      </div>

      <div class="modal-backdrop" *ngIf="historyFormOpen" (click)="closeHistoryForm()">
        <form class="modal fleet-modal" (ngSubmit)="saveHistory()" (click)="$event.stopPropagation()">
          <div class="modal-head"><div><p class="eyebrow">{{ editingHistory ? "UPDATE HISTORY" : "NEW HISTORY" }}</p><h2>{{ editingHistory ? "Edit " + activeSection.singular : "Add " + activeSection.singular }}</h2></div><button type="button" class="icon-button" aria-label="Close dialog" (click)="closeHistoryForm()">×</button></div>
          <div class="fleet-form-grid"><label *ngFor="let field of activeSection.fields">{{ field.label }}
            <select *ngIf="field.options || isDocumentField(field); else historyInput" [(ngModel)]="historyDraft[field.key]" [name]="field.key" [required]="field.required ?? false">
              <option value="">Select…</option><option *ngFor="let option of fieldOptions(field)" [value]="option.value">{{ option.label }}</option>
            </select>
            <ng-template #historyInput><textarea *ngIf="field.type === 'textarea'; else historyPlainInput" [(ngModel)]="historyDraft[field.key]" [name]="field.key" rows="3" [required]="field.required ?? false"></textarea>
              <ng-template #historyPlainInput><input [type]="field.type ?? 'text'" [(ngModel)]="historyDraft[field.key]" [name]="field.key" [required]="field.required ?? false" [min]="field.type === 'number' && field.key === 'reading' ? 0 : null"></ng-template>
            </ng-template>
          </label></div>
          <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
          <div class="modal-actions"><button type="button" class="secondary" (click)="closeHistoryForm()">Cancel</button><button type="submit" class="primary" [disabled]="saving">{{ saving ? "Saving…" : "Save record" }}</button></div>
        </form>
      </div>
    </section>
  `,
})
export class VehiclesPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly historySections = HISTORY;
  readonly vehicleFields = VEHICLE_FIELDS;
  readonly currentYear = new Date().getFullYear();
  vehicles: VehicleRow[] = [];
  sites: { id: string; name: string }[] = [];
  filterText = "";
  apiState = "Checking API";
  errorMessage = "";
  saving = false;
  selectedVehicle: VehicleRow | null = null;
  activeHistory: HistoryKey = "ownership";
  historyRows: VehicleRow[] = [];
  vehicleFormOpen = false;
  historyFormOpen = false;
  editingVehicle: VehicleRow | null = null;
  editingHistory: VehicleRow | null = null;
  vehicleDraft: Record<string, string> = {};
  historyDraft: Record<string, string> = {};

  ngOnInit(): void {
    this.loadVehicles();
    this.http.get<{ id: string; name: string }[]>("/api/options/sites").subscribe({
      next: (sites) => { this.sites = sites; },
      error: () => { this.sites = []; },
    });
  }

  get filteredVehicles(): VehicleRow[] {
    const filter = this.filterText.trim().toLowerCase();
    return filter ? this.vehicles.filter((vehicle) => Object.values(vehicle).some((value) => String(value ?? "").toLowerCase().includes(filter))) : this.vehicles;
  }

  get activeSection(): HistorySection {
    return this.historySections.find((section) => section.key === this.activeHistory) ?? this.historySections[0];
  }

  display(value: unknown): string { return value == null || value === "" ? "—" : String(value); }
  yearMakeModel(vehicle: VehicleRow): string {
    return [vehicle["year"], vehicle["manufacturer"], vehicle["model"]].filter((value) => value != null && value !== "").join(" ") || "—";
  }
  safeLink(value: unknown): string { return String(value ?? ""); }
  hasSite(value: string): boolean { return this.sites.some((site) => site.id === value); }

  fieldOptions(field: Field): { value: string; label: string }[] {
    if (field.key === "site_id") return this.sites.map((site) => ({ value: site.id, label: site.name }));
    if (this.isDocumentField(field)) {
      return this.documentRows.map((document) => ({
        value: String(document["id"]),
        label: `${document["document_type"]}${document["reference"] ? ` · ${document["reference"]}` : ""}`,
      }));
    }
    return (field.options ?? []).map((option) => ({ value: option, label: option }));
  }

  selectVehicle(vehicle: VehicleRow): void {
    this.selectedVehicle = vehicle;
    this.selectHistory(this.historySections[0]);
  }

  selectHistory(section: HistorySection): void {
    this.activeHistory = section.key;
    this.historyFormOpen = false;
    this.historyRows = [];
    this.errorMessage = "";
    if (this.selectedVehicle) {
      const request = section.key === "activity"
        ? this.http.get<VehicleRow[]>(`/api/fleet/activity?vehicle_id=${this.selectedVehicle["id"]}`)
        : this.http.get<VehicleRow[]>(`/api/vehicles/${this.selectedVehicle["id"]}/${section.key}`);
      request.subscribe({
        next: (rows) => { this.historyRows = rows; },
        error: (error: { error?: { error?: string } }) => { this.errorMessage = error.error?.error ?? "Could not load vehicle history."; },
      });
    }
  }

  openVehicleForm(vehicle: VehicleRow | null = null): void {
    this.editingVehicle = vehicle;
    this.vehicleDraft = {};
    for (const field of this.vehicleFields) this.vehicleDraft[field.key] = this.formValue(field.key, vehicle?.[field.key]);
    if (!vehicle) this.vehicleDraft["status"] = "In service";
    this.errorMessage = "";
    this.vehicleFormOpen = true;
  }

  closeVehicleForm(): void { this.vehicleFormOpen = false; this.errorMessage = ""; }

  saveVehicle(): void {
    this.saving = true;
    this.errorMessage = "";
    const id = this.editingVehicle?.["id"];
    const request = id
      ? this.http.put(`/api/vehicles/${id}`, this.vehicleDraft)
      : this.http.post("/api/vehicles", this.vehicleDraft);
    request.subscribe({
      next: (value) => {
        this.saving = false;
        this.closeVehicleForm();
        this.loadVehicles(String((value as VehicleRow)["id"]));
      },
      error: (error: { error?: { error?: string } }) => {
        this.saving = false;
        this.errorMessage = error.error?.error ?? "Could not save this vehicle.";
      },
    });
  }

  openHistoryForm(row: VehicleRow | null = null): void {
    this.editingHistory = row;
    this.historyDraft = {};
    for (const field of this.activeSection.fields) this.historyDraft[field.key] = this.formValue(field.key, row?.[field.key]);
    if (!row) {
      if (this.activeHistory === "assignments") this.historyDraft["assignment_status"] = "Assigned";
      if (this.activeHistory === "mileage") this.historyDraft["unit"] = "km";
    }
    this.errorMessage = "";
    if (this.activeHistory === "registrations" || this.activeHistory === "assignments" || this.activeHistory === "events") this.loadDocuments();
    this.historyFormOpen = true;
  }

  closeHistoryForm(): void { this.historyFormOpen = false; this.errorMessage = ""; }

  saveHistory(): void {
    if (!this.selectedVehicle) return;
    this.saving = true;
    this.errorMessage = "";
    const id = this.selectedVehicle["id"];
    const path = `/api/vehicles/${id}/${this.activeHistory}`;
    const request = this.editingHistory
      ? this.http.put(`${path}/${this.editingHistory["id"]}`, this.historyDraft)
      : this.http.post(path, this.historyDraft);
    request.subscribe({
      next: () => { this.saving = false; this.closeHistoryForm(); this.selectHistory(this.activeSection); },
      error: (error: { error?: { error?: string } }) => {
        this.saving = false;
        this.errorMessage = error.error?.error ?? "Could not save this history record.";
      },
    });
  }

  removeHistory(row: VehicleRow): void {
    if (!this.selectedVehicle || !window.confirm(`Delete this ${this.activeSection.singular}? This cannot be undone.`)) return;
    this.http.delete(`/api/vehicles/${this.selectedVehicle["id"]}/${this.activeHistory}/${row["id"]}`).subscribe({
      next: () => { this.selectHistory(this.activeSection); },
      error: (error: { error?: { error?: string } }) => { this.errorMessage = error.error?.error ?? "Could not delete this record."; },
    });
  }

  isDocumentField(field: Field): boolean {
    return ["document_id", "handover_document_id", "evidence_document_id"].includes(field.key);
  }

  private documentRows: VehicleRow[] = [];

  private loadDocuments(): void {
    if (!this.selectedVehicle) return;
    this.http.get<VehicleRow[]>(`/api/vehicles/${this.selectedVehicle["id"]}/documents`).subscribe({
      next: (rows) => { this.documentRows = rows; },
      error: () => { this.documentRows = []; },
    });
  }

  private formValue(key: string, value: unknown): string {
    if (value == null) return "";
    const text = String(value);
    if (key.endsWith("_at") || key.startsWith("reported_") || key.startsWith("assignment_")) return text.replace(" ", "T").slice(0, 16);
    if (key.endsWith("_date") || key === "effective_start" || key === "effective_end") return text.slice(0, 10);
    return text;
  }

  activitySummary(value: unknown): string {
    let changes: unknown = value;
    if (typeof value === "string") {
      try { changes = JSON.parse(value); } catch { return value; }
    }
    if (!changes || typeof changes !== "object") return this.display(value);
    const record = changes as Record<string, unknown>;
    if ("record" in record) {
      const change = record["record"] as { after?: unknown } | undefined;
      const after = change?.after;
      return after && typeof after === "object"
        ? `Added ${Object.keys(after).filter((key) => !["id", "created_at", "updated_at"].includes(key)).join(", ")}`
        : "Record deleted";
    }
    return Object.entries(record).map(([field, change]) => {
      const pair = change as { before?: unknown; after?: unknown };
      return `${field}: ${this.display(pair.before)} → ${this.display(pair.after)}`;
    }).join("; ") || "No field changes";
  }

  private loadVehicles(selectId?: string): void {
    this.http.get<VehicleRow[]>("/api/vehicles").subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;
        this.apiState = "API connected";
        if (selectId) {
          const selected = vehicles.find((vehicle) => String(vehicle["id"]) === selectId);
          if (selected) this.selectVehicle(selected);
        }
      },
      error: (error: { error?: { error?: string } }) => {
        this.apiState = "API offline";
        this.errorMessage = error.error?.error ?? "Could not load vehicle records. Confirm that the vehicle fleet database migration has been applied.";
      },
    });
  }
}
