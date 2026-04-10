import { Component, OnInit } from '@angular/core';
import { DataService, UnidadTerritorial } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  paises: string[] = [];
  paisSeleccionado = 'Latam';
  sexoSeleccionado: 'mujeres' | 'hombres' = 'mujeres';
  datosUnidades: UnidadTerritorial[] = [];
  cargando = true;
  actividadesModalVisible = false;
  
  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.cargarPaises();
    this.escucharCambioPais();
  }

  escucharCambioPais() {
    window.addEventListener('cambiarPais', ((event: CustomEvent) => {
      this.paisSeleccionado = event.detail;
      this.cargarDatos();
    }) as EventListener);
  }

  cargarPaises() {
    this.dataService.getPaises().subscribe({
      next: (paises) => {
        // Filtrar para que Latam no aparezca en la lista de países normales
        this.paises = paises.filter(p => p !== 'Latam');
        this.cargarDatos();
      },
      error: (error) => {
        console.error('Error cargando países:', error);
        this.cargando = false;
      }
    });
  }

  cargarDatos() {
    this.cargando = true;
    this.dataService.getDataByPais(this.paisSeleccionado, this.sexoSeleccionado).subscribe({
      next: (datos) => {
        this.datosUnidades = datos;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando datos:', error);
        this.cargando = false;
      }
    });
  }

  onPaisChange(pais: string) {
    this.paisSeleccionado = pais;
    this.cargarDatos();
  }

  onSexoChange(sexo: 'mujeres' | 'hombres') {
    this.sexoSeleccionado = sexo;
    this.cargarDatos();
  }

  calcularPromedio(): number {
    const horas = this.datosUnidades
      .map(u => this.sexoSeleccionado === 'mujeres' ? u.horas_mujeres : u.horas_hombres)
      .filter(h => h > 0);
    if (horas.length === 0) return 0;
    return horas.reduce((a, b) => a + b, 0) / horas.length;
  }
  abrirAnalisisActividades() {
    this.actividadesModalVisible = true;
  }

  cerrarAnalisisActividades() {
    this.actividadesModalVisible = false;
  }
}