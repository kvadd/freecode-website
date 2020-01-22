import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { IntroComponent } from './intro/intro.component';
import { UppdragComponent } from './uppdrag/uppdrag.component';
import { KontaktComponent } from './kontakt/kontakt.component';
import { KonsulterComponent } from './konsulter/konsulter.component';
import { FrikodareComponent } from './frikodare/frikodare.component';

const routes: Routes = [
    { path: '', component: IntroComponent, pathMatch: 'full' },
    { path: 'uppdrag', component: UppdragComponent, pathMatch: 'full' },
    { path: 'konsulter', component: KonsulterComponent, pathMatch: 'full' },
    { path: 'frikodare', component: FrikodareComponent, pathMatch: 'full' },
    { path: 'kontakt', component: KontaktComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
