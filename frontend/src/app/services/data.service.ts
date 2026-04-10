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
    map(data => Object.keys(data).filter(key => key !== 'Latam')) // Excluir Latam
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
    if (horas <= 20) return 'Menos de 20 hrs/sem';
    if (horas <= 25) return '20-25 hrs/sem';
    if (horas <= 30) return '26-30 hrs/sem';
    if (horas <= 35) return '31-35 hrs/sem';
    if (horas <= 40) return '36-40 hrs/sem';
    if (horas <= 50) return '41-50 hrs/sem';
    if (horas <= 60) return '51-60 hrs/sem';
    return 'Más de 60 hrs/sem';
    }

    getColorPorRango(horas: number): string {
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