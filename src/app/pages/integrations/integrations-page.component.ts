import { Component } from "@angular/core";
import { WorkspacePagesComponent } from "../workspace/workspace-pages.component";

@Component({
  selector: "fieldline-integrations-page",
  standalone: true,
  imports: [WorkspacePagesComponent],
  template: `<fieldline-workspace-page pageId="integrations"></fieldline-workspace-page>`,
})
export class IntegrationsPageComponent {}
