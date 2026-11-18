import { Component } from "@angular/core";
import { WorkspacePagesComponent } from "../workspace/workspace-pages.component";

@Component({
  selector: "fieldline-locations-page",
  standalone: true,
  imports: [WorkspacePagesComponent],
  template: `<fieldline-workspace-page pageId="locations"></fieldline-workspace-page>`,
})
export class LocationsPageComponent {}
