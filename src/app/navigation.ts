export interface Section {
  id: string;
  label: string;
  group: string;
  description: string;
}

export const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", group: "Workspace", description: "A live snapshot of your vehicle fleet and field activity." },
  { id: "vehicles", label: "Vehicles", group: "Workspace", description: "Manage vehicle master data, ownership, plates, assignments, events, mileage, and documents." },
  { id: "customers", label: "Customers", group: "Fleet setup", description: "Maintain fleet customer accounts, operating locations, and contacts." },
  { id: "contracts", label: "Contracts", group: "Fleet setup", description: "Track contract periods, covered units, and responsibility for fleet charges." },
  { id: "drivers", label: "Drivers", group: "Fleet setup", description: "Manage driver IDs, customer or employer links, contacts, and active status." },
  { id: "driver-assignments", label: "Driver assignments", group: "Fleet setup", description: "Maintain effective-dated driver-to-vehicle assignments and handover notes." },
  { id: "sites", label: "Sites", group: "Workspace", description: "Manage the facilities and operating areas your teams work from." },
  { id: "toll-accounts", label: "Toll accounts", group: "Toll operations", description: "Manage toll providers, authorities, and account references." },
  { id: "transponders", label: "Transponders", group: "Toll operations", description: "Track transponder assignments to vehicles and plates over time." },
  { id: "transactions", label: "Toll transactions", group: "Toll operations", description: "Record toll events, locations, charges, and posting status." },
  { id: "violations", label: "Violations & disputes", group: "Toll operations", description: "Verify toll notices, manage evidence and decisions, and track authority outcomes." },
  { id: "payments", label: "Payments & chargebacks", group: "Toll operations", description: "Reconcile authority payments separately from customer chargebacks." },
  { id: "work-orders", label: "Work orders", group: "Operations", description: "Plan, assign, and track maintenance tasks." },
  { id: "maintenance", label: "Maintenance & inspections", group: "Operations", description: "Schedule service by date or mileage and record repairs, costs, downtime, and inspections." },
  { id: "trips", label: "Telematics trips", group: "Operations", description: "Record vehicle trips and device assignment periods for operational evidence." },
  { id: "tasks", label: "Tasks & evidence", group: "Operations", description: "Assign case owners, next actions, deadlines, and evidence requests." },
  { id: "approvals", label: "Approvals", group: "Operations", description: "Record approvers, decisions, timestamps, and notes." },
  { id: "incidents", label: "Incidents", group: "Operations", description: "Record operational issues and track them through resolution." },
  { id: "activity", label: "Activity log", group: "Operations", description: "Review append-only before-and-after history of vehicle and fleet record changes." },
  { id: "settings", label: "Settings", group: "Connections", description: "Adjust workspace preferences." },
];
