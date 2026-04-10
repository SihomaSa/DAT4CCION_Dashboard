import {
  Component, OnInit, AfterViewInit,
  ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

Chart.register(...registerables);

// ─── INTERFACES ──────────────────────────────────────────────────────────────

export interface DatoNacional {
  nombre: string; iso: string; anio_enut: number; fuente: string;
  mujeres_total: number; hombres_total: number; brecha: number;
  mujeres_domestico: number; hombres_domestico: number;
  mujeres_cuidado: number; hombres_cuidado: number;
  ratio: number; poblacion_analizada: string;
}
export interface DatoTerritorial {
  nombre: string; mujeres: number; hombres: number;
  brecha: number; pct_mujeres: number;
}
export interface ValorEconomico {
  pais: string; salario_hora_usd: number;
  valor_anual_mujeres_usd: number; valor_anual_hombres_usd: number;
  pct_pbi: number; nota: string;
}
export interface TipoCuidado {
  actividad: string; mujeres: number; hombres: number;
  codigo: string; tipo: string;
}
export interface PaisComparativo {
  nombre: string; iso: string; mujeres: number; hombres: number;
  brecha: number; anio: number; fuente: string;
}

// ─── COMPONENTE ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('barChartCanvas')         barChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChartCanvas')       donutChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('territorialChartCanvas') terrCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tipoChartCanvas')        tipoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ecoChartCanvas')         ecoCanvas!: ElementRef<HTMLCanvasElement>;

  readonly API = 'http://localhost:5000/api';

  // ── Estado ───────────────────────────────────────────────────────────────
  vistaActiva: 'horas' | 'tipo' | 'economico' = 'horas';
  cargando = true;
  error = '';

  // ── FILTROS Power BI ─────────────────────────────────────────────────────
  sexoFiltro:    'ambos' | 'femenino' | 'masculino' = 'ambos';
  paisSeleccionado = 'peru';
  deptoFiltro   = 'todos';
  deptoSearch   = '';
  deptoDropOpen = false;

  // ── Datos ────────────────────────────────────────────────────────────────
  datosPaises:    Record<string, DatoNacional> = {};
  territorial:    DatoTerritorial[]  = [];
  valorEconomico: ValorEconomico | null = null;
  tipoCuidado:    TipoCuidado[] = [];
  comparativo:    PaisComparativo[] = [];

  private charts: Record<string, Chart> = {};

  readonly PAISES = [
    { key: 'peru',     label: 'Perú',     emoji: '🇵🇪', disponible: true  },
    { key: 'mexico',   label: 'México',   emoji: '🇲🇽', disponible: false },
    { key: 'colombia', label: 'Colombia', emoji: '🇨🇴', disponible: false },
    { key: 'chile',    label: 'Chile',    emoji: '🇨🇱', disponible: false },
    { key: 'uruguay',  label: 'Uruguay',  emoji: '🇺🇾', disponible: false },
  ];

  readonly C = {
    mujeres: '#C1440E', hombres: '#5B3A2D',
    grid: 'rgba(255,255,255,0.05)', tick: '#9a7a6e',
  };

  // ─── LIFECYCLE ────────────────────────────────────────────────────────────
  constructor(private http: HttpClient) {}
  ngOnInit()    { this.cargarTodo(); }
  ngAfterViewInit() {}
  ngOnDestroy() { Object.values(this.charts).forEach(c => c.destroy()); }

  // ─── GETTERS ──────────────────────────────────────────────────────────────

  get paisActual(): DatoNacional | null {
    return this.datosPaises[this.paisSeleccionado] ?? null;
  }

  get departamentos(): string[] {
    return this.territorial.map(d => d.nombre);
  }

  get departamentosFiltrados(): string[] {
    const q = this.deptoSearch.toLowerCase();
    return q
      ? this.departamentos.filter(d => d.toLowerCase().includes(q))
      : this.departamentos;
  }

  get deptoActual(): DatoTerritorial | null {
    if (this.deptoFiltro === 'todos') return null;
    return this.territorial.find(d => d.nombre === this.deptoFiltro) ?? null;
  }

  get valorMujeres(): number {
    return this.deptoActual ? this.deptoActual.mujeres
      : (this.paisActual?.mujeres_total ?? 0);
  }
  get valorHombres(): number {
    return this.deptoActual ? this.deptoActual.hombres
      : (this.paisActual?.hombres_total ?? 0);
  }
  get valorBrecha(): number { return this.valorMujeres - this.valorHombres; }

  get lugarNombre(): string {
    return this.deptoFiltro !== 'todos'
      ? this.titleCase(this.deptoFiltro)
      : (this.paisActual?.nombre ?? '');
  }

  get kpiHoras(): number {
    return this.sexoFiltro === 'masculino' ? this.valorHombres : this.valorMujeres;
  }
  get kpiLabel(): string {
    return this.sexoFiltro === 'masculino' ? 'Hombres' : 'Mujeres';
  }

  get pctMujeres(): number {
    const t = this.valorMujeres + this.valorHombres;
    return t > 0 ? Math.round((this.valorMujeres / t) * 100) : 0;
  }

  get topRegiones(): DatoTerritorial[] {
    return this.territorial.slice(0, 8);
  }
  get maxBrecha(): number {
    return Math.max(...this.topRegiones.map(r => r.brecha), 1);
  }

  get filtrosActivos(): number {
    return (this.sexoFiltro !== 'ambos' ? 1 : 0) +
           (this.deptoFiltro !== 'todos' ? 1 : 0);
  }

  // ─── DATOS ────────────────────────────────────────────────────────────────

  cargarTodo() {
    this.cargando = true; this.error = '';
    forkJoin({
      nacional:    this.http.get<Record<string, DatoNacional>>(`${this.API}/nacional`),
      comparativo: this.http.get<PaisComparativo[]>(`${this.API}/comparativo`),
    }).subscribe({
      next: ({ nacional, comparativo }) => {
        this.datosPaises = nacional;
        this.comparativo = comparativo;
        this.cargarPais('peru');
      },
      error: () => {
        this.error = `No se pudo conectar al backend (${this.API}). Verifica que Flask esté corriendo.`;
        this.cargando = false;
      },
    });
  }

  cargarPais(pais: string) {
    this.paisSeleccionado = pais;
    this.deptoFiltro = 'todos';
    this.deptoSearch = '';

    forkJoin({
      terr: this.http.get<DatoTerritorial[]>(`${this.API}/territorial/${pais}`).pipe(catchError(() => of([]))),
      eco:  this.http.get<ValorEconomico>(`${this.API}/valor-economico/${pais}`).pipe(catchError(() => of(null))),
      tipo: this.http.get<TipoCuidado[]>(`${this.API}/tipo-cuidado/${pais}`).pipe(catchError(() => of([]))),
    }).subscribe(({ terr, eco, tipo }) => {
      this.territorial    = terr as DatoTerritorial[];
      this.valorEconomico = eco  as ValorEconomico | null;
      this.tipoCuidado    = tipo as TipoCuidado[];
      this.cargando       = false;
      setTimeout(() => this.renderizarTodo(), 80);
    });
  }

  // ─── FILTROS ──────────────────────────────────────────────────────────────

  setSexo(v: 'ambos' | 'femenino' | 'masculino') {
    this.sexoFiltro = v;
    setTimeout(() => this.renderizarTodo(), 50);
  }

  setDepto(nombre: string) {
    this.deptoFiltro  = nombre;
    this.deptoDropOpen = false;
    this.deptoSearch   = '';
    setTimeout(() => this.renderizarTodo(), 50);
  }

  limpiarFiltros() {
    this.sexoFiltro   = 'ambos';
    this.deptoFiltro  = 'todos';
    this.deptoSearch  = '';
    this.deptoDropOpen = false;
    setTimeout(() => this.renderizarTodo(), 50);
  }

  cambiarVista(v: 'horas' | 'tipo' | 'economico') {
    this.vistaActiva = v;
    setTimeout(() => this.renderizarTodo(), 80);
  }

  // ─── CHARTS ───────────────────────────────────────────────────────────────

  renderizarTodo() {
    this.renderizarBarras();
    this.renderizarDonut();
    if (this.vistaActiva === 'horas')     this.renderizarTerritorial();
    if (this.vistaActiva === 'tipo')      this.renderizarTipo();
    if (this.vistaActiva === 'economico') this.renderizarEco();
  }

  private destroyChart(k: string) { this.charts[k]?.destroy(); delete this.charts[k]; }

  /** Genera datasets según filtro de sexo activo */
  private datasets(mData: number[], hData: number[]) {
    const mostrarM = this.sexoFiltro !== 'masculino';
    const mostrarH = this.sexoFiltro !== 'femenino';
    const ds: any[] = [];
    if (mostrarM) ds.push({ label: 'Mujeres', data: mData,
      backgroundColor: this.C.mujeres, borderRadius: 5 });
    if (mostrarH) ds.push({ label: 'Hombres', data: hData,
      backgroundColor: this.C.hombres, borderRadius: 5 });
    return ds;
  }

  renderizarBarras() {
    const el = this.barChartCanvas?.nativeElement;
    if (!el || !this.paisActual) return;
    this.destroyChart('bar');
    const p = this.paisActual;
    let tM = p.mujeres_total, tH = p.hombres_total;
    let dM = p.mujeres_domestico, cM = p.mujeres_cuidado;
    let dH = p.hombres_domestico, cH = p.hombres_cuidado;
    if (this.deptoActual) {
      tM = this.deptoActual.mujeres; tH = this.deptoActual.hombres;
      dM = tM * 0.68; cM = tM * 0.32;
      dH = tH * 0.65; cH = tH * 0.35;
    }
    this.charts['bar'] = new Chart(el.getContext('2d')!, {
      type: 'bar',
      data: { labels: ['Doméstico (3xx)', 'Cuidado (4xx)', 'Total'],
        datasets: this.datasets([dM, cM, tM], [dH, cH, tH]) },
      options: this.baseOpts({ yCallback: (v: any) => `${v}h` }),
    });
  }

  renderizarDonut() {
    const el = this.donutChartCanvas?.nativeElement;
    if (!el) return;
    this.destroyChart('donut');
    const pM = this.sexoFiltro === 'masculino' ? 0 : this.pctMujeres;
    const pH = this.sexoFiltro === 'femenino'  ? 0 : 100 - this.pctMujeres;
    this.charts['donut'] = new Chart(el.getContext('2d')!, {
      type: 'doughnut',
      data: { labels: ['Mujeres','Hombres'],
        datasets: [{ data: [pM, pH],
          backgroundColor: [this.C.mujeres, this.C.hombres],
          borderWidth: 0, hoverOffset: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed}%` } } },
      },
    });
  }

  renderizarTerritorial() {
    const el = this.terrCanvas?.nativeElement;
    const data = this.deptoFiltro === 'todos'
      ? this.territorial.slice(0, 15)
      : this.territorial.filter(d => d.nombre === this.deptoFiltro);
    if (!el || data.length === 0) return;
    this.destroyChart('terr');
    this.charts['terr'] = new Chart(el.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: data.map(d => d.nombre.length > 14 ? d.nombre.slice(0,14)+'…' : d.nombre),
        datasets: this.datasets(data.map(d => d.mujeres), data.map(d => d.hombres)),
      },
      options: {
        ...this.baseOpts({ xCallback: (v: any) => `${v}h` }),
        indexAxis: 'y',
        onClick: (_, els) => { if (els.length) this.setDepto(data[els[0].index].nombre); },
      },
    });
  }

  renderizarTipo() {
    const el = this.tipoCanvas?.nativeElement;
    if (!el || !this.tipoCuidado.length) return;
    this.destroyChart('tipo');
    const dom  = this.tipoCuidado.filter(a => a.tipo === 'domestico');
    const cuid = this.tipoCuidado.filter(a => a.tipo === 'cuidado');
    const s    = (arr: TipoCuidado[], k: 'mujeres'|'hombres') => arr.reduce((n,a) => n + a[k], 0);
    this.charts['tipo'] = new Chart(el.getContext('2d')!, {
      type: 'bar',
      data: { labels: ['Doméstico (3xx)', 'Cuidado (4xx)'],
        datasets: this.datasets([s(dom,'mujeres'), s(cuid,'mujeres')],
                                [s(dom,'hombres'), s(cuid,'hombres')]) },
      options: this.baseOpts({ yCallback: (v: any) => `${v}h` }),
    });
  }

  renderizarEco() {
    const el = this.ecoCanvas?.nativeElement;
    if (!el || !this.territorial.length) return;
    this.destroyChart('eco');
    const T = 1.91, S = 52;
    const base = this.deptoFiltro === 'todos'
      ? [...this.territorial].sort((a,b) => b.mujeres - a.mujeres).slice(0,10)
      : this.territorial.filter(d => d.nombre === this.deptoFiltro);
    this.charts['eco'] = new Chart(el.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: base.map(d => d.nombre.length > 14 ? d.nombre.slice(0,14)+'…' : d.nombre),
        datasets: this.datasets(
          base.map(d => Math.round(d.mujeres * S * T)),
          base.map(d => Math.round(d.hombres * S * T)),
        ),
      },
      options: {
        ...this.baseOpts({ yCallback: (v: any) => `$${(+v/1000).toFixed(0)}k` }),
        plugins: {
          legend: { labels: { color: '#f5ede8', font: { size: 11 } } },
          tooltip: { callbacks: { label: (c) =>
            ` ${c.dataset.label}: USD ${(+(c.parsed.y ?? 0)).toLocaleString('es-PE')}/año` } },
        },
      },
    });
  }

  // ─── UTILIDADES ───────────────────────────────────────────────────────────

  private baseOpts(cfg: { yCallback?: any; xCallback?: any }): any {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f5ede8', font: { size: 11 } } },
        tooltip: { callbacks: { label: (c: any) =>
          ` ${c.dataset.label}: ${(c.parsed.y ?? c.parsed.x ?? 0).toFixed(1)} hrs/sem` } },
      },
      scales: {
        x: { ticks: { color: this.C.tick, callback: cfg.xCallback ?? undefined }, grid: { color: this.C.grid } },
        y: { ticks: { color: this.C.tick, callback: cfg.yCallback ?? undefined }, grid: { color: this.C.grid } },
      },
    };
  }

  fmt(n: number): string { return (n ?? 0).toFixed(1); }
  fmtUsd(n: number): string {
    return new Intl.NumberFormat('es-PE',
      { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }
  barPct(val: number, max = 50): string {
    return Math.min(100, (val / max) * 100).toFixed(1) + '%';
  }
  brechaPct(val: number): string {
    return Math.min(100, (val / this.maxBrecha) * 100).toFixed(1) + '%';
  }
  titleCase(s: string): string {
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}