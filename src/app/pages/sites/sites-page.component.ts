import { Component } from "@angular/core";
import { RecordsComponent } from "../records/records.component";

@Component({
  selector: "fieldline-sites-page",
  standalone: true,
  imports: [RecordsComponent],
  template: `<fieldline-records-page entity="sites"></fieldline-records-page>`,
})
export class SitesPageComponent {}
