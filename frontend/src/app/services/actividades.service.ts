import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Actividad {
  codigo: string;
  actividad: string;
  mujeres_hrs_sem: number;
  hombres_hrs_sem: number;
  diferencia: number;
  categoria: string;
  subcategoria: string;
  pais: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActividadesService {
  private dataUrl = 'assets/data/actividades_no_remuneradas.json';

  constructor(private http: HttpClient) {}

  getActividades(): Observable<Actividad[]> {
    return this.http.get<Actividad[]>(this.dataUrl);
  }

  getActividadesPorPais(pais: string): Observable<Actividad[]> {
    return this.getActividades().pipe(
      map(actividades => actividades.filter(a => a.pais === pais))
    );
  }

  getPaisesDisponibles(): Observable<string[]> {
    return this.getActividades().pipe(
      map(actividades => {
        const paises = new Set(actividades.map(a => a.pais));
        return Array.from(paises);
      })
    );
  }

  getTopActividades(actividades: Actividad[], sexo: 'mujeres' | 'hombres', limit: number = 15): Actividad[] {
    return [...actividades]
      .sort((a, b) => {
        const valA = sexo === 'mujeres' ? a.mujeres_hrs_sem : a.hombres_hrs_sem;
        const valB = sexo === 'mujeres' ? b.mujeres_hrs_sem : b.hombres_hrs_sem;
        return valB - valA;
      })
      .slice(0, limit);
  }

  getTopBrecha(actividades: Actividad[], limit: number = 15): Actividad[] {
    return [...actividades]
      .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia))
      .slice(0, limit);
  }

  getCategorias(actividades: Actividad[]): { categoria: string; total_mujeres: number; total_hombres: number }[] {
    const categorias = new Map<string, { mujeres: number; hombres: number }>();
    
    actividades.forEach(act => {
      const cat = act.categoria;
      if (!categorias.has(cat)) {
        categorias.set(cat, { mujeres: 0, hombres: 0 });
      }
      const current = categorias.get(cat)!;
      current.mujeres += act.mujeres_hrs_sem;
      current.hombres += act.hombres_hrs_sem;
    });
    
    return Array.from(categorias.entries()).map(([categoria, valores]) => ({
      categoria,
      total_mujeres: valores.mujeres,
      total_hombres: valores.hombres
    }));
  }
}