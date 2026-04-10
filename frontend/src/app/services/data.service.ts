import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UnidadTerritorial {
  nombre: string;
  horas_mujeres: number;
  horas_hombres: number;
  valor?: number;
}

export interface PaisData {
  [pais: string]: {
    unidades: UnidadTerritorial[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private dataUrl = 'assets/data/latam_data.json';
  private cachedData: PaisData | null = null;

  constructor(private http: HttpClient) {}

  getData(): Observable<PaisData> {
    if (this.cachedData) {
      return of(this.cachedData);
    }
    return this.http.get<PaisData>(this.dataUrl).pipe(
      map(data => {
        this.cachedData = data;
        return data;
      })
    );
  }

  getPaises(): Observable<string[]> {
    return this.getData().pipe(
      map(data => Object.keys(data))
    );
  }

  getDataByPais(pais: string, sexo: 'mujeres' | 'hombres'): Observable<UnidadTerritorial[]> {
    return this.getData().pipe(
      map(data => {
        const paisInfo = data[pais];
        if (!paisInfo) return [];
        
        return paisInfo.unidades.map(unidad => ({
          nombre: unidad.nombre,
          horas_mujeres: unidad.horas_mujeres,
          horas_hombres: unidad.horas_hombres,
          valor: sexo === 'mujeres' ? unidad.horas_mujeres : unidad.horas_hombres
        } as UnidadTerritorial));
      })
    );
  }

  getRangoHoras(horas: number): string {
    if (horas <= 30) return '26-30 hrs/sem';
    if (horas <= 37) return '31-37 hrs/sem';
    if (horas <= 45) return '38-45 hrs/sem';
    if (horas <= 55) return '46-55 hrs/sem';
    return 'Más de 55 hrs/sem';
  }

  getColorPorRango(horas: number): string {
    if (horas <= 30) return '#FFD4D4';
    if (horas <= 37) return '#FF8A8A';
    if (horas <= 45) return '#FF5252';
    if (horas <= 55) return '#FF0000';
    return '#8B0000';
  }
}