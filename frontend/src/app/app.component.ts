import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DatoNacional {
  nombre: string;
  iso: string;
  anio_enut: number;
  fuente: string;
  mujeres_total: number;
  hombres_total: number;
  brecha: number;
  mujeres_domestico: number;
  hombres_domestico: number;
  mujeres_cuidado: number;
  hombres_cuidado: number;
  ratio: number;
  poblacion_analizada: string;
}

interface DatoTerritorial {
  nombre: string;
  mujeres: number;
  hombres: number;
  brecha: number;
  pct_mujeres: number;
}

interface ValorEconomico {
  salario_hora_usd: number;
  valor_anual_mujeres_usd: number;
  valor_anual_hombres_usd: number;
  pct_pbi: number;
  nota: string;
  pais: string;
}

interface TipoCuidado {
  actividad: string;
  mujeres: number;
  hombres: number;
  codigo: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('territorialChart') territorialChartRef!: ElementRef<HTMLCanvasElement>;

  readonly API = 'http://localhost:8000/api';

  // Estado
  vistaActiva: 'horas' | 'tipo' | 'economico' = 'horas';
  paisSeleccionado: string = 'peru';
  regionSeleccionada: DatoTerritorial | null = null;
  cargando = true;

  // Datos
  datosPaises: Record<string, DatoNacional> = {};
  datosTerritoriales: DatoTerritorial[] = [];
  valorEconomico: ValorEconomico | null = null;
  tipoCuidado: TipoCuidado[] = [];
  comparativo: any[] = [];
  resumen: any = {};

  // Charts
  private barChart?: Chart;
  private donutChart?: Chart;
  private territorialChart?: Chart;

  readonly PAISES = [
    { key: 'peru', label: 'Perú', emoji: '🇵🇪' },
    { key: 'colombia', label: 'Colombia', emoji: '🇨🇴' },
    { key: 'uruguay', label: 'Uruguay', emoji: '🇺🇾' },
    { key: 'mexico', label: 'México', emoji: '🇲🇽' },
  ];

  readonly COLORES = {
    mujeres: '#C1440E',
    hombres: '#5B3A2D',
    brecha: '#E8845A',
    fondo: '#1a0f0a',
    texto: '#f5ede8',
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarDatos();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.barChart?.destroy();
    this.donutChart?.destroy();
    this.territorialChart?.destroy();
  }

  get paisActual(): DatoNacional | null {
    return this.datosPaises[this.paisSeleccionado] ?? null;
  }

  get regionOPais(): { nombre: string; mujeres: number; hombres: number; brecha: number } {
    if (this.regionSeleccionada) {
      return this.regionSeleccionada;
    }
    const p = this.paisActual;
    if (!p) return { nombre: '', mujeres: 0, hombres: 0, brecha: 0 };
    return { nombre: p.nombre, mujeres: p.mujeres_total, hombres: p.hombres_total, brecha: p.brecha };
  }

  cargarDatos() {
    this.cargando = true;
    this.http.get<Record<string, DatoNacional>>(`${this.API}/nacional`).subscribe(data => {
      this.datosPaises = data;
      this.cargarPais(this.paisSeleccionado);
      this.http.get<any[]>(`${this.API}/comparativo`).subscribe(comp => {
        this.comparativo = comp;
        this.http.get<any>(`${this.API}/resumen`).subscribe(res => {
          this.resumen = res;
          this.cargando = false;
          setTimeout(() => this.renderizarGraficos(), 100);
        });
      });
    });
  }

  cargarPais(pais: string) {
    this.paisSeleccionado = pais;
    this.regionSeleccionada = null;
    this.http.get<DatoTerritorial[]>(`${this.API}/territorial/${pais}`).subscribe(t => {
      this.datosTerritoriales = t;
      setTimeout(() => this.renderizarTerritorial(), 100);
    });
    this.http.get<ValorEconomico>(`${this.API}/valor-economico/${pais}`).subscribe(v => {
      this.valorEconomico = v;
    });
    this.http.get<TipoCuidado[]>(`${this.API}/tipo-cuidado/${pais}`).subscribe({
      next: (t) => this.tipoCuidado = t,
      error: () => this.tipoCuidado = [],
    });
    setTimeout(() => this.renderizarGraficos(), 150);
  }

  seleccionarRegion(region: DatoTerritorial) {
    this.regionSeleccionada = this.regionSeleccionada?.nombre === region.nombre ? null : region;
    setTimeout(() => this.renderizarDonut(), 50);
  }

  cambiarVista(vista: 'horas' | 'tipo' | 'economico') {
    this.vistaActiva = vista;
    setTimeout(() => this.renderizarGraficos(), 100);
  }

  renderizarGraficos() {
    this.renderizarBarras();
    this.renderizarDonut();
  }

  renderizarBarras() {
    const canvas = this.barChartRef?.nativeElement;
    if (!canvas || !this.paisActual) return;
    this.barChart?.destroy();

    const p = this.paisActual;
    const ctx = canvas.getContext('2d')!;

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Doméstico', 'Cuidado directo', 'Total no remunerado'],
        datasets: [
          {
            label: 'Mujeres',
            data: [p.mujeres_domestico, p.mujeres_cuidado, p.mujeres_total],
            backgroundColor: '#C1440E',
            borderRadius: 4,
          },
          {
            label: 'Hombres',
            data: [p.hombres_domestico, p.hombres_cuidado, p.hombres_total],
            backgroundColor: '#5B3A2D',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#f5ede8', font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} hrs/sem`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#c4a89a' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: {
            ticks: { color: '#c4a89a', callback: (v) => `${v}h` },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });
  }

  renderizarDonut() {
    const canvas = this.donutChartRef?.nativeElement;
    if (!canvas) return;
    this.donutChart?.destroy();

    const d = this.regionOPais;
    const total = d.mujeres + d.hombres;
    const pctM = total > 0 ? Math.round((d.mujeres / total) * 100) : 0;
    const pctH = 100 - pctM;
    const ctx = canvas.getContext('2d')!;

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Mujeres', 'Hombres'],
        datasets: [{
          data: [pctM, pctH],
          backgroundColor: ['#C1440E', '#5B3A2D'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%` },
          },
        },
      },
    });
  }

  renderizarTerritorial() {
    const canvas = this.territorialChartRef?.nativeElement;
    if (!canvas || this.datosTerritoriales.length === 0) return;
    this.territorialChart?.destroy();

    const top = this.datosTerritoriales.slice(0, 8);
    const ctx = canvas.getContext('2d')!;

    this.territorialChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(d => d.nombre),
        datasets: [
          {
            label: 'Mujeres',
            data: top.map(d => d.mujeres),
            backgroundColor: '#C1440E',
            borderRadius: 3,
            stack: 'stack',
          },
          {
            label: 'Hombres',
            data: top.map(d => d.hombres),
            backgroundColor: '#5B3A2D',
            borderRadius: 3,
            stack: 'stack',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f5ede8', font: { size: 11 } } },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x} hrs/sem` },
          },
        },
        scales: {
          x: {
            ticks: { color: '#c4a89a', callback: (v) => `${v}h` },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: { ticks: { color: '#c4a89a', font: { size: 11 } }, grid: { display: false } },
        },
        onClick: (_, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            this.seleccionarRegion(top[idx]);
          }
        },
      },
    });
  }

  formatHoras(h: number): string {
    return h.toFixed(1);
  }

  formatUsd(n: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  }

  get brechaMaxRegion(): DatoTerritorial | null {
    if (this.datosTerritoriales.length === 0) return null;
    return this.datosTerritoriales[0];
  }
}
