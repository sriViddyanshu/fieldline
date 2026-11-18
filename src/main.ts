import { HttpClient, provideHttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { CanActivateFn, provideRouter, Router, Routes } from "@angular/router";
import { catchError, firstValueFrom, of } from "rxjs";
import { AuthComponent } from "./app/auth.component";
import { AppComponent } from "./app/app.component";
import { AssetsPageComponent } from "./app/pages/assets/assets-page.component";
import { FleetModulePageComponent } from "./app/pages/fleet/fleet-module-page.component";
import { IncidentsPageComponent } from "./app/pages/incidents/incidents-page.component";
import { OverviewComponent } from "./app/pages/overview/overview.component";
import { SettingsComponent } from "./app/pages/settings/settings.component";
import { SitesPageComponent } from "./app/pages/sites/sites-page.component";
import { WorkOrdersPageComponent } from "./app/pages/work-orders/work-orders-page.component";

const authGuard: CanActivateFn = async () => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const session = await firstValueFrom(http.get("/api/auth/me").pipe(catchError(() => of(null))));
  if (session) return true;
  const status = await firstValueFrom(http.get<{ setupRequired: boolean }>("/api/auth/status").pipe(catchError(() => of(null))));
  return router.parseUrl(status?.setupRequired ? "/setup" : "/login");
};

const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "overview" },
  { path: "login", component: AuthComponent, data: { mode: "login" } },
  { path: "setup", component: AuthComponent, data: { mode: "setup" } },
  { path: "overview", component: OverviewComponent, canActivate: [authGuard] },
  { path: "assets", pathMatch: "full", redirectTo: "vehicles" },
  { path: "vehicles", component: AssetsPageComponent, canActivate: [authGuard] },
  { path: "customers", component: FleetModulePageComponent, data: { fleetModule: "customers" }, canActivate: [authGuard] },
  { path: "contracts", component: FleetModulePageComponent, data: { fleetModule: "contracts" }, canActivate: [authGuard] },
  { path: "drivers", component: FleetModulePageComponent, data: { fleetModule: "drivers" }, canActivate: [authGuard] },
  { path: "driver-assignments", component: FleetModulePageComponent, data: { fleetModule: "driver-assignments" }, canActivate: [authGuard] },
  { path: "toll-accounts", component: FleetModulePageComponent, data: { fleetModule: "toll-accounts" }, canActivate: [authGuard] },
  { path: "transponders", component: FleetModulePageComponent, data: { fleetModule: "transponders" }, canActivate: [authGuard] },
  { path: "transactions", component: FleetModulePageComponent, data: { fleetModule: "transactions" }, canActivate: [authGuard] },
  { path: "violations", component: FleetModulePageComponent, data: { fleetModule: "violations" }, canActivate: [authGuard] },
  { path: "payments", component: FleetModulePageComponent, data: { fleetModule: "payments" }, canActivate: [authGuard] },
  { path: "sites", component: SitesPageComponent, canActivate: [authGuard] },
  { path: "work-orders", component: WorkOrdersPageComponent, canActivate: [authGuard] },
  { path: "maintenance", component: FleetModulePageComponent, data: { fleetModule: "maintenance" }, canActivate: [authGuard] },
  { path: "trips", component: FleetModulePageComponent, data: { fleetModule: "trips" }, canActivate: [authGuard] },
  { path: "tasks", component: FleetModulePageComponent, data: { fleetModule: "tasks" }, canActivate: [authGuard] },
  { path: "approvals", component: FleetModulePageComponent, data: { fleetModule: "approvals" }, canActivate: [authGuard] },
  { path: "incidents", component: IncidentsPageComponent, canActivate: [authGuard] },
  { path: "activity", component: FleetModulePageComponent, data: { fleetModule: "activity" }, canActivate: [authGuard] },
  { path: "settings", component: SettingsComponent, canActivate: [authGuard] },
  { path: "**", redirectTo: "overview" },
];

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(), provideRouter(routes)],
}).catch((error: unknown) => {
  console.error("Could not start Fieldline.", error);
});
