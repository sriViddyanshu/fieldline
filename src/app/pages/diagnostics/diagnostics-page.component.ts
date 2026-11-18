import { Component } from "@angular/core";
import { WorkspacePagesComponent } from "../workspace/workspace-pages.component";

@Component({
  selector: "fieldline-diagnostics-page",
  standalone: true,
  imports: [WorkspacePagesComponent],
  template: `<fieldline-workspace-page pageId="diagnostics"></fieldline-workspace-page>`,
})
export class DiagnosticsPageComponent {}
