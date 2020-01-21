import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { IntroComponent } from './intro/intro.component';
import { UppdragComponent } from './uppdrag/uppdrag.component';

const routes: Routes = [
    { path: '', component: IntroComponent, pathMatch: 'full' },
    { path: 'uppdrag', component: UppdragComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
