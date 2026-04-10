import { Component, OnInit, OnChanges, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActividadesService, Actividad } from '../../services/actividades.service';

@Component({
  selector: 'app-actividades',
  templateUrl: './actividades.component.html',
  styleUrls: ['./actividades.component.scss']
})
export class ActividadesComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() paisActual: string = 'Mexico';
  @Output() close = new EventEmitter<void>();
  
  actividades: Actividad[] = [];
  filteredActividades: Actividad[] = [];
  
  paisesDisponibles: string[] = [];
  paisSeleccionado: string = 'Mexico';
  // Actualizar categorías para incluir Voluntariado
  categoriaFiltro: string = 'todas';
  categorias: string[] = ['todas', 'Doméstico', 'Cuidado', 'Social', 'Educación', 'Voluntariado', 'Total'];
  sexoSeleccionado: 'mujeres' | 'hombres' = 'mujeres';
  topLimit: number = 15;
  
  viewMode: 'top' | 'brecha' | 'categorias' = 'top';
  
  constructor(private actividadesService: ActividadesService) {}
  
  ngOnInit() {
    this.cargarPaises();
  }
  
  ngOnChanges(changes: any) {
    if (changes.paisActual && changes.paisActual.currentValue) {
      this.paisSeleccionado = this.paisActual;
      this.cargarActividades();
    }
  }
  
  cargarPaises() {
  this.actividadesService.getPaisesDisponibles().subscribe(paises => {
    this.paisesDisponibles = paises;
    if (this.paisesDisponibles.length > 0) {
      this.paisSeleccionado = this.paisesDisponibles[0];
      this.cargarActividades();
    }
  });
}
  
  cargarActividades() {
    this.actividadesService.getActividadesPorPais(this.paisSeleccionado).subscribe(data => {
      this.actividades = data;
      this.applyFilters();
    });
  }
  
  onPaisChange() {
    this.cargarActividades();
  }
  
  applyFilters() {
    let filtered = [...this.actividades];
    
    if (this.categoriaFiltro !== 'todas') {
      filtered = filtered.filter(a => a.categoria === this.categoriaFiltro);
    }
    
    if (this.viewMode === 'top') {
      filtered = this.actividadesService.getTopActividades(filtered, this.sexoSeleccionado, this.topLimit);
    } else if (this.viewMode === 'brecha') {
      filtered = this.actividadesService.getTopBrecha(filtered, this.topLimit);
    }
    
    this.filteredActividades = filtered;
  }
  
  onViewModeChange() {
    this.applyFilters();
  }
  
  onSexoChange() {
    this.applyFilters();
  }
  
  onCategoriaChange() {
    this.applyFilters();
  }
  
  getMaxValue(): number {
    if (this.filteredActividades.length === 0) return 0;
    if (this.viewMode === 'brecha') {
      return Math.max(...this.filteredActividades.map(a => Math.abs(a.diferencia)));
    }
    return Math.max(...this.filteredActividades.map(a => 
      this.sexoSeleccionado === 'mujeres' ? a.mujeres_hrs_sem : a.hombres_hrs_sem
    ));
  }
  
  getAbsValue(valor: number): number {
    return Math.abs(valor);
  }
  
  getBarWidth(horas: number): number {
    const max = this.getMaxValue();
    if (max === 0) return 0;
    return (horas / max) * 100;
  }
  
  getBarColor(valor: number, isPositive: boolean = true): string {
    if (this.viewMode === 'brecha') {
      return valor > 0 ? '#d62728' : '#1f77b4';
    }
    return this.sexoSeleccionado === 'mujeres' ? '#d62728' : '#1f77b4';
  }
  
  getTotalHoras(): { mujeres: number; hombres: number } {
    const total = this.actividades.reduce((acc, act) => ({
      mujeres: acc.mujeres + act.mujeres_hrs_sem,
      hombres: acc.hombres + act.hombres_hrs_sem
    }), { mujeres: 0, hombres: 0 });
    return total;
  }
  
  getCategoriasData() {
    return this.actividadesService.getCategorias(this.actividades);
  }
  
  // Método para obtener el ícono según la categoría
  getCategoriaIcon(categoria: string): string {
    switch(categoria) {
      case 'Doméstico': return '🏠';
      case 'Cuidado': return '❤️';
      case 'Social': return '👥';
      case 'Educación': return '📚';
      case 'Voluntariado': return '🤝';
      case 'Total': return '📊';
      default: return '📋';
    }
  }
  
  isPositive(valor: number): boolean {
    return valor > 0;
  }
  
  closeModal() {
    this.close.emit();
  }
}