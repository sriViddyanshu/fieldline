import { Component } from "@angular/core";
import { VehiclesPageComponent } from "../vehicles/vehicles-page.component";

@Component({
  selector: "fieldline-assets-page",
  standalone: true,
  imports: [VehiclesPageComponent],
  template: `<fieldline-vehicles-page></fieldline-vehicles-page>`,
})
export class AssetsPageComponent {}
