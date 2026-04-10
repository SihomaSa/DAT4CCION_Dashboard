import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app.component';
import { MapaComponent } from './components/mapa/mapa.component';

@NgModule({
  declarations: [
    AppComponent,
    MapaComponent  // ← Declarar el componente del mapa
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,    // ← Para ngModel
    CommonModule    // ← Para pipes como number
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }