import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

// ── Configuración económica por país ────────────────────────────────────────
interface PaisConfig {
  nombre:        string;
  salarioMinUSD: number;   // salario mínimo mensual en USD
  horasSemana:   number;   // horas laborales legales por semana
  semanasMes:    number;   // semanas por mes (siempre 4)
  moneda:        string;   // moneda local
  salarioLocal:  number;   // salario en moneda local
  tipoCambio:    number;   // unidades locales por 1 USD
}

const PAISES_CONFIG: Record<string, PaisConfig> = {
  Peru: {
    nombre: 'Perú', salarioMinUSD: 303,
    horasSemana: 48, semanasMes: 4,
    moneda: 'S/', salarioLocal: 1130, tipoCambio: 3.73
  },
  Colombia: {
    nombre: 'Colombia', salarioMinUSD: 446,
    horasSemana: 48, semanasMes: 4,
    moneda: 'COP', salarioLocal: 2000000, tipoCambio: 4482
  },
  Uruguay: {
    nombre: 'Uruguay', salarioMinUSD: 606,
    horasSemana: 44, semanasMes: 4,
    moneda: 'UYU', salarioLocal: 24572, tipoCambio: 40.5
  },
  Mexico: {
    nombre: 'México', salarioMinUSD: 420,
    horasSemana: 48, semanasMes: 4,
    moneda: 'MXN', salarioLocal: 8364, tipoCambio: 19.9
  },
  Chile: {
    nombre: 'Chile', salarioMinUSD: 551,
    horasSemana: 45, semanasMes: 4,
    moneda: 'CLP', salarioLocal: 529000, tipoCambio: 960
  }
};

export interface UnidadEconomia {
  nombre:          string;
  horas_mujeres:   number;
  horas_hombres:   number;
  valor_usd:       number;   // valor económico perdido en USD
  valor_local:     string;   // valor en moneda local formateado
  precio_hora_usd: number;
  pais?:           string;
}

@Component({
  selector: 'app-economia',
  templateUrl: './economia.component.html',
  styleUrls: ['./economia.component.scss']
})
export class EconomiaComponent implements OnChanges {
  @Input()  visible    = false;
  @Input()  paisActual = 'Latam';
  @Output() close      = new EventEmitter<void>();

  // ── Datos calculados ───────────────────────────────────────────────────
  unidades:       UnidadEconomia[] = [];
  totalUSD        = 0;
  totalLocal      = '';
  precioHoraUSD   = 0;
  paisConfig:     PaisConfig | null = null;
  maxValor        = 1;

  // Datos hardcodeados (igual que data.service pero aquí embebidos para autonomía)
  private readonly DATA: Record<string, { nombre: string; horas_mujeres: number; horas_hombres: number; pais?: string }[]> = {
    Latam: [
      { nombre: 'Perú',     horas_mujeres: 36.20, horas_hombres: 12.90, pais: 'Peru'     },
      { nombre: 'Colombia', horas_mujeres: 56.50, horas_hombres: 16.30, pais: 'Colombia' },
      { nombre: 'Uruguay',  horas_mujeres: 30.80, horas_hombres: 13.90, pais: 'Uruguay'  },
      { nombre: 'México',   horas_mujeres: 48.50, horas_hombres: 21.10, pais: 'Mexico'   },
      { nombre: 'Chile',    horas_mujeres: 34.80, horas_hombres: 18.90, pais: 'Chile'    }
    ],
    Peru: [
      { nombre: 'Amazonas',      horas_mujeres: 40.13, horas_hombres: 11.01 },
      { nombre: 'Ancash',        horas_mujeres: 40.26, horas_hombres: 13.08 },
      { nombre: 'Apurímac',      horas_mujeres: 38.69, horas_hombres: 12.71 },
      { nombre: 'Arequipa',      horas_mujeres: 38.85, horas_hombres: 14.41 },
      { nombre: 'Ayacucho',      horas_mujeres: 35.32, horas_hombres: 12.90 },
      { nombre: 'Cajamarca',     horas_mujeres: 37.58, horas_hombres:  8.41 },
      { nombre: 'Callao',        horas_mujeres: 29.74, horas_hombres: 13.20 },
      { nombre: 'Cusco',         horas_mujeres: 40.03, horas_hombres: 16.22 },
      { nombre: 'Huancavelica',  horas_mujeres: 35.75, horas_hombres: 14.69 },
      { nombre: 'Huánuco',       horas_mujeres: 39.35, horas_hombres: 16.20 },
      { nombre: 'Ica',           horas_mujeres: 36.73, horas_hombres: 12.41 },
      { nombre: 'Junín',         horas_mujeres: 31.30, horas_hombres: 10.73 },
      { nombre: 'La Libertad',   horas_mujeres: 38.81, horas_hombres: 11.77 },
      { nombre: 'Lambayeque',    horas_mujeres: 39.73, horas_hombres: 14.76 },
      { nombre: 'Lima',          horas_mujeres: 33.96, horas_hombres: 12.86 },
      { nombre: 'Loreto',        horas_mujeres: 35.18, horas_hombres: 12.84 },
      { nombre: 'Madre de Dios', horas_mujeres: 38.04, horas_hombres: 10.84 },
      { nombre: 'Moquegua',      horas_mujeres: 31.89, horas_hombres: 14.45 },
      { nombre: 'Pasco',         horas_mujeres: 33.54, horas_hombres:  7.22 },
      { nombre: 'Piura',         horas_mujeres: 40.36, horas_hombres: 11.06 },
      { nombre: 'Puno',          horas_mujeres: 37.24, horas_hombres: 15.25 },
      { nombre: 'San Martín',    horas_mujeres: 34.88, horas_hombres: 12.71 },
      { nombre: 'Tacna',         horas_mujeres: 42.14, horas_hombres: 18.53 },
      { nombre: 'Tumbes',        horas_mujeres: 30.67, horas_hombres:  9.15 },
      { nombre: 'Ucayali',       horas_mujeres: 28.29, horas_hombres: 10.93 }
    ],
    Colombia: [
      { nombre: 'Amazonas',  horas_mujeres: 48.16, horas_hombres: 13.48 },
      { nombre: 'Antioquia', horas_mujeres: 47.82, horas_hombres: 15.54 },
      { nombre: 'Arauca',    horas_mujeres: 57.93, horas_hombres: 14.30 },
      { nombre: 'Atlántico', horas_mujeres: 64.46, horas_hombres: 14.60 },
      { nombre: 'Bolívar',   horas_mujeres: 63.98, horas_hombres: 18.61 }
    ],
    Uruguay: [
      { nombre: 'Artigas',      horas_mujeres: 25.39, horas_hombres: 15.28 },
      { nombre: 'Canelones',    horas_mujeres: 32.17, horas_hombres: 24.48 },
      { nombre: 'Cerro Largo',  horas_mujeres: 32.77, horas_hombres: 16.32 },
      { nombre: 'Colonia',      horas_mujeres: 25.22, horas_hombres: 16.12 },
      { nombre: 'Durazno',      horas_mujeres: 26.23, horas_hombres: 11.57 },
      { nombre: 'Flores',       horas_mujeres: 28.97, horas_hombres:  9.40 },
      { nombre: 'Lavalleja',    horas_mujeres: 26.73, horas_hombres: 12.19 },
      { nombre: 'Maldonado',    horas_mujeres: 35.21, horas_hombres: 12.33 },
      { nombre: 'Montevideo',   horas_mujeres: 33.82, horas_hombres: 16.68 },
      { nombre: 'Paysandú',     horas_mujeres: 27.80, horas_hombres:  7.54 },
      { nombre: 'Río Negro',    horas_mujeres: 35.40, horas_hombres:  8.70 },
      { nombre: 'Rivera',       horas_mujeres: 34.20, horas_hombres: 21.00 },
      { nombre: 'Rocha',        horas_mujeres: 24.90, horas_hombres:  8.70 },
      { nombre: 'Salto',        horas_mujeres: 32.50, horas_hombres: 10.40 },
      { nombre: 'San José',     horas_mujeres: 35.80, horas_hombres: 16.40 },
      { nombre: 'Tacuarembó',   horas_mujeres: 28.10, horas_hombres: 10.20 }
    ],
    Mexico: [
      { nombre: 'Aguascalientes',     horas_mujeres: 52.04, horas_hombres: 23.50 },
      { nombre: 'Baja California',    horas_mujeres: 40.58, horas_hombres: 22.32 },
      { nombre: 'Baja California Sur',horas_mujeres: 45.47, horas_hombres: 22.67 },
      { nombre: 'Campeche',           horas_mujeres: 42.88, horas_hombres: 19.03 },
      { nombre: 'Chiapas',            horas_mujeres: 49.30, horas_hombres: 21.81 },
      { nombre: 'Chihuahua',          horas_mujeres: 44.89, horas_hombres: 21.35 },
      { nombre: 'Ciudad de México',   horas_mujeres: 52.60, horas_hombres: 18.91 },
      { nombre: 'Coahuila',           horas_mujeres: 41.04, horas_hombres: 18.83 },
      { nombre: 'Colima',             horas_mujeres: 41.46, horas_hombres: 22.09 },
      { nombre: 'Durango',            horas_mujeres: 61.92, horas_hombres: 28.16 },
      { nombre: 'Estado de México',   horas_mujeres: 48.67, horas_hombres: 20.60 },
      { nombre: 'Guanajuato',         horas_mujeres: 46.20, horas_hombres: 19.41 },
      { nombre: 'Guerrero',           horas_mujeres: 57.30, horas_hombres: 19.99 },
      { nombre: 'Hidalgo',            horas_mujeres: 48.41, horas_hombres: 19.59 },
      { nombre: 'Jalisco',            horas_mujeres: 45.92, horas_hombres: 20.29 },
      { nombre: 'Michoacán',          horas_mujeres: 51.93, horas_hombres: 20.53 },
      { nombre: 'Morelos',            horas_mujeres: 48.26, horas_hombres: 20.67 },
      { nombre: 'Nayarit',            horas_mujeres: 49.61, horas_hombres: 21.10 },
      { nombre: 'Nuevo León',         horas_mujeres: 40.31, horas_hombres: 19.77 },
      { nombre: 'Oaxaca',             horas_mujeres: 56.32, horas_hombres: 21.79 },
      { nombre: 'Puebla',             horas_mujeres: 49.04, horas_hombres: 21.72 },
      { nombre: 'Querétaro',          horas_mujeres: 45.66, horas_hombres: 22.37 },
      { nombre: 'Quintana Roo',       horas_mujeres: 44.42, horas_hombres: 19.56 },
      { nombre: 'San Luis Potosí',    horas_mujeres: 48.78, horas_hombres: 20.17 },
      { nombre: 'Sinaloa',            horas_mujeres: 44.17, horas_hombres: 20.74 },
      { nombre: 'Sonora',             horas_mujeres: 43.07, horas_hombres: 20.52 },
      { nombre: 'Tabasco',            horas_mujeres: 52.07, horas_hombres: 21.33 },
      { nombre: 'Tamaulipas',         horas_mujeres: 46.15, horas_hombres: 21.15 },
      { nombre: 'Tlaxcala',           horas_mujeres: 49.01, horas_hombres: 20.47 },
      { nombre: 'Veracruz',           horas_mujeres: 50.34, horas_hombres: 21.05 },
      { nombre: 'Yucatán',            horas_mujeres: 49.00, horas_hombres: 21.37 },
      { nombre: 'Zacatecas',          horas_mujeres: 50.49, horas_hombres: 20.81 }
    ],
    Chile: [
      { nombre: 'Arica y Parinacota', horas_mujeres: 31.10, horas_hombres: 17.26 },
      { nombre: 'Tarapacá',           horas_mujeres: 32.89, horas_hombres: 17.50 },
      { nombre: 'Antofagasta',        horas_mujeres: 35.53, horas_hombres: 21.60 },
      { nombre: 'Atacama',            horas_mujeres: 36.90, horas_hombres: 19.63 },
      { nombre: 'Coquimbo',           horas_mujeres: 46.01, horas_hombres: 22.46 },
      { nombre: 'Valparaíso',         horas_mujeres: 37.47, horas_hombres: 25.54 },
      { nombre: 'Metropolitana',      horas_mujeres: 35.45, horas_hombres: 22.21 },
      { nombre: "O'Higgins",          horas_mujeres: 38.37, horas_hombres: 20.77 },
      { nombre: 'Maule',              horas_mujeres: 37.43, horas_hombres: 19.74 },
      { nombre: 'Ñuble',              horas_mujeres: 33.39, horas_hombres: 17.54 },
      { nombre: 'Biobío',             horas_mujeres: 34.21, horas_hombres: 18.03 },
      { nombre: 'La Araucanía',       horas_mujeres: 33.81, horas_hombres: 17.18 },
      { nombre: 'Los Ríos',           horas_mujeres: 35.31, horas_hombres: 22.52 },
      { nombre: 'Los Lagos',          horas_mujeres: 33.66, horas_hombres: 19.64 },
      { nombre: 'Aysén',              horas_mujeres: 35.69, horas_hombres: 17.92 },
      { nombre: 'Magallanes',         horas_mujeres: 25.71, horas_hombres: 12.88 }
    ]
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['paisActual'] || changes['visible']) {
      this.calcular();
    }
  }

  closeModal() { this.close.emit(); }

  // ── Fórmula: precio_hora = salario_min_USD / (horas_sem * semanas_mes)
  //            valor_usd   = horas_mujeres * precio_hora * 4 semanas
  private calcular() {
    const pais = this.paisActual;

    if (pais === 'Latam') {
      this.paisConfig    = null;
      this.precioHoraUSD = 0;

      const latamData = this.DATA['Latam'] ?? [];
      this.unidades = latamData
        .filter(u => u.horas_mujeres > 0)
        .map(u => {
          const cfg  = PAISES_CONFIG[u.pais ?? ''];
          if (!cfg) return null;
          const pxh  = cfg.salarioMinUSD / (cfg.horasSemana * cfg.semanasMes);
          const vusd = u.horas_mujeres * pxh * cfg.semanasMes;
          return {
            nombre:          u.nombre,
            horas_mujeres:   u.horas_mujeres,
            horas_hombres:   u.horas_hombres,
            valor_usd:       +vusd.toFixed(2),
            valor_local:     `$${vusd.toFixed(0)} USD`,
            precio_hora_usd: +pxh.toFixed(3),
            pais:            u.pais
          } as UnidadEconomia;
        })
        .filter((u): u is UnidadEconomia => u !== null)
        .sort((a, b) => b.valor_usd - a.valor_usd);

      this.totalUSD  = +this.unidades.reduce((s, u) => s + u.valor_usd, 0).toFixed(2);
      this.totalLocal = `$${this.totalUSD.toFixed(0)} USD`;
      this.maxValor   = Math.max(...this.unidades.map(u => u.valor_usd), 1);
      return;
    }

    const cfg = PAISES_CONFIG[pais];
    if (!cfg) { this.unidades = []; return; }

    this.paisConfig    = cfg;
    const pxh          = cfg.salarioMinUSD / (cfg.horasSemana * cfg.semanasMes);
    this.precioHoraUSD = +pxh.toFixed(3);

    const data = (this.DATA[pais] ?? []).filter(u => u.horas_mujeres > 0);

    this.unidades = data.map(u => {
      const vusd  = u.horas_mujeres * pxh * cfg.semanasMes;
      const vlocal = vusd * cfg.tipoCambio;
      return {
        nombre:          u.nombre,
        horas_mujeres:   u.horas_mujeres,
        horas_hombres:   u.horas_hombres,
        valor_usd:       +vusd.toFixed(2),
        valor_local:     `${cfg.moneda} ${vlocal.toLocaleString('es', { maximumFractionDigits: 0 })}`,
        precio_hora_usd: +pxh.toFixed(3)
      };
    }).sort((a, b) => b.valor_usd - a.valor_usd);

    this.totalUSD   = +this.unidades.reduce((s, u) => s + u.valor_usd, 0).toFixed(2);
    const totalLocal = this.totalUSD * cfg.tipoCambio;
    this.totalLocal  = `${cfg.moneda} ${totalLocal.toLocaleString('es', { maximumFractionDigits: 0 })}`;
    this.maxValor    = Math.max(...this.unidades.map(u => u.valor_usd), 1);
  }

  barPct(val: number): string {
    return ((val / this.maxValor) * 100).toFixed(1) + '%';
  }

  formatUSD(val: number): string {
    return '$' + val.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}