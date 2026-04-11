import { Component, OnInit } from '@angular/core';
import { DataService, UnidadTerritorial } from './services/data.service';
import { ActividadesService, Actividad } from './services/actividades.service';

const CATEGORIAS_COMUNES = ['Doméstico', 'Cuidado'] as const;
type CategoriaComun = typeof CATEGORIAS_COMUNES[number];

interface CategoriaData {
  categoria: CategoriaComun;
  icon: string;
  mujeres: number;
  hombres: number;
  brecha: number;
  pctMujeres: number;
}

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
  modoEco = false;
  cargando = true;
  actividadesModalVisible = false;
 

  // ── Categorías inline ──────────────────────────────────────────────────
  categoriasData:       CategoriaData[]     = [];
  categoriaActiva:      CategoriaComun | null = 'Doméstico'; // ← tipo correcto + default
  actividadesCategoria: Actividad[]          = [];
  readonly CATEGORIAS = CATEGORIAS_COMUNES;

  readonly CAT_ICONS: Record<string, string> = {
    'Doméstico': '🏠', 'Cuidado': '❤️',
  };

  private readonly PAISES_ACTIVIDADES = ['Peru', 'Mexico', 'Colombia', 'Uruguay', 'Chile'];

  constructor(
    private dataService: DataService,
    private actividadesService: ActividadesService,
  ) {}

  ngOnInit() {
    this.cargarPaises();
    this.escucharCambioPais();
  }

  escucharCambioPais() {
    window.addEventListener('cambiarPais', ((e: CustomEvent) => {
      this.paisSeleccionado = e.detail;
      this.cargarDatos();
    }) as EventListener);
  }

  cargarPaises() {
    this.dataService.getPaises().subscribe({
      next: (p) => { this.paises = p.filter(x => x !== 'Latam'); this.cargarDatos(); },
      error: () => { this.cargando = false; }
    });
  }

  cargarDatos() {
    this.cargando = true;
    this.categoriaActiva = 'Doméstico'; // ← siempre arranca en Doméstico
    this.actividadesCategoria = [];
    this.dataService.getDataByPais(this.paisSeleccionado, this.sexoSeleccionado).subscribe({
      next: (d) => {
        this.datosUnidades = d;
        this.cargando = false;
        this.calcularCategoriasPanel();
      },
      error: () => { this.cargando = false; }
    });
  }

  onPaisChange(pais: string)  { this.paisSeleccionado = pais; this.cargarDatos(); }
  onSexoChange(sexo: 'mujeres' | 'hombres') { this.sexoSeleccionado = sexo; this.cargarDatos(); }

  calcularPromedio(): number {
    const h = this.datosUnidades
      .map(u => this.sexoSeleccionado === 'mujeres' ? u.horas_mujeres : u.horas_hombres)
      .filter(x => x > 0);
    return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0;
  }

  // ─── CATEGORÍAS ──────────────────────────────────────────────────────────

  calcularCategoriasPanel() {
    this.categoriaActiva = 'Doméstico';
    this.actividadesCategoria = [];
    this.paisSeleccionado === 'Latam'
      ? this.calcularCategoriasLatam()
      : this.calcularCategoriasUnPais(this.paisSeleccionado);
  }

  private toData(cat: CategoriaComun, m: number, h: number): CategoriaData {
    const tot = m + h;
    return {
      categoria: cat,
      icon: this.CAT_ICONS[cat] ?? '📋',
      mujeres: +m.toFixed(2),
      hombres: +h.toFixed(2),
      brecha: +(m - h).toFixed(2),
      pctMujeres: tot > 0 ? Math.round((m / tot) * 100) : 0,
    };
  }

  private calcularCategoriasLatam() {
    const acum: Record<string, { m: number; h: number; n: number }> = {};
    CATEGORIAS_COMUNES.forEach(c => { acum[c] = { m: 0, h: 0, n: 0 }; });
    let done = 0;

    this.PAISES_ACTIVIDADES.forEach(pais => {
      this.actividadesService.getActividadesPorPais(pais).subscribe(acts => {
        CATEGORIAS_COMUNES.forEach(cat => {
          const sub = acts.filter(a => a.categoria === cat);
          if (sub.length) {
            acum[cat].m += sub.reduce((s, a) => s + a.mujeres_hrs_sem, 0);
            acum[cat].h += sub.reduce((s, a) => s + a.hombres_hrs_sem, 0);
            acum[cat].n++;
          }
        });
        done++;
        if (done === this.PAISES_ACTIVIDADES.length) {
          this.categoriasData = CATEGORIAS_COMUNES.map(cat => {
            const d = acum[cat];
            return this.toData(cat, d.n ? d.m / d.n : 0, d.n ? d.h / d.n : 0);
          });
          // ← auto-carga detalle de Doméstico al terminar
          this.cargarDetalleUnPais('Doméstico', 'Latam');
        }
      });
    });
  }

  private calcularCategoriasUnPais(pais: string) {
    if (!this.PAISES_ACTIVIDADES.includes(pais)) { this.categoriasData = []; return; }
    this.actividadesService.getActividadesPorPais(pais).subscribe(acts => {
      this.categoriasData = CATEGORIAS_COMUNES.map(cat => {
        const sub = acts.filter(a => a.categoria === cat);
        return this.toData(
          cat,
          sub.reduce((s, a) => s + a.mujeres_hrs_sem, 0),
          sub.reduce((s, a) => s + a.hombres_hrs_sem, 0),
        );
      });
      // ← auto-carga detalle de Doméstico al terminar
      this.cargarDetalleUnPais('Doméstico', pais);
    });
  }
  toggleModoEco() {
    this.modoEco = !this.modoEco;
  }
  toggleCategoria(cat: CategoriaComun) {
    // Si presionas el mismo botón activo, no hace nada (siempre hay una activa)
    if (this.categoriaActiva === cat) return;

    this.categoriaActiva = cat;
    this.actividadesCategoria = [];

    this.paisSeleccionado === 'Latam'
      ? this.promediarActividadesLatam(cat)
      : this.cargarDetalleUnPais(cat, this.paisSeleccionado);
  }

  private cargarDetalleUnPais(cat: CategoriaComun, pais: string) {
    if (pais === 'Latam') {
      this.promediarActividadesLatam(cat);
      return;
    }
    if (!this.PAISES_ACTIVIDADES.includes(pais)) { this.actividadesCategoria = []; return; }
    this.actividadesService.getActividadesPorPais(pais).subscribe(acts => {
      this.actividadesCategoria = acts
        .filter(a => a.categoria === cat)
        .sort((a, b) => b.mujeres_hrs_sem - a.mujeres_hrs_sem)
        .slice(0, 8);
    });
  }

  private promediarActividadesLatam(cat: CategoriaComun) {
    const mapa: Record<string, { m: number; h: number; n: number }> = {};
    let done = 0;

    this.PAISES_ACTIVIDADES.forEach(pais => {
      this.actividadesService.getActividadesPorPais(pais).subscribe(acts => {
        acts.filter(a => a.categoria === cat).forEach(a => {
          if (!mapa[a.actividad]) mapa[a.actividad] = { m: 0, h: 0, n: 0 };
          mapa[a.actividad].m += a.mujeres_hrs_sem;
          mapa[a.actividad].h += a.hombres_hrs_sem;
          mapa[a.actividad].n++;
        });
        done++;
        if (done === this.PAISES_ACTIVIDADES.length) {
          this.actividadesCategoria = Object.entries(mapa)
            .map(([actividad, d]) => ({
              actividad,
              mujeres_hrs_sem: +(d.m / d.n).toFixed(2),
              hombres_hrs_sem: +(d.h / d.n).toFixed(2),
              diferencia:      +((d.m - d.h) / d.n).toFixed(2),
              categoria: cat,
              codigo: '',
            } as Actividad))
            .sort((a, b) => b.mujeres_hrs_sem - a.mujeres_hrs_sem)
            .slice(0, 8);
        }
      });
    });
  }

  get maxHorasDetalle(): number {
    if (!this.actividadesCategoria.length) return 1;
    return Math.max(...this.actividadesCategoria.map(a =>
      Math.max(a.mujeres_hrs_sem, a.hombres_hrs_sem)));
  }

  barPct(val: number): string {
    return Math.min(100, (val / this.maxHorasDetalle) * 100).toFixed(1) + '%';
  }

  abrirAnalisisActividades()  { this.actividadesModalVisible = true;  }
  cerrarAnalisisActividades() { this.actividadesModalVisible = false; }
 
}