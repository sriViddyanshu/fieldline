import { Component } from "@angular/core";
import { RecordsComponent } from "../records/records.component";

@Component({
  selector: "fieldline-work-orders-page",
  standalone: true,
  imports: [RecordsComponent],
  template: `<fieldline-records-page entity="work-orders"></fieldline-records-page>`,
})
export class WorkOrdersPageComponent {}
