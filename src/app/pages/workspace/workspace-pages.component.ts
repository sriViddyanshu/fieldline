import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, Input, OnInit, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { SECTIONS, Section } from "../../navigation";

interface PagePanel {
  title: string;
  description: string;
  items: string[];
}

interface WorkspacePage {
  eyebrow: string;
  intro: string;
  stats: { label: string; value: string; detail: string }[];
  panels: PagePanel[];
  actionLabel: string;
  actionUrl: string;
}

const WORKSPACE_PAGES: Record<string, WorkspacePage> = {
  locations: {
    eyebrow: "PLACE DIRECTORY",
    intro: "Build a consistent location hierarchy for rooms, yards, zones, and other places within each site.",
    stats: [
      { label: "Named locations", value: "0", detail: "No locations have been added" },
      { label: "Sites to organize", value: "Sites", detail: "Use sites as the top level" },
      { label: "Hierarchy", value: "Ready", detail: "Add parent-child places as needed" },
    ],
    panels: [
      { title: "Location structure", description: "A practical starting hierarchy for Fieldline.", items: ["Site → Building → Floor → Room", "Site → Yard → Zone → Storage area", "Keep names short and recognizable to field teams"] },
      { title: "Next steps", description: "Locations become useful when linked to operational records.", items: ["Create sites in the Sites section", "Agree a location naming convention", "Link locations to assets as location workflows are added"] },
    ],
    actionLabel: "Manage sites",
    actionUrl: "/sites",
  },
  map: {
    eyebrow: "SPATIAL WORKSPACE",
    intro: "A dedicated place for asset and site geography. Connect a map provider and location coordinates to enable live mapping.",
    stats: [
      { label: "Mapped sites", value: "0", detail: "Coordinate data not configured" },
      { label: "Live asset positions", value: "0", detail: "No location feed connected" },
      { label: "Map provider", value: "Not connected", detail: "No external map service is configured" },
    ],
    panels: [
      { title: "Map canvas", description: "The workspace is ready for an approved map source.", items: ["Site markers and boundaries", "Asset positions and status overlays", "Location search and filtering"] },
      { title: "Before enabling maps", description: "Map features require configured geospatial data.", items: ["Add sites and coordinates", "Select an approved map provider", "Review provider access and usage terms"] },
    ],
    actionLabel: "Add sites",
    actionUrl: "/sites",
  },
  telemetry: {
    eyebrow: "DEVICE READINGS",
    intro: "A workspace for incoming readings, device connectivity, and asset signals. No telemetry source is connected yet.",
    stats: [
      { label: "Connected sources", value: "0", detail: "No telemetry integration configured" },
      { label: "Reporting devices", value: "0", detail: "Connect a source to see devices" },
      { label: "Latest readings", value: "—", detail: "Waiting for a data source" },
    ],
    panels: [
      { title: "Reading streams", description: "Keep incoming asset signals organized.", items: ["Temperature and environmental readings", "Usage, runtime, and meter values", "Connectivity and device health"] },
      { title: "Connection checklist", description: "Prepare a source before ingesting telemetry.", items: ["Confirm the device and payload format", "Choose an approved connector", "Define units, timestamps, and retention"] },
    ],
    actionLabel: "View integrations",
    actionUrl: "/integrations",
  },
  dashboards: {
    eyebrow: "OPERATIONAL REPORTING",
    intro: "Arrange the operational measures your team needs into focused dashboards.",
    stats: [
      { label: "Saved dashboards", value: "0", detail: "Create a view for your team" },
      { label: "Available datasets", value: "4", detail: "Assets, sites, work orders, incidents" },
      { label: "Scheduled reports", value: "0", detail: "Scheduling is not configured" },
    ],
    panels: [
      { title: "Suggested starting views", description: "Common views for an asset-operations team.", items: ["Asset register and status breakdown", "Open and overdue work orders", "Open incidents by severity"] },
      { title: "Dashboard building blocks", description: "Use focused metrics rather than crowded pages.", items: ["Summary totals for quick status checks", "Tables for actionable records", "Filters for site, status, and time period"] },
    ],
    actionLabel: "Review overview",
    actionUrl: "/overview",
  },
  field: {
    eyebrow: "TEAM DISPATCH",
    intro: "Coordinate field work by assignment, priority, and due date. Work orders are the current source for planned tasks.",
    stats: [
      { label: "Open work", value: "—", detail: "See current totals on the overview" },
      { label: "Field teams", value: "0", detail: "Team rosters are not configured" },
      { label: "Dispatch board", value: "Ready", detail: "Start with work-order assignments" },
    ],
    panels: [
      { title: "Dispatch workflow", description: "A clear handoff from planning to completion.", items: ["Create a work order for the task", "Assign an owner and due date", "Update status as the work progresses"] },
      { title: "Team coordination", description: "Team scheduling and mobile check-ins are not connected yet.", items: ["Keep assignee names consistent", "Use priority for urgent field work", "Record completion in the work order"] },
    ],
    actionLabel: "Open work orders",
    actionUrl: "/work-orders",
  },
  automations: {
    eyebrow: "WORKFLOW RULES",
    intro: "Plan repeatable rules that reduce manual follow-up. Automation execution is not connected in this release.",
    stats: [
      { label: "Active rules", value: "0", detail: "No rules are running" },
      { label: "Draft rules", value: "0", detail: "No drafts have been created" },
      { label: "Last run", value: "—", detail: "Execution service is not configured" },
    ],
    panels: [
      { title: "Ideas for later", description: "Useful rules to define before enabling automation.", items: ["Notify an owner when a work order is overdue", "Flag a high-severity incident for review", "Remind a team when an inspection is due"] },
      { title: "Safe rollout", description: "Review and test automation before using it operationally.", items: ["Document trigger and expected action", "Test with non-production sample records", "Keep an audit trail and a disable option"] },
    ],
    actionLabel: "View work orders",
    actionUrl: "/work-orders",
  },
  playbooks: {
    eyebrow: "STANDARD PROCEDURES",
    intro: "Keep repeatable response steps close to the operational work they support.",
    stats: [
      { label: "Published playbooks", value: "0", detail: "No procedures published yet" },
      { label: "Drafts", value: "0", detail: "No drafts have been created" },
      { label: "Linked incidents", value: "0", detail: "Playbook linking is not configured" },
    ],
    panels: [
      { title: "Suggested playbooks", description: "Start with procedures your team uses often.", items: ["Routine asset inspection", "Incident triage and escalation", "Planned maintenance close-out"] },
      { title: "Good playbook structure", description: "Make each procedure clear, safe, and maintainable.", items: ["State the purpose and when it applies", "List steps in the order they are performed", "Name owners, checks, and escalation points"] },
    ],
    actionLabel: "Review incidents",
    actionUrl: "/incidents",
  },
  cost: {
    eyebrow: "ASSET SPEND",
    intro: "A workspace for maintenance spend and asset costs. Financial records and cost feeds are not connected yet.",
    stats: [
      { label: "Tracked assets", value: "—", detail: "Open the asset register for the live count" },
      { label: "Recorded expenses", value: "0", detail: "No cost records exist yet" },
      { label: "Cost sources", value: "0", detail: "No accounting integration is configured" },
    ],
    panels: [
      { title: "Cost categories", description: "A starter set for organizing operating spend.", items: ["Preventive and corrective maintenance", "Parts, fuel, and consumables", "Rental, service, and inspection costs"] },
      { title: "Cost visibility", description: "Reliable cost analysis depends on consistent records.", items: ["Associate spend with an asset or site", "Use consistent categories and currencies", "Connect an approved source before importing data"] },
    ],
    actionLabel: "Browse assets",
    actionUrl: "/assets",
  },
  integrations: {
    eyebrow: "CONNECTED SYSTEMS",
    intro: "Review the external systems that can supply or receive approved Fieldline data.",
    stats: [
      { label: "Connected integrations", value: "0", detail: "No external systems connected" },
      { label: "Available categories", value: "4", detail: "Maps, telemetry, identity, reporting" },
      { label: "Recent syncs", value: "—", detail: "No sync history available" },
    ],
    panels: [
      { title: "Potential connections", description: "Connect only the services required by your workflow.", items: ["Map provider for geographic views", "Device gateway for telemetry", "Identity provider for managed sign-in"] },
      { title: "Connection safeguards", description: "Review ownership and permissions before linking services.", items: ["Use a dedicated service account", "Grant only required access", "Document sync direction and data ownership"] },
    ],
    actionLabel: "Open diagnostics",
    actionUrl: "/diagnostics",
  },
  administration: {
    eyebrow: "WORKSPACE ACCESS",
    intro: "Review workspace access and administration. The initial release supports the first administrator account only.",
    stats: [
      { label: "Signed-in account", value: "1", detail: "Current administrator" },
      { label: "Roles", value: "1", detail: "Administrator" },
      { label: "User management", value: "Not available", detail: "Additional accounts are not managed in-app yet" },
    ],
    panels: [
      { title: "Available today", description: "The initial account is created once through first-time setup.", items: ["Sign in using the configured administrator account", "Sign out from the workspace top bar", "Sessions expire after 12 hours"] },
      { title: "Recommended next step", description: "Add user management before inviting more people.", items: ["Define roles and permissions", "Provide a secure account recovery workflow", "Enable HTTPS and secure cookies before remote access"] },
    ],
    actionLabel: "Open settings",
    actionUrl: "/settings",
  },
  diagnostics: {
    eyebrow: "SERVICE HEALTH",
    intro: "Review the current availability of Fieldline services and data connections.",
    stats: [
      { label: "Web application", value: "Available", detail: "This page is loaded" },
      { label: "API service", value: "Checking…", detail: "Checking the health endpoint" },
      { label: "Database", value: "—", detail: "API reports database connectivity" },
    ],
    panels: [
      { title: "Health check", description: "Live status from the API health endpoint.", items: ["API: {{apiState}}", "Database: {{databaseState}}", "Endpoint: /api/health"] },
      { title: "Troubleshooting", description: "If Fieldline is unavailable, check these items.", items: ["Confirm the Node API is running on port 3001", "Verify the restricted database account settings", "Check the API terminal for connection errors"] },
    ],
    actionLabel: "Retry health check",
    actionUrl: "",
  },
  "getting-started": {
    eyebrow: "SETUP CHECKLIST",
    intro: "A practical sequence for bringing a new Fieldline workspace into use.",
    stats: [
      { label: "Core records", value: "0 / 4", detail: "Create sites, assets, work, and incidents" },
      { label: "Database", value: "Connected", detail: "Fieldline is using its own schema" },
      { label: "Appearance", value: "Ready", detail: "Choose light or dark in Settings" },
    ],
    panels: [
      { title: "Set up your data", description: "Start with records that your team recognizes.", items: ["Add the sites your team operates", "Register a few representative assets", "Create a work order and test its lifecycle"] },
      { title: "Prepare your workspace", description: "Review access and operational readiness.", items: ["Choose the preferred theme in Settings", "Review the sign-in and administrator setup", "Keep the app local until HTTPS and access controls are reviewed"] },
    ],
    actionLabel: "Add your first site",
    actionUrl: "/sites",
  },
};

@Component({
  selector: "fieldline-workspace-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head"><div><p class="eyebrow">{{ page.eyebrow }}</p><h1>{{ section.label }}</h1><p class="lede">{{ page.intro }}</p></div><span class="live-pill"><span class="status-dot"></span>{{ statusLabel }}</span></header>
      <div class="stat-grid" [class.compact]="page.stats.length === 3">
        <article class="stat-card" *ngFor="let stat of page.stats"><span>{{ stat.label }}</span><strong>{{ stat.value }}</strong><small>{{ stat.detail }}</small></article>
      </div>
      <div class="workspace-panels">
        <article class="panel workspace-panel" *ngFor="let panel of page.panels">
          <div class="panel-head"><div><h2>{{ panel.title }}</h2><p>{{ panel.description }}</p></div></div>
          <ul class="workspace-list"><li *ngFor="let item of panel.items">{{ interpolate(item) }}</li></ul>
        </article>
      </div>
      <div class="workspace-actions"><a *ngIf="page.actionUrl" class="primary action-link" [routerLink]="page.actionUrl">{{ page.actionLabel }} <span aria-hidden="true">→</span></a><button *ngIf="section.id === 'diagnostics'" class="primary" type="button" (click)="checkHealth()">Retry health check</button><span class="workspace-note">This section has its own page and is ready to grow into a connected workflow.</span></div>
    </section>
  `,
})
export class WorkspacePagesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  @Input({ required: true }) pageId!: string;
  section: Section = SECTIONS[0];
  page = WORKSPACE_PAGES["locations"];
  apiState = "Checking API";
  databaseState = "Checking";

  ngOnInit(): void {
    const id = this.pageId;
    this.section = SECTIONS.find((section) => section.id === id) ?? SECTIONS[0];
    this.page = WORKSPACE_PAGES[id] ?? WORKSPACE_PAGES["locations"];
    if (id === "diagnostics") this.checkHealth();
  }

  get statusLabel(): string {
    return this.section.id === "diagnostics" ? this.apiState : "Workspace";
  }

  interpolate(value: string): string {
    return value.replace("{{apiState}}", this.apiState).replace("{{databaseState}}", this.databaseState);
  }

  checkHealth(): void {
    this.apiState = "Checking…";
    this.databaseState = "Checking…";
    this.http.get<{ status: string; database: string }>("/api/health").subscribe({
      next: (result) => {
        this.apiState = result.status === "ok" ? "Available" : "Unavailable";
        this.databaseState = result.database === "connected" ? "Connected" : "Unavailable";
      },
      error: () => {
        this.apiState = "Unavailable";
        this.databaseState = "Unavailable";
      },
    });
  }
}
