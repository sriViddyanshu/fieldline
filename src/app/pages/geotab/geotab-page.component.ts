import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from "@angular/core";
import * as L from "leaflet";

interface GeotabDevice {
  deviceId: string;
  deviceName: string;
  serialNumber: string;
  vin: string;
  vehicleType: string;
  lastSeenAt: string | null;
  assetId: string | null;
  assetName: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  isDriving: boolean | null;
  locationAt: string | null;
  odometer: number | null;
  odometerAt: string | null;
  capturedAt: string | null;
}

interface GeotabSyncRun {
  id: string;
  triggeredBy: string;
  status: string;
  devicesSeen: number;
  vehiclesCreated: number;
  telemetrySaved: number;
  errorMessage: string;
  startedAt: string;
  completedAt: string | null;
}

interface GeotabOverview {
  devices: GeotabDevice[];
  runs: GeotabSyncRun[];
}

@Component({
  selector: "fieldline-geotab-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div><p class="eyebrow">CONNECTIONS</p><h1>Geotab</h1><p class="lede">Import Geotab devices and review the latest synchronized fleet telemetry.</p></div>
        <span class="live-pill"><span class="status-dot"></span>{{ loading ? "Loading" : "15-minute sync" }}</span>
      </header>

      <article class="panel geotab-panel">
        <div class="geotab-head">
          <div><h2>Geotab ingestion</h2><p class="lede">Device and telemetry data are stored separately from your vehicle records. Matching uses VIN first and the saved Geotab device ID on later syncs. Unmatched devices create Fieldline vehicles; existing vehicle details are not overwritten.</p></div>
          <button class="primary" type="button" [disabled]="syncing" (click)="syncNow()">{{ syncing ? "Syncing…" : "Sync now" }}</button>
        </div>
        <p *ngIf="errorMessage" class="notice error" role="alert">{{ errorMessage }}</p>
        <p *ngIf="successMessage" class="notice success" role="status">{{ successMessage }}</p>
        <p class="geotab-updated">Automatic sync runs every 15 minutes while the API is running. {{ latestRun ? "Last attempt: " + formatDate(latestRun.startedAt) + " · " + latestRun.status : "No sync has completed yet." }}</p>
      </article>

      <article class="panel geotab-map-panel">
        <div class="geotab-list-head"><div><h2>Live fleet map</h2><p>{{ dataLoaded ? locatedDevices.length : "—" }} device{{ locatedDevices.length === 1 ? "" : "s" }} with a valid location in the latest sync</p></div></div>
        <div #geotabMap class="geotab-map" role="application" aria-label="Map of latest Geotab vehicle locations"></div>
        <p *ngIf="dataLoaded && devices.length && !locatedDevices.length" class="geotab-map-note">Imported devices do not have valid location coordinates yet.</p>
        <p *ngIf="dataLoaded && !devices.length" class="geotab-map-note">No devices are stored yet. Run a sync after the ingestion migration and Geotab API connection are ready.</p>
        <p *ngIf="!dataLoaded && !loading" class="geotab-map-note">Device locations are unavailable until the Geotab data tables can be loaded.</p>
      </article>

      <article class="panel table-panel">
        <div class="geotab-list-head"><div><h2>Imported Geotab devices</h2><p>{{ dataLoaded ? devices.length : "—" }} device{{ devices.length === 1 ? "" : "s" }} · latest telemetry per device</p></div><button class="secondary" type="button" (click)="loadOverview()" [disabled]="loading">Refresh list</button></div>
        <div class="geotab-table-wrap">
          <table class="geotab-table" *ngIf="devices.length; else emptyDevices">
            <thead><tr><th>Device</th><th>VIN</th><th>Fieldline vehicle</th><th>Type</th><th>Location</th><th>Speed</th><th>State</th><th>Location time</th><th>Odometer</th><th>Odometer time</th></tr></thead>
            <tbody><tr *ngFor="let device of devices">
              <td><strong>{{ display(device.deviceName) }}</strong><small class="cell-subtitle">{{ display(device.serialNumber) }} · {{ device.deviceId }}</small></td>
              <td>{{ display(device.vin) }}</td><td>{{ device.assetName ?? "—" }}</td><td>{{ display(device.vehicleType) }}</td>
              <td>{{ coordinates(device) }}</td><td>{{ number(device.speed) }}</td>
              <td>{{ device.isDriving === null ? "—" : device.isDriving ? "Driving" : "Stopped" }}</td>
              <td>{{ formatDate(device.locationAt) }}</td><td>{{ number(device.odometer) }}</td><td>{{ formatDate(device.odometerAt) }}</td>
            </tr></tbody>
          </table>
          <ng-template #emptyDevices><div class="empty-state compact-empty"><h3>{{ dataLoaded ? "No imported Geotab devices" : "Device data unavailable" }}</h3><p>{{ dataLoaded ? "Run a sync to connect and import devices. The latest sync result appears below." : "Resolve the error above, then refresh this list." }}</p></div></ng-template>
        </div>
      </article>

      <article class="panel table-panel geotab-runs">
        <div class="geotab-list-head"><div><h2>Sync history</h2><p>Recent manual and scheduled ingestion attempts.</p></div></div>
        <div class="geotab-table-wrap">
          <table class="geotab-table" *ngIf="runs.length; else emptyRuns">
            <thead><tr><th>Started</th><th>Source</th><th>Result</th><th>Devices</th><th>Vehicles created</th><th>Telemetry rows</th><th>Details</th></tr></thead>
            <tbody><tr *ngFor="let run of runs">
              <td>{{ formatDate(run.startedAt) }}</td><td>{{ run.triggeredBy }}</td><td>{{ run.status }}</td>
              <td>{{ run.devicesSeen }}</td><td>{{ run.vehiclesCreated }}</td><td>{{ run.telemetrySaved }}</td><td>{{ run.errorMessage || "—" }}</td>
            </tr></tbody>
          </table>
          <ng-template #emptyRuns><div class="empty-state compact-empty"><h3>No sync attempts yet</h3></div></ng-template>
        </div>
      </article>
    </section>
  `,
})
export class GeotabPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  @ViewChild("geotabMap") private mapElement?: ElementRef<HTMLDivElement>;
  private map: L.Map | null = null;
  private readonly markers = L.layerGroup();
  private mapResizeObserver: ResizeObserver | null = null;
  devices: GeotabDevice[] = [];
  runs: GeotabSyncRun[] = [];
  loading = false;
  syncing = false;
  errorMessage = "";
  successMessage = "";
  dataLoaded = false;

  ngOnInit(): void {
    this.loadOverview();
  }

  ngAfterViewInit(): void {
    if (!this.mapElement) return;
    this.map = L.map(this.mapElement.nativeElement, { scrollWheelZoom: false }).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.markers.addTo(this.map);
    this.renderMarkers();
    this.mapResizeObserver = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
    this.mapResizeObserver.observe(this.mapElement.nativeElement);
    requestAnimationFrame(() => this.map?.invalidateSize({ pan: false }));
  }

  ngOnDestroy(): void {
    this.mapResizeObserver?.disconnect();
    this.mapResizeObserver = null;
    this.map?.remove();
    this.map = null;
  }

  get locatedDevices(): (GeotabDevice & { latitude: number; longitude: number })[] {
    return this.devices.filter((device): device is GeotabDevice & { latitude: number; longitude: number } =>
      device.latitude !== null && device.longitude !== null
      && Number.isFinite(device.latitude) && Number.isFinite(device.longitude),
    );
  }

  get latestRun(): GeotabSyncRun | null {
    return this.runs[0] ?? null;
  }

  display(value: string | null | undefined): string {
    return value || "—";
  }

  number(value: number | null): string {
    return value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  coordinates(device: GeotabDevice): string {
    return device.latitude === null || device.longitude === null
      ? "—"
      : `${device.latitude.toFixed(5)}, ${device.longitude.toFixed(5)}`;
  }

  formatDate(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  }

  loadOverview(): void {
    this.loading = true;
    this.http.get<GeotabOverview>("/api/geotab").subscribe({
      next: (overview) => {
        this.devices = overview.devices;
        this.runs = overview.runs;
        if (overview.runs[0]?.status === "Succeeded") this.errorMessage = "";
        this.loading = false;
        this.dataLoaded = true;
        this.renderMarkers();
      },
      error: (error: { error?: { error?: string } }) => {
        this.errorMessage = error.error?.error ?? "Could not load Geotab ingestion data.";
        this.loading = false;
        this.dataLoaded = false;
      },
    });
  }

  syncNow(): void {
    if (this.syncing) return;
    this.syncing = true;
    this.errorMessage = "";
    this.successMessage = "";
    this.http.post<GeotabSyncRun>("/api/geotab/sync", {}).subscribe({
      next: (run) => {
        this.successMessage = `Sync complete: ${run.devicesSeen} devices processed, ${run.vehiclesCreated} new vehicles created.`;
        this.syncing = false;
        this.loadOverview();
      },
      error: (error: { error?: { error?: string } }) => {
        this.errorMessage = error.error?.error ?? "Geotab sync failed.";
        this.syncing = false;
        this.loadOverview();
      },
    });
  }

  private renderMarkers(): void {
    if (!this.map) return;
    this.markers.clearLayers();
    this.map.invalidateSize({ pan: false });
    const points: L.LatLng[] = [];

    for (const device of this.locatedDevices) {
      const location = L.latLng(device.latitude, device.longitude);
      points.push(location);
      const marker = L.circleMarker(location, {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: "#ed6b24",
        fillOpacity: 0.95,
      });

      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = device.deviceName || device.deviceId;
      popup.append(title);
      const details = document.createElement("div");
      details.textContent = [
        device.assetName,
        device.vin ? `VIN ${device.vin}` : "",
        device.isDriving === null ? "" : device.isDriving ? "Driving" : "Stopped",
        device.speed === null ? "" : `Speed ${this.number(device.speed)}`,
        this.formatDate(device.locationAt),
      ].filter(Boolean).join(" · ");
      popup.append(details);
      marker.bindPopup(popup).addTo(this.markers);
    }

    if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 14 });
    } else if (points.length === 1) {
      this.map.setView(points[0], 13);
    }
  }
}
