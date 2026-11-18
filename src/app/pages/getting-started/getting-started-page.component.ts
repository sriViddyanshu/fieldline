import { Component } from "@angular/core";
import { WorkspacePagesComponent } from "../workspace/workspace-pages.component";

@Component({
  selector: "fieldline-getting-started-page",
  standalone: true,
  imports: [WorkspacePagesComponent],
  template: `<fieldline-workspace-page pageId="getting-started"></fieldline-workspace-page>`,
})
export class GettingStartedPageComponent {}
