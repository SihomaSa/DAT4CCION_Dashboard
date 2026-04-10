import { Component, AfterViewInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as L from 'leaflet';

const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';

const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-mapa',
  template: '<div id="map" style="height: 100%; width: 100%; border-radius: 12px;"></div>',
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
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
    if (this.map) {
      this.map.invalidateSize(); // ← fuerza recalcular dimensiones
    }
   }, 100);
 }

  ngOnChanges(changes: SimpleChanges) {
    if (this.map && (changes['pais'] || changes['sexo'] || changes['datos'])) {
      this.updateMapData();
    }
  }

  private initMap(): void {
    const center: L.LatLngExpression = [-10.0, -75.0]; // ← Centrado en Sudamérica
    const zoom = 3.5; // ← Más alejado para ver todo el continente

    this.map = L.map('map', {
        zoomSnap: 0.5,  // ← Permite zooms decimales
        zoomDelta: 0.5
    }).setView(center, zoom);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 4
    }).addTo(this.map);

    this.updateMapData();
    }

    private getCountryCenter(): L.LatLngExpression {
    const centers: { [key: string]: L.LatLngExpression } = {
        'Latam': [-10.0, -75.0],  // Centro óptimo para México-Chile
        'Peru': [-9.19, -75.01],
        'Colombia': [4.57, -74.29],
        'Uruguay': [-32.52, -55.76],
        'Mexico': [23.63, -102.55],
        'Chile': [-35.68, -71.54]
    };
    return centers[this.pais] || [12.0, -86.5];
    }

    private getCountryZoom(): number {
    const zooms: { [key: string]: number } = {
        'Latam': 3.5,      // Zoom para ver desde México hasta Chile
        'Peru': 5,
        'Colombia': 5,
        'Uruguay': 6,
        'Mexico': 4.5,
        'Chile': 4.5     // Chile es alargado, mejor un zoom ligeramente más alejado
    };
    return zooms[this.pais] || 5;
    }

  private updateMapData(): void {
    if (!this.map) return;

    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    const datosFiltrados = this.datos.filter(d => {
      const horas = this.sexo === 'mujeres' ? d.horas_mujeres : d.horas_hombres;
      return horas > 0;
    });

    datosFiltrados.forEach(unidad => {
      let coords: L.LatLngExpression | null = null;
      
      // Para Latam, usar coordenadas de países
      if (this.pais === 'Latam') {
        coords = this.getCountryCoordinates(unidad.nombre);
      } else {
        coords = this.getCoordinates(unidad.nombre, this.pais);
      }
      
      if (coords) {
        const horas = this.sexo === 'mujeres' ? unidad.horas_mujeres : unidad.horas_hombres;
        const color = this.getColorByHours(horas);
        // Radio más grande para vista Latam
        const radio = this.pais === 'Latam' ? 18 : Math.max(8, Math.min(22, horas / 2.5));
        
        const circle = L.circleMarker(coords, {
          radius: radio,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(this.map!);
        
        let popupContent = '';
        if (this.pais === 'Latam') {
          popupContent = `
            <div style="min-width: 180px; padding: 8px;">
              <strong style="font-size: 15px; color: #2c3e50;">${unidad.nombre}</strong><br>
              <hr style="margin: 8px 0; border-color: #ddd;">
              <div style="font-size: 22px; font-weight: bold; color: ${color}; text-align: center;">
                ${horas.toFixed(1)} <span style="font-size: 14px;">hrs/sem</span>
              </div>
              <div style="text-align: center; margin-top: 5px;">
                <small style="color: #666;">
                  ${this.sexo === 'mujeres' ? '👩 Mujeres' : '👨 Hombres'}
                </small>
              </div>
              <div style="text-align: center; margin-top: 3px;">
                <small style="color: #999;">Promedio nacional</small>
              </div>
              <div style="text-align: center; margin-top: 5px;">
                <small style="color: #0693e3;">Haz clic para ver detalles</small>
              </div>
            </div>
          `;
        } else {
          popupContent = `
            <div style="min-width: 180px; padding: 8px;">
              <strong style="font-size: 15px; color: #2c3e50;">${unidad.nombre}</strong><br>
              <hr style="margin: 8px 0; border-color: #ddd;">
              <div style="font-size: 22px; font-weight: bold; color: ${color}; text-align: center;">
                ${horas.toFixed(1)} <span style="font-size: 14px;">hrs/sem</span>
              </div>
              <div style="text-align: center; margin-top: 5px;">
                <small style="color: #666;">
                  ${this.sexo === 'mujeres' ? '👩 Mujeres' : '👨 Hombres'}
                </small>
              </div>
              <div style="text-align: center; margin-top: 3px;">
                <small style="color: #999;">Trabajo no remunerado</small>
              </div>
            </div>
          `;
        }
        
        circle.bindPopup(popupContent);
        
        circle.bindTooltip(`${unidad.nombre}: ${horas.toFixed(1)} hrs/sem`, {
          permanent: false,
          direction: 'top'
        });
        
        // En Latam, al hacer clic cambiar a ese país
        if (this.pais === 'Latam' && unidad.pais) {
          circle.on('click', () => {
            // Emitir evento para cambiar el país (lo manejaremos en app.component)
            const event = new CustomEvent('cambiarPais', { detail: unidad.pais });
            window.dispatchEvent(event);
          });
          circle.bindTooltip(`${unidad.nombre}: ${horas.toFixed(1)} hrs/sem (clic para explorar)`, {
            permanent: false,
            direction: 'top'
          });
        }
        
        this.markers.push(circle);
      }
    });

    if (this.markers.length > 0 && this.map && this.pais !== 'Latam') {
      const group = L.featureGroup(this.markers);
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds.pad(0.2));
      }
    }
  }

  private getCountryCoordinates(nombre: string): L.LatLngExpression | null {
    const coords: { [key: string]: L.LatLngExpression } = {
      'Perú': [-9.19, -75.01],
      'Colombia': [4.57, -74.29],
      'Uruguay': [-32.52, -55.76],
      'México': [23.63, -102.55],
      'Chile': [-35.68, -71.54]
    };
    return coords[nombre] || null;
  }

  private getCoordinates(nombre: string, pais: string): L.LatLngExpression | null {
    // Coordenadas de Perú
    const peruCoords: { [key: string]: L.LatLngExpression } = {
      'Amazonas': [-6.2, -77.85], 'Ancash': [-9.53, -77.53],
      'Apurímac': [-13.64, -72.88], 'Arequipa': [-16.40, -71.54],
      'Ayacucho': [-13.16, -74.22], 'Cajamarca': [-7.16, -78.51],
      'Callao': [-12.06, -77.15], 'Cusco': [-13.53, -71.97],
      'Huancavelica': [-12.79, -74.98], 'Huánuco': [-9.93, -76.24],
      'Ica': [-14.07, -75.73], 'Junín': [-11.15, -75.35],
      'La Libertad': [-8.11, -79.03], 'Lambayeque': [-6.77, -79.84],
      'Lima': [-12.05, -77.04], 'Loreto': [-3.75, -73.25],
      'Madre de Dios': [-12.59, -69.19], 'Moquegua': [-17.19, -70.94],
      'Pasco': [-10.67, -76.27], 'Piura': [-5.19, -80.63],
      'Puno': [-15.84, -70.02], 'San Martín': [-6.51, -76.37],
      'Tacna': [-18.01, -70.25], 'Tumbes': [-3.57, -80.45],
      'Ucayali': [-8.38, -74.55]
    };
    
    // Coordenadas de Colombia
    const colombiaCoords: { [key: string]: L.LatLngExpression } = {
      'Amazonas': [-4.20, -69.93], 'Antioquia': [6.25, -75.57],
      'Arauca': [7.09, -70.76], 'Atlántico': [10.96, -74.80],
      'Bolívar': [8.67, -74.10]
    };
    
    // Coordenadas de Uruguay
    const uruguayCoords: { [key: string]: L.LatLngExpression } = {
      'Artigas': [-30.40, -56.47], 'Canelones': [-34.52, -56.28],
      'Cerro Largo': [-32.37, -54.17], 'Colonia': [-34.47, -57.83],
      'Durazno': [-33.38, -56.52], 'Flores': [-33.53, -56.89],
      'Lavalleja': [-33.92, -54.96], 'Maldonado': [-34.90, -54.95],
      'Montevideo': [-34.90, -56.19], 'Paysandú': [-32.32, -58.08],
      'Río Negro': [-32.78, -57.45], 'Rivera': [-30.90, -55.55],
      'Rocha': [-34.48, -54.33], 'Salto': [-31.38, -57.96],
      'San José': [-34.33, -56.70], 'Tacuarembó': [-31.73, -55.98]
    };
    
    // Coordenadas de México
    const mexicoCoords: { [key: string]: L.LatLngExpression } = {
      'Aguascalientes': [21.88, -102.29], 'Baja California': [32.00, -115.50],
      'Baja California Sur': [25.50, -111.50], 'Campeche': [19.83, -90.53],
      'Chiapas': [16.75, -93.12], 'Chihuahua': [28.63, -106.07],
      'Ciudad de México': [19.43, -99.13], 'Coahuila': [27.06, -101.71],
      'Colima': [19.24, -103.72], 'Durango': [24.56, -104.66],
      'Estado de México': [19.35, -99.63], 'Guanajuato': [21.02, -101.26],
      'Guerrero': [17.55, -99.50], 'Hidalgo': [20.50, -98.50],
      'Jalisco': [20.66, -103.35], 'Michoacán': [19.70, -101.18],
      'Morelos': [18.80, -99.00], 'Nayarit': [21.50, -104.50],
      'Nuevo León': [25.68, -100.31], 'Oaxaca': [17.07, -96.72],
      'Puebla': [19.04, -98.21], 'Querétaro': [20.59, -100.39],
      'Quintana Roo': [19.50, -88.00], 'San Luis Potosí': [22.15, -100.98],
      'Sinaloa': [24.80, -107.40], 'Sonora': [29.00, -111.00],
      'Tabasco': [18.00, -92.50], 'Tamaulipas': [24.00, -98.50],
      'Tlaxcala': [19.31, -98.24], 'Veracruz': [19.17, -96.13],
      'Yucatán': [20.50, -89.00], 'Zacatecas': [22.77, -102.57]
    };
    
    // Coordenadas de Chile
    const chileCoords: { [key: string]: L.LatLngExpression } = {
      'Arica y Parinacota': [-18.48, -70.33], 'Tarapacá': [-20.22, -69.93],
      'Antofagasta': [-23.65, -70.40], 'Atacama': [-27.37, -70.33],
      'Coquimbo': [-29.95, -71.34], 'Valparaíso': [-33.05, -71.62],
      'Metropolitana': [-33.44, -70.65], 'O\'Higgins': [-34.17, -70.74],
      'Maule': [-35.43, -71.67], 'Ñuble': [-36.62, -71.96],
      'Biobío': [-36.83, -73.05], 'La Araucanía': [-38.74, -72.59],
      'Los Ríos': [-39.81, -73.24], 'Los Lagos': [-41.47, -72.94],
      'Aysén': [-45.57, -72.07], 'Magallanes': [-53.16, -70.91]
    };
    
    if (pais === 'Peru') return peruCoords[nombre] || null;
    if (pais === 'Colombia') return colombiaCoords[nombre] || null;
    if (pais === 'Uruguay') return uruguayCoords[nombre] || null;
    if (pais === 'Mexico') return mexicoCoords[nombre] || null;
    if (pais === 'Chile') return chileCoords[nombre] || null;
    
    return null;
  }

  private getColorByHours(horas: number): string {
    if (horas <= 20) return '#FFF5F5';
    if (horas <= 25) return '#FFD4D4';
    if (horas <= 30) return '#FFA8A8';
    if (horas <= 35) return '#FF8A8A';
    if (horas <= 40) return '#FF5252';
    if (horas <= 50) return '#FF0000';
    if (horas <= 60) return '#CC0000';
    return '#8B0000';
  }
}