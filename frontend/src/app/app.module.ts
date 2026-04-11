import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app.component';
import { MapaComponent } from './components/mapa/mapa.component';
import { ActividadesComponent } from './components/actividades/actividades.component';
import { EconomiaComponent } from './components/economia/economia.component';


@NgModule({
  declarations: [
    AppComponent,
    MapaComponent,
    ActividadesComponent, 
    EconomiaComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    CommonModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }