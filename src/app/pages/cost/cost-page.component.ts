import { Component } from "@angular/core";
import { WorkspacePagesComponent } from "../workspace/workspace-pages.component";

@Component({
  selector: "fieldline-cost-page",
  standalone: true,
  imports: [WorkspacePagesComponent],
  template: `<fieldline-workspace-page pageId="cost"></fieldline-workspace-page>`,
})
export class CostPageComponent {}
