import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";

type FleetModule =
  | "customers" | "contracts" | "drivers" | "driver-assignments" | "toll-accounts" | "transponders"
  | "transactions" | "violations" | "payments" | "maintenance" | "trips"
  | "tasks" | "approvals" | "activity" | "toll-payment-history" | "toll-account-ledger" | "toll-account-balances";

type FleetRow = Record<string, unknown>;

interface FleetField {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  lookup?: string;
}

interface FleetPageDefinition {
  title: string;
  description: string;
  singular: string;
  endpoint: string;
  readOnly?: boolean;
  fields: FleetField[];
  columns: { key: string; label: string }[];
}

const PAYER_OPTIONS = ["Customer", "FMC", "Owner", "Other"];
const STATUS_OPTIONS = ["Active", "Inactive"];
const VEHICLE_FIELD: FleetField = { key: "vehicle_id", label: "Vehicle", lookup: "vehicles" };
const REQUIRED_VEHICLE_FIELD: FleetField = { ...VEHICLE_FIELD, required: true };

const PAGES: Record<FleetModule, FleetPageDefinition> = {
  customers: {
    title: "Customers", description: "Customer accounts, operating locations, and contacts.", singular: "customer", endpoint: "customers",
    fields: [
      { key: "account_number", label: "Customer account" }, { key: "name", label: "Customer name", required: true },
      { key: "operating_location", label: "Operating location" }, { key: "contact_name", label: "Contact name" },
      { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" },
      { key: "status", label: "Status", options: ["Active", "Inactive"], required: true },
    ],
    columns: [{ key: "account_number", label: "Account" }, { key: "name", label: "Customer" }, { key: "operating_location", label: "Operating location" }, { key: "contact_name", label: "Contact" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status" }],
  },
  contracts: {
    title: "Contracts", description: "Contract dates, covered unit notes, and who pays each charge type.", singular: "contract", endpoint: "contracts",
    fields: [
      { key: "customer_id", label: "Customer", lookup: "customers", required: true },
      { key: "contract_number", label: "Contract number", required: true },
      { key: "start_date", label: "Starts", type: "date" }, { key: "end_date", label: "Ends", type: "date" },
      { key: "covered_units", label: "Covered units (fleet unit or asset IDs)", type: "textarea" },
      { key: "toll_payer", label: "Tolls paid by", options: PAYER_OPTIONS, required: true },
      { key: "violation_payer", label: "Violations paid by", options: PAYER_OPTIONS, required: true },
      { key: "maintenance_payer", label: "Maintenance paid by", options: PAYER_OPTIONS, required: true },
      { key: "other_charge_payer", label: "Other charges paid by", options: PAYER_OPTIONS, required: true },
      { key: "rules_notes", label: "Rules and notes", type: "textarea" },
      { key: "status", label: "Status", options: ["Draft", "Active", "Expired", "Terminated"], required: true },
    ],
    columns: [{ key: "contract_number", label: "Contract" }, { key: "customer_name", label: "Customer" }, { key: "start_date", label: "Starts" }, { key: "end_date", label: "Ends" }, { key: "covered_units", label: "Covered units" }, { key: "toll_payer", label: "Toll payer" }, { key: "violation_payer", label: "Violation payer" }, { key: "maintenance_payer", label: "Maintenance payer" }, { key: "status", label: "Status" }],
  },
  drivers: {
    title: "Drivers", description: "Driver identity, customer or employer, contact details, and active status. License details are intentionally not collected here.", singular: "driver", endpoint: "drivers",
    fields: [
      { key: "driver_id", label: "Driver ID", required: true }, { key: "name", label: "Driver name", required: true },
      { key: "customer_id", label: "Customer", lookup: "customers" }, { key: "employer", label: "Employer" },
      { key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" },
      { key: "status", label: "Status", options: ["Active", "Inactive", "Suspended"], required: true },
    ],
    columns: [{ key: "driver_id", label: "Driver ID" }, { key: "name", label: "Driver" }, { key: "customer_name", label: "Customer" }, { key: "employer", label: "Employer" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "status", label: "Status" }],
  },
  "driver-assignments": {
    title: "Driver assignments", description: "Effective-dated driver-to-vehicle assignments with customer, contract, and handover history.", singular: "driver assignment", endpoint: "driver-assignments",
    fields: [
      REQUIRED_VEHICLE_FIELD, { key: "driver_id", label: "Driver", lookup: "drivers" },
      { key: "customer_id", label: "Customer", lookup: "customers" }, { key: "contract_id", label: "Contract", lookup: "contracts" },
      { key: "assignment_start", label: "Assignment starts", type: "datetime-local", required: true },
      { key: "assignment_end", label: "Assignment ends", type: "datetime-local" },
      { key: "status", label: "Status", options: ["Assigned", "Unassigned", "Ended", "Suspended"], required: true },
      { key: "handover_notes", label: "Handover notes", type: "textarea" },
    ],
    columns: [{ key: "vehicle_name", label: "Vehicle" }, { key: "driver_name", label: "Driver" }, { key: "customer_name", label: "Customer" }, { key: "contract_number", label: "Contract" }, { key: "assignment_start", label: "From" }, { key: "assignment_end", label: "Through" }, { key: "status", label: "Status" }, { key: "handover_notes", label: "Handover" }],
  },
  "toll-accounts": {
    title: "Toll accounts", description: "Account ownership, toll program, billing, replenishment settings, and dated balance details.", singular: "toll account", endpoint: "toll-accounts",
    fields: [
      { key: "provider", label: "Provider", required: true }, { key: "authority", label: "Toll authority" },
      { key: "account_reference", label: "Account reference", required: true }, { key: "account_display_name", label: "Account display name" },
      { key: "account_holder_legal_name", label: "Account holder legal name" },
      { key: "account_holder_type", label: "Account holder type", options: ["FMC", "Customer"] },
      { key: "account_opened", label: "Account opened", type: "date" },
      { key: "billing_method", label: "Billing method" },
      { key: "auto_replenishment", label: "Auto replenishment", options: ["Yes", "No"], required: true },
      { key: "auto_replenishment_threshold", label: "Replenishment threshold", type: "number" },
      { key: "last_known_balance", label: "Last known balance", type: "number" }, { key: "balance_as_of", label: "Balance as of", type: "datetime-local" },
      { key: "payment_method_status", label: "Payment method status" },
      { key: "fmc_branch", label: "FMC branch" }, { key: "service_region", label: "Service region" },
      { key: "portal_reference", label: "Portal reference (demo)" }, { key: "last_sync_at", label: "Last sync", type: "datetime-local" },
      { key: "status", label: "Status", options: ["Active", "Inactive", "Suspended", "Closed"], required: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [{ key: "account_reference", label: "Account reference" }, { key: "account_display_name", label: "Account" }, { key: "provider", label: "Toll program" }, { key: "account_holder_legal_name", label: "Account holder" }, { key: "account_holder_type", label: "Holder type" }, { key: "status", label: "Status" }, { key: "billing_method", label: "Billing method" }, { key: "auto_replenishment", label: "Auto replenish" }, { key: "auto_replenishment_threshold", label: "Threshold" }, { key: "last_known_balance", label: "Last balance" }, { key: "balance_as_of", label: "Balance as of" }, { key: "payment_method_status", label: "Payment method" }, { key: "fmc_branch", label: "Branch" }, { key: "service_region", label: "Service region" }],
  },
  "toll-payment-history": {
    title: "Toll payment history", description: "Read-only source history of toll account payment events, including failed attempts and items awaiting reconciliation.", singular: "toll payment event", endpoint: "toll-payment-history", readOnly: true, fields: [],
    columns: [{ key: "payment_reference", label: "Payment record" }, { key: "transaction_reference", label: "Transaction" }, { key: "related_notice_number", label: "Related notice" }, { key: "vehicle_name", label: "Vehicle" }, { key: "account_reference", label: "Toll account" }, { key: "passage_at", label: "Passage time" }, { key: "payment_at", label: "Payment event" }, { key: "payment_status", label: "Payment status" }, { key: "amount", label: "Amount" }, { key: "provider_payment_reference", label: "Provider reference" }, { key: "exception_code", label: "Exception" }],
  },
  "toll-account-ledger": {
    title: "Toll account ledger", description: "Read-only account opening balances, toll debits, funding credits, and running balances from the source ledger.", singular: "ledger entry", endpoint: "toll-account-ledger", readOnly: true, fields: [],
    columns: [{ key: "ledger_reference", label: "Ledger entry" }, { key: "account_reference", label: "Toll account" }, { key: "occurred_at", label: "When" }, { key: "entry_type", label: "Entry type" }, { key: "transaction_reference", label: "Transaction" }, { key: "payment_reference", label: "Payment/funding ref" }, { key: "vehicle_name", label: "Vehicle" }, { key: "signed_amount", label: "Signed amount" }, { key: "running_balance", label: "Running balance" }, { key: "currency", label: "Currency" }],
  },
  "toll-account-balances": {
    title: "Toll account balances", description: "Read-only source balance snapshots and reconciliation results. Balances are snapshots, not live account values.", singular: "balance snapshot", endpoint: "toll-account-balances", readOnly: true, fields: [],
    columns: [{ key: "account_reference", label: "Toll account" }, { key: "account_holder", label: "Account holder" }, { key: "account_status", label: "Status" }, { key: "snapshot_at", label: "As of" }, { key: "opening_balance", label: "Opening" }, { key: "replenishment_credits", label: "Credits" }, { key: "settled_toll_debits", label: "Settled toll debits" }, { key: "calculated_ending_balance", label: "Calculated balance" }, { key: "source_ending_balance", label: "Source balance" }, { key: "balance_difference", label: "Difference" }, { key: "reconciliation_result", label: "Reconciliation" }, { key: "successful_toll_charges", label: "Successful charges" }, { key: "failed_attempts", label: "Failed attempts" }, { key: "currency", label: "Currency" }],
  },
  transponders: {
    title: "Transponders", description: "Effective-dated transponder-to-vehicle and plate assignments.", singular: "transponder assignment", endpoint: "transponders",
    fields: [
      { key: "toll_account_id", label: "Toll account", lookup: "toll-accounts", required: true },
      { key: "transponder_id", label: "Transponder ID", required: true }, VEHICLE_FIELD,
      { key: "plate_number", label: "Assigned plate" }, { key: "effective_start", label: "Effective from", type: "date", required: true },
      { key: "effective_end", label: "Effective through", type: "date" },
      { key: "status", label: "Status", options: ["Active", "Inactive", "Lost", "Returned"], required: true },
    ],
    columns: [{ key: "provider_name", label: "Account" }, { key: "transponder_id", label: "Transponder" }, { key: "vehicle_name", label: "Vehicle" }, { key: "plate_number", label: "Plate" }, { key: "effective_start", label: "From" }, { key: "effective_end", label: "Through" }, { key: "status", label: "Status" }],
  },
  transactions: {
    title: "Toll transactions", description: "Toll authority events, location, charge, and posting status.", singular: "toll transaction", endpoint: "transactions",
    fields: [
      { key: "authority", label: "Authority", required: true }, { key: "toll_account_id", label: "Toll account", lookup: "toll-accounts" },
      { key: "transponder_id", label: "Transponder ID" }, VEHICLE_FIELD, { key: "plate_number", label: "Plate at event" },
      { key: "transaction_reference", label: "Transaction ID", required: true },
      { key: "toll_at", label: "Toll timestamp", type: "datetime-local", required: true },
      { key: "location", label: "Toll location" }, { key: "amount", label: "Amount", type: "number", required: true },
      { key: "posting_status", label: "Posting status", options: ["Posted", "Pending", "Rejected", "Disputed"], required: true },
    ],
    columns: [{ key: "authority", label: "Authority" }, { key: "transaction_reference", label: "Transaction ID" }, { key: "vehicle_name", label: "Vehicle" }, { key: "plate_number", label: "Plate" }, { key: "toll_at", label: "Timestamp" }, { key: "location", label: "Location" }, { key: "amount", label: "Amount" }, { key: "posting_status", label: "Posting" }],
  },
  violations: {
    title: "Toll violations & disputes", description: "Track notices, verification, evidence, recommendations, approvals, deadlines, and authority outcomes. Duplicate notices are prevented per FMC and authority.", singular: "violation case", endpoint: "violations",
    fields: [
      { key: "managing_fmc", label: "Managing FMC", required: true }, { key: "authority", label: "Authority", required: true },
      { key: "notice_number", label: "Notice number", required: true }, VEHICLE_FIELD,
      { key: "transaction_id", label: "Related transaction", lookup: "transactions" },
      { key: "plate_shown", label: "Plate shown on notice" }, { key: "event_at", label: "Event time", type: "datetime-local" },
      { key: "event_details", label: "Event details", type: "textarea" }, { key: "amount", label: "Amount", type: "number" },
      { key: "deadline", label: "Response deadline", type: "date" },
      { key: "verification_status", label: "Verification", options: ["Pending", "Verified", "Mismatch", "Needs evidence"], required: true },
      { key: "evidence_link", label: "Evidence link", type: "url" },
      { key: "recommendation", label: "Recommendation", type: "textarea" },
      { key: "approval_status", label: "Approval", options: ["Pending", "Approved", "Rejected"], required: true },
      { key: "authority_outcome", label: "Authority outcome", options: ["", "Paid", "Dismissed", "Reduced", "Upheld", "Appealed"] },
      { key: "case_status", label: "Case status", options: ["Open", "In review", "Disputed", "Paid", "Closed"], required: true },
      { key: "case_owner", label: "Case owner" }, { key: "next_action", label: "Next action" },
    ],
    columns: [{ key: "source_case_id", label: "Case ID" }, { key: "notice_number", label: "Notice" }, { key: "authority", label: "Authority" }, { key: "vehicle_name", label: "Vehicle" }, { key: "transaction_reference", label: "Transaction" }, { key: "payment_reference", label: "Payment record" }, { key: "exception_code", label: "Exception" }, { key: "plate_shown", label: "Plate" }, { key: "amount", label: "Notice total" }, { key: "case_opened_at", label: "Opened" }, { key: "resolution_at", label: "Resolved" }, { key: "verification_status", label: "Verification" }, { key: "approval_status", label: "Approval" }, { key: "authority_outcome", label: "Authority outcome" }, { key: "case_status", label: "Case" }],
  },
  payments: {
    title: "Payments & chargebacks", description: "Keep authority payments and customer chargebacks as separate, independently reconciled records.", singular: "payment or chargeback", endpoint: "payments",
    fields: [
      { key: "payment_type", label: "Payment type", options: ["Authority payment", "Customer chargeback"], required: true },
      { key: "violation_id", label: "Violation notice", lookup: "violations" }, VEHICLE_FIELD,
      { key: "customer_id", label: "Customer", lookup: "customers" }, { key: "paid_party", label: "Paid party" },
      { key: "payment_reference", label: "Payment reference" }, { key: "amount", label: "Amount", type: "number", required: true },
      { key: "status", label: "Status", options: ["Pending", "Paid", "Failed", "Reconciled", "Disputed"], required: true },
      { key: "paid_at", label: "Paid at", type: "datetime-local" }, { key: "receipt_link", label: "Receipt link", type: "url" },
      { key: "reconciliation_notes", label: "Reconciliation notes", type: "textarea" },
    ],
    columns: [{ key: "payment_type", label: "Type" }, { key: "notice_number", label: "Violation" }, { key: "vehicle_name", label: "Vehicle" }, { key: "customer_name", label: "Customer" }, { key: "paid_party", label: "Paid party" }, { key: "payment_reference", label: "Reference" }, { key: "amount", label: "Amount" }, { key: "status", label: "Status" }, { key: "paid_at", label: "Paid at" }],
  },
  maintenance: {
    title: "Maintenance & inspections", description: "Plan schedules by date or mileage; record vendors, repairs, costs, downtime, work orders, and inspection results.", singular: "maintenance record", endpoint: "maintenance",
    fields: [
      REQUIRED_VEHICLE_FIELD, { key: "work_order_id", label: "Work order", lookup: "work-orders" },
      { key: "service_type", label: "Service or inspection type", required: true },
      { key: "schedule_date", label: "Scheduled date", type: "date" }, { key: "due_date", label: "Due date", type: "date" },
      { key: "due_mileage", label: "Due odometer", type: "number" },
      { key: "mileage_unit", label: "Odometer unit", options: ["km", "mi"], required: true },
      { key: "vendor", label: "Vendor" }, { key: "repairs", label: "Repairs and work performed", type: "textarea" },
      { key: "cost", label: "Cost", type: "number" }, { key: "downtime_start", label: "Downtime start", type: "datetime-local" },
      { key: "downtime_end", label: "Downtime end", type: "datetime-local" },
      { key: "inspection_result", label: "Inspection result", options: ["", "Pass", "Fail", "Advisory"] },
      { key: "status", label: "Status", options: ["Scheduled", "In progress", "Completed", "Overdue", "Cancelled"], required: true },
    ],
    columns: [{ key: "vehicle_name", label: "Vehicle" }, { key: "work_order_title", label: "Work order" }, { key: "service_type", label: "Service" }, { key: "due_date", label: "Due date" }, { key: "due_mileage", label: "Due mileage" }, { key: "vendor", label: "Vendor" }, { key: "cost", label: "Cost" }, { key: "inspection_result", label: "Inspection" }, { key: "status", label: "Status" }],
  },
  trips: {
    title: "Telematics trips", description: "Record device-to-vehicle assignment windows, trip times, distance, and locations. This is a manual operational record, not a live telematics connection.", singular: "trip", endpoint: "trips",
    fields: [
      REQUIRED_VEHICLE_FIELD, { key: "device_id", label: "Device ID" },
      { key: "assignment_start", label: "Device assignment from", type: "datetime-local" },
      { key: "assignment_end", label: "Device assignment through", type: "datetime-local" },
      { key: "trip_start", label: "Trip start", type: "datetime-local", required: true },
      { key: "trip_end", label: "Trip end", type: "datetime-local" },
      { key: "distance", label: "Distance", type: "number" },
      { key: "distance_unit", label: "Distance unit", options: ["km", "mi"], required: true },
      { key: "start_location", label: "Start location" }, { key: "end_location", label: "End location" },
      { key: "evidence_link", label: "Trip evidence", type: "url" },
    ],
    columns: [{ key: "vehicle_name", label: "Vehicle" }, { key: "device_id", label: "Device" }, { key: "trip_start", label: "Trip start" }, { key: "trip_end", label: "Trip end" }, { key: "distance", label: "Distance" }, { key: "distance_unit", label: "Unit" }, { key: "start_location", label: "From" }, { key: "end_location", label: "To" }],
  },
  tasks: {
    title: "Tasks & evidence requests", description: "Assign owners, next actions, deadlines, and missing-evidence requests.", singular: "task", endpoint: "tasks",
    fields: [
      VEHICLE_FIELD, { key: "violation_id", label: "Violation case", lookup: "violations" },
      { key: "case_owner", label: "Owner" }, { key: "next_action", label: "Next action", type: "textarea", required: true },
      { key: "due_at", label: "Due at", type: "datetime-local" }, { key: "evidence_request", label: "Missing evidence request", type: "textarea" },
      { key: "status", label: "Status", options: ["Open", "In progress", "Waiting for evidence", "Completed", "Cancelled"], required: true },
    ],
    columns: [{ key: "vehicle_name", label: "Vehicle" }, { key: "notice_number", label: "Violation" }, { key: "case_owner", label: "Owner" }, { key: "next_action", label: "Next action" }, { key: "due_at", label: "Due" }, { key: "evidence_request", label: "Evidence needed" }, { key: "status", label: "Status" }],
  },
  approvals: {
    title: "Approvals", description: "Record decision-maker, approval outcome, decision time, and notes for cases and tasks.", singular: "approval", endpoint: "approvals",
    fields: [
      { key: "task_id", label: "Related task", lookup: "tasks" }, { key: "violation_id", label: "Violation case", lookup: "violations" },
      { key: "approver", label: "Approver", required: true },
      { key: "decision", label: "Decision", options: ["Pending", "Approved", "Rejected", "Needs changes"], required: true },
      { key: "decided_at", label: "Decision time", type: "datetime-local" }, { key: "notes", label: "Decision notes", type: "textarea" },
    ],
    columns: [{ key: "approver", label: "Approver" }, { key: "next_action", label: "Task" }, { key: "notice_number", label: "Violation" }, { key: "decision", label: "Decision" }, { key: "decided_at", label: "Decided at" }, { key: "notes", label: "Notes" }],
  },
  activity: {
    title: "Vehicle activity log", description: "Append-only history of who added, changed, or deleted vehicle and fleet records, with the before-and-after values.", singular: "activity entry", endpoint: "activity", readOnly: true, fields: [],
    columns: [{ key: "created_at", label: "When" }, { key: "actor_name", label: "Changed by" }, { key: "actor_type", label: "Actor" }, { key: "action", label: "Action" }, { key: "entity_type", label: "Record type" }, { key: "entity_id", label: "Record ID" }, { key: "vehicle_name", label: "Vehicle" }, { key: "change_data", label: "Changes" }],
  },
};

@Component({
  selector: "fieldline-fleet-module-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div><p class="eyebrow">FLEET OPERATIONS</p><h1>{{ definition.title }}</h1><p class="lede">{{ definition.description }}</p></div>
        <span class="live-pill"><span class="status-dot"></span>{{ apiState }}</span>
      </header>
      <div class="toolbar">
        <label class="search"><span aria-hidden="true">⌕</span><input [(ngModel)]="filterText" [placeholder]="'Search ' + definition.title.toLowerCase()" [attr.aria-label]="'Search ' + definition.title"></label>
        <button *ngIf="!definition.readOnly" class="primary" type="button" (click)="openForm()">＋ Add {{ definition.singular }}</button>
      </div>
      <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
      <article class="panel table-panel">
        <table *ngIf="filteredRows.length; else emptyState">
          <thead><tr><th *ngFor="let column of definition.columns">{{ column.label }}</th><th *ngIf="!definition.readOnly" class="actions-heading">Actions</th></tr></thead>
          <tbody><tr *ngFor="let row of filteredRows">
            <td *ngFor="let column of definition.columns">{{ displayCell(row, column.key) }}</td>
            <td *ngIf="!definition.readOnly" class="actions-cell"><button class="text-button" type="button" (click)="openForm(row)">Edit</button><button class="text-button danger-text" type="button" (click)="remove(row)">Delete</button></td>
          </tr></tbody>
        </table>
        <ng-template #emptyState><div class="empty-state"><div class="empty-icon">{{ definition.readOnly ? "✓" : "＋" }}</div><h3>{{ filterText ? "No matching records" : "No " + definition.title.toLowerCase() + " yet" }}</h3><p *ngIf="!definition.readOnly">Create a record to start maintaining this part of your fleet operations.</p><p *ngIf="definition.readOnly">Changes to vehicles and fleet records will appear here with their editor and before-and-after values.</p><button *ngIf="!definition.readOnly" class="secondary" type="button" (click)="openForm()">Add {{ definition.singular }}</button></div></ng-template>
      </article>
      <div class="modal-backdrop" *ngIf="formOpen" (click)="closeForm()">
        <form class="modal fleet-modal" (ngSubmit)="save()" (click)="$event.stopPropagation()">
          <div class="modal-head"><div><p class="eyebrow">{{ editing ? "UPDATE RECORD" : "NEW RECORD" }}</p><h2>{{ editing ? "Edit " + definition.singular : "Add " + definition.singular }}</h2></div><button type="button" class="icon-button" aria-label="Close dialog" (click)="closeForm()">×</button></div>
          <div class="fleet-form-grid"><label *ngFor="let field of definition.fields">{{ field.label }}
            <select *ngIf="field.options || field.lookup; else textField" [(ngModel)]="draft[field.key]" [name]="field.key" [required]="field.required ?? false">
              <option value="">Select…</option><option *ngFor="let option of optionsFor(field)" [value]="option.id">{{ option.label }}</option>
            </select>
            <ng-template #textField><textarea *ngIf="field.type === 'textarea'; else inputField" [(ngModel)]="draft[field.key]" [name]="field.key" rows="3" [required]="field.required ?? false"></textarea>
              <ng-template #inputField><input [type]="field.type ?? 'text'" [(ngModel)]="draft[field.key]" [name]="field.key" [required]="field.required ?? false" [min]="field.type === 'number' ? 0 : null"></ng-template>
            </ng-template>
          </label></div>
          <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
          <div class="modal-actions"><button type="button" class="secondary" (click)="closeForm()">Cancel</button><button type="submit" class="primary" [disabled]="saving">{{ saving ? "Saving…" : "Save record" }}</button></div>
        </form>
      </div>
    </section>
  `,
})
export class FleetModulePageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  module!: FleetModule;
  definition!: FleetPageDefinition;
  rows: FleetRow[] = [];
  lookups: Record<string, { id: string; label: string }[]> = {};
  filterText = "";
  apiState = "Checking API";
  errorMessage = "";
  saving = false;
  formOpen = false;
  editing: FleetRow | null = null;
  draft: Record<string, string> = {};

  ngOnInit(): void {
    const module = this.route.snapshot.data["fleetModule"] as FleetModule;
    this.module = module;
    this.definition = PAGES[module];
    this.load();
    for (const resource of new Set(this.definition.fields.map((field) => field.lookup).filter((value): value is string => Boolean(value)))) {
      this.http.get<{ id: string; label: string }[]>(`/api/fleet-options/${resource}`).subscribe({
        next: (options) => { this.lookups[resource] = options; },
        error: () => { this.lookups[resource] = []; },
      });
    }
  }

  get filteredRows(): FleetRow[] {
    const filter = this.filterText.trim().toLowerCase();
    return filter ? this.rows.filter((row) => Object.values(row).some((value) => this.asText(value).toLowerCase().includes(filter))) : this.rows;
  }

  displayCell(row: FleetRow, key: string): string {
    const value = row[key];
    if (key === "change_data") return this.changeSummary(value);
    if (value == null || value === "") return "—";
    if (typeof value === "object") return this.asText(value);
    if (key.endsWith("_at") || key === "balance_as_of") return this.asText(value).replace("T", " ").slice(0, 19);
    return this.asText(value);
  }

  optionsFor(field: FleetField): { id: string; label: string }[] {
    if (field.lookup) return this.lookups[field.lookup] ?? [];
    return (field.options ?? []).map((value) => ({ id: value, label: value || "Not recorded" }));
  }

  openForm(row: FleetRow | null = null): void {
    this.editing = row;
    this.draft = {};
    for (const field of this.definition.fields) this.draft[field.key] = this.formValue(field.key, row?.[field.key]);
    if (!row) this.setDefaults();
    this.errorMessage = "";
    this.formOpen = true;
  }

  closeForm(): void { this.formOpen = false; this.errorMessage = ""; }

  save(): void {
    this.saving = true;
    this.errorMessage = "";
    const path = `/api/fleet/${this.definition.endpoint}`;
    const id = this.editing?.["id"];
    const request = id
      ? this.http.put(`${path}/${id}`, this.draft)
      : this.http.post(path, this.draft);
    request.subscribe({
      next: () => { this.saving = false; this.closeForm(); this.load(); },
      error: (error: { error?: { error?: string } }) => {
        this.saving = false;
        this.errorMessage = error.error?.error ?? `Could not save this ${this.definition.singular}.`;
      },
    });
  }

  remove(row: FleetRow): void {
    if (!window.confirm(`Delete this ${this.definition.singular}? This cannot be undone.`)) return;
    this.http.delete(`/api/fleet/${this.definition.endpoint}/${row["id"]}`).subscribe({
      next: () => this.load(),
      error: (error: { error?: { error?: string } }) => { this.errorMessage = error.error?.error ?? "Could not delete this record."; },
    });
  }

  private load(): void {
    const path = this.definition.endpoint === "activity" ? "/api/fleet/activity" : `/api/fleet/${this.definition.endpoint}`;
    this.http.get<FleetRow[]>(path).subscribe({
      next: (rows) => { this.rows = rows; this.apiState = "API connected"; },
      error: (error: { error?: { error?: string } }) => {
        this.apiState = "API offline";
        this.errorMessage = error.error?.error ?? "Could not load these fleet records.";
      },
    });
  }

  private setDefaults(): void {
    const defaults: Record<string, string> = {
      toll_payer: "Customer",
      violation_payer: "Customer",
      maintenance_payer: "Customer",
      other_charge_payer: "Customer",
      posting_status: "Posted",
      verification_status: "Pending",
      approval_status: "Pending",
      case_status: "Open",
      payment_type: "Authority payment",
      mileage_unit: "km",
      distance_unit: "km",
      inspection_result: "",
      decision: "Pending",
    };
    for (const [key, value] of Object.entries(defaults)) if (this.definition.fields.some((field) => field.key === key)) this.draft[key] = value;
    const statusDefaults: Partial<Record<FleetModule, string>> = {
      customers: "Active",
      drivers: "Active",
      "toll-accounts": "Active",
      transponders: "Active",
      "driver-assignments": "Assigned",
      contracts: "Active",
      transactions: "Posted",
      violations: "Open",
      payments: "Pending",
      maintenance: "Scheduled",
      tasks: "Open",
    };
    const status = statusDefaults[this.module];
    if (status && this.definition.fields.some((field) => field.key === "status")) this.draft["status"] = status;
  }

  private formValue(key: string, value: unknown): string {
    if (value == null) return "";
    const text = this.asText(value);
    const type = this.definition.fields.find((field) => field.key === key)?.type;
    if (type === "datetime-local" || key.endsWith("_at") || key.endsWith("_start") || key.endsWith("_end")) return text.replace(" ", "T").slice(0, 16);
    if (type === "date" || key.endsWith("_date")) return text.slice(0, 10);
    return text;
  }

  private changeSummary(value: unknown): string {
    let changes: unknown = value;
    if (typeof value === "string") {
      try { changes = JSON.parse(value); } catch { return value; }
    }
    if (!changes || typeof changes !== "object") return "—";
    const record = changes as Record<string, unknown>;
    if ("record" in record) {
      const recordChange = record["record"] as { after?: unknown } | undefined;
      const after = recordChange?.after;
      return after && typeof after === "object" ? `Added ${Object.keys(after).filter((key) => !["id", "created_at", "updated_at"].includes(key)).join(", ")}` : "Record deleted";
    }
    return Object.entries(record).map(([field, change]) => {
      const pair = change as { before?: unknown; after?: unknown };
      return `${field}: ${this.asText(pair.before ?? "—")} → ${this.asText(pair.after ?? "—")}`;
    }).join("; ") || "No field changes";
  }

  private asText(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
  }
}
