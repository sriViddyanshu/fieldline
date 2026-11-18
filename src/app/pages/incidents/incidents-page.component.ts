import { Component } from "@angular/core";
import { RecordsComponent } from "../records/records.component";

@Component({
  selector: "fieldline-incidents-page",
  standalone: true,
  imports: [RecordsComponent],
  template: `<fieldline-records-page entity="incidents"></fieldline-records-page>`,
})
export class IncidentsPageComponent {}
