import { Component, AfterViewInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';

const iconDefault = L.icon({
  iconRetinaUrl, iconUrl, shadowUrl,
  iconSize: [25, 41], iconAnchor: [12, 41],
  popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-mapa',
  template: '<div id="map" style="height: 100%; width: 100%; border-radius: 6px;"></div>',
  styles: [`
    :host { display: block; height: 100%; width: 100%; }

    /* ── Popup personalizado ─────────────────────────────────────────── */
    ::ng-deep .dat4-popup .leaflet-popup-content-wrapper {
      background: #FFFFFF;
      border: none;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(90,50,30,.18);
      padding: 0;
      overflow: hidden;
    }
    ::ng-deep .dat4-popup .leaflet-popup-content {
      margin: 0;
      width: auto !important;
    }
    ::ng-deep .dat4-popup .leaflet-popup-tip {
      background: #FFFFFF;
    }
    ::ng-deep .dat4-popup .leaflet-popup-close-button {
      display: none;
    }
  `]
})
export class MapaComponent implements AfterViewInit, OnChanges {
  @Input() pais: string = 'Latam';
  @Input() sexo: 'mujeres' | 'hombres' = 'mujeres';
  @Input() datos: any[] = [];

  private map: L.Map | undefined;
  private markers: L.CircleMarker[] = [];

  ngAfterViewInit() {
    setTimeout(() => {
      this.initMap();
      if (this.map) this.map.invalidateSize();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.map && (changes['pais'] || changes['sexo'] || changes['datos'])) {
      this.updateMapData();
    }
  }

  private initMap(): void {
    this.map = L.map('map', { zoomSnap: 0.5, zoomDelta: 0.5 })
      .setView([-10.0, -75.0], 3.5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO',
      subdomains: 'abcd', maxZoom: 19, minZoom: 4
    }).addTo(this.map);

    this.updateMapData();
  }

  private updateMapData(): void {
    if (!this.map) return;

    this.markers.forEach(m => m.remove());
    this.markers = [];

    const datosFiltrados = this.datos.filter(d => {
      const h = this.sexo === 'mujeres' ? d.horas_mujeres : d.horas_hombres;
      return h > 0;
    });

    datosFiltrados.forEach(unidad => {
      let coords: L.LatLngExpression | null = null;
      if (this.pais === 'Latam') {
        coords = this.getCountryCoordinates(unidad.nombre);
      } else {
        coords = this.getCoordinates(unidad.nombre, this.pais);
      }
      if (!coords) return;

      const horas     = this.sexo === 'mujeres' ? unidad.horas_mujeres : unidad.horas_hombres;
      const horasOtro = this.sexo === 'mujeres' ? unidad.horas_hombres : unidad.horas_mujeres;
      const brecha    = horas - horasOtro;
      const color     = this.getColorByHours(horas);
      const radio     = this.pais === 'Latam' ? 18 : Math.max(8, Math.min(22, horas / 2.5));

      const circle = L.circleMarker(coords, {
        radius: radio,
        fillColor: color,
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.88
      }).addTo(this.map!);

      // ── Popup nuevo formato ────────────────────────────────────────────
      const sexoLabel = this.sexo === 'mujeres' ? 'MUJERES' : 'HOMBRES';
      const sexoIcon  = this.sexo === 'mujeres' ? '♀' : '♂';
      const brechaStr = brecha >= 0
        ? `+${brecha.toFixed(1)} hrs`
        : `${brecha.toFixed(1)} hrs`;
      const contexto  = this.pais === 'Latam' ? 'Promedio nacional' : 'Trabajo no remunerado';

      const popupContent = `
        <div style="
          min-width: 210px;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        ">
          <!-- Cabecera naranja -->
          <div style="
            background: #1f2937;
            padding: 10px 14px 8px;
          ">
            <div style="
              font-size: 13px; font-weight: 700;
              color: #FFFFFF; letter-spacing: .04em;
            ">${unidad.nombre}</div>
            <div style="
              font-size: 10px; color: rgba(255,255,255,.75);
              margin-top: 2px; text-transform: uppercase; letter-spacing: .06em;
            ">${contexto}</div>
          </div>

          <!-- Cuerpo -->
          <div style="padding: 12px 14px;">

            <!-- Horas principales -->
            <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px;">
              <span style="
                font-size: 32px; font-weight: 700; line-height: 1;
                color: ${color};
              ">${horas.toFixed(1)}</span>
              <span style="font-size: 13px; color: #9A7060; font-weight: 500;">hrs/sem</span>
            </div>

            <!-- Etiqueta sexo -->
            <div style="
              display: inline-flex; align-items: center; gap: 5px;
              background: rgba(193,68,14,.10);
              border: 1px solid rgba(193,68,14,.25);
              border-radius: 12px;
              padding: 3px 10px;
              font-size: 11px; font-weight: 600; color: #A83509;
              margin-bottom: 10px;
            ">
              <span>${sexoIcon}</span> ${sexoLabel}
            </div>

            <!-- Divisor -->
            <div style="height:1px; background: rgba(90,50,30,.10); margin-bottom:10px;"></div>

            <!-- Brecha -->
            <div style="
              display: flex; justify-content: space-between; align-items: center;
            ">
              <span style="font-size: 11px; color: #9A7060;">Brecha respecto a hombres</span>
              <span style="
                font-size: 13px; font-weight: 700; color: #C1440E;
              ">${brechaStr}</span>
            </div>

          </div>

          <!-- Footer -->
          <div style="
            padding: 6px 14px 8px;
            background: rgba(193,68,14,.05);
            border-top: 1px solid rgba(193,68,14,.10);
            font-size: 9.5px; color: #9A7060;
            text-align: center; letter-spacing: .04em;
          "></div>
        </div>
      `;

      circle.bindPopup(popupContent, {
        closeButton: false,
        className: 'dat4-popup',
        autoClose: false,
        closeOnClick: false
      });

      circle.on('mouseover', () => circle.openPopup());
      circle.on('mouseout',  () => circle.closePopup());

      if (this.pais === 'Latam' && unidad.pais) {
        circle.on('click', () => {
          window.dispatchEvent(new CustomEvent('cambiarPais', { detail: unidad.pais }));
        });
      }

      this.markers.push(circle);
    });

    if (this.markers.length > 0 && this.map && this.pais !== 'Latam') {
      const group = L.featureGroup(this.markers);
      const bounds = group.getBounds();
      if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.2));
    }
  }

  // ── Coordenadas ──────────────────────────────────────────────────────────

  private getCountryCoordinates(nombre: string): L.LatLngExpression | null {
    const c: Record<string, L.LatLngExpression> = {
      'Perú':     [-9.19, -75.01],
      'Colombia': [ 4.57, -74.29],
      'Uruguay':  [-32.52,-55.76],
      'México':   [23.63,-102.55],
      'Chile':    [-35.68,-71.54]
    };
    return c[nombre] ?? null;
  }

  private getCoordinates(nombre: string, pais: string): L.LatLngExpression | null {
    const peru: Record<string, L.LatLngExpression> = {
      'Amazonas':    [-6.20, -77.85], 'Ancash':      [-9.53, -77.53],
      'Apurímac':    [-13.64,-72.88], 'Arequipa':    [-16.40,-71.54],
      'Ayacucho':    [-13.16,-74.22], 'Cajamarca':   [-7.16, -78.51],
      'Callao':      [-12.06,-77.15], 'Cusco':       [-13.53,-71.97],
      'Huancavelica':[-12.79,-74.98], 'Huánuco':     [-9.93, -76.24],
      'Ica':         [-14.07,-75.73], 'Junín':       [-11.15,-75.35],
      'La Libertad': [-8.11, -79.03], 'Lambayeque':  [-6.77, -79.84],
      'Lima':        [-12.05,-77.04], 'Loreto':      [-3.75, -73.25],
      'Madre de Dios':[-12.59,-69.19],'Moquegua':    [-17.19,-70.94],
      'Pasco':       [-10.67,-76.27], 'Piura':       [-5.19, -80.63],
      'Puno':        [-15.84,-70.02], 'San Martín':  [-6.51, -76.37],
      'Tacna':       [-18.01,-70.25], 'Tumbes':      [-3.57, -80.45],
      'Ucayali':     [-8.38, -74.55]
    };
    const colombia: Record<string, L.LatLngExpression> = {
      'Amazonas':  [-4.20,-69.93], 'Antioquia': [6.25,-75.57],
      'Arauca':    [7.09, -70.76], 'Atlántico': [10.96,-74.80],
      'Bolívar':   [8.67, -74.10]
    };
    const uruguay: Record<string, L.LatLngExpression> = {
      'Artigas':    [-30.40,-56.47], 'Canelones':  [-34.52,-56.28],
      'Cerro Largo':[-32.37,-54.17], 'Colonia':    [-34.47,-57.83],
      'Durazno':    [-33.38,-56.52], 'Flores':     [-33.53,-56.89],
      'Lavalleja':  [-33.92,-54.96], 'Maldonado':  [-34.90,-54.95],
      'Montevideo': [-34.90,-56.19], 'Paysandú':   [-32.32,-58.08],
      'Río Negro':  [-32.78,-57.45], 'Rivera':     [-30.90,-55.55],
      'Rocha':      [-34.48,-54.33], 'Salto':      [-31.38,-57.96],
      'San José':   [-34.33,-56.70], 'Tacuarembó': [-31.73,-55.98]
    };
    const mexico: Record<string, L.LatLngExpression> = {
      'Aguascalientes':[21.88,-102.29],'Baja California':[32.00,-115.50],
      'Baja California Sur':[25.50,-111.50],'Campeche':[19.83,-90.53],
      'Chiapas':[16.75,-93.12],'Chihuahua':[28.63,-106.07],
      'Ciudad de México':[19.43,-99.13],'Coahuila':[27.06,-101.71],
      'Colima':[19.24,-103.72],'Durango':[24.56,-104.66],
      'Estado de México':[19.35,-99.63],'Guanajuato':[21.02,-101.26],
      'Guerrero':[17.55,-99.50],'Hidalgo':[20.50,-98.50],
      'Jalisco':[20.66,-103.35],'Michoacán':[19.70,-101.18],
      'Morelos':[18.80,-99.00],'Nayarit':[21.50,-104.50],
      'Nuevo León':[25.68,-100.31],'Oaxaca':[17.07,-96.72],
      'Puebla':[19.04,-98.21],'Querétaro':[20.59,-100.39],
      'Quintana Roo':[19.50,-88.00],'San Luis Potosí':[22.15,-100.98],
      'Sinaloa':[24.80,-107.40],'Sonora':[29.00,-111.00],
      'Tabasco':[18.00,-92.50],'Tamaulipas':[24.00,-98.50],
      'Tlaxcala':[19.31,-98.24],'Veracruz':[19.17,-96.13],
      'Yucatán':[20.50,-89.00],'Zacatecas':[22.77,-102.57]
    };
    const chile: Record<string, L.LatLngExpression> = {
      'Arica y Parinacota':[-18.48,-70.33],'Tarapacá':[-20.22,-69.93],
      'Antofagasta':[-23.65,-70.40],'Atacama':[-27.37,-70.33],
      'Coquimbo':[-29.95,-71.34],'Valparaíso':[-33.05,-71.62],
      'Metropolitana':[-33.44,-70.65],"O'Higgins":[-34.17,-70.74],
      'Maule':[-35.43,-71.67],'Ñuble':[-36.62,-71.96],
      'Biobío':[-36.83,-73.05],'La Araucanía':[-38.74,-72.59],
      'Los Ríos':[-39.81,-73.24],'Los Lagos':[-41.47,-72.94],
      'Aysén':[-45.57,-72.07],'Magallanes':[-53.16,-70.91]
    };

    if (pais === 'Peru')     return peru[nombre]     ?? null;
    if (pais === 'Colombia') return colombia[nombre] ?? null;
    if (pais === 'Uruguay')  return uruguay[nombre]  ?? null;
    if (pais === 'Mexico')   return mexico[nombre]   ?? null;
    if (pais === 'Chile')    return chile[nombre]    ?? null;
    return null;
  }

  private getColorByHours(horas: number): string {
    if (horas <= 20) return '#F4A580';
    if (horas <= 28) return '#E8844A';
    if (horas <= 36) return '#D4500F';
    if (horas <= 44) return '#A83509';
    if (horas <= 52) return '#7C2208';
    return '#5A1A06';
  }
}