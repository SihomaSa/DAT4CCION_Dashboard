# DAT4CCIÓN 2026 — Dashboard Cuidado No Remunerado
## Análisis territorial del trabajo no remunerado en 4 países de América Latina

**Equipo:** Yovany Romero Ramos · Shirley Sosa · Glisse Lisbeth Jorge Malca
**Evento:** DAT4CCIÓN 2026 · ONU Mujeres América Latina y el Caribe

---

## Estructura del proyecto

```
dashboard/
├── backend/
│   ├── main.py          ← API FastAPI con todos los datos ENUT
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── app.component.ts    ← Lógica Angular + Chart.js
    │   │   ├── app.component.html  ← Template del dashboard
    │   │   ├── app.component.scss  ← Estilos dark theme
    │   │   └── app.config.ts
    │   ├── main.ts
    │   ├── index.html
    │   └── styles.scss
    ├── angular.json
    ├── tsconfig.json
    └── package.json
```

---

## Instrucciones de instalación

### 1. Backend (Python + FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

La API estará disponible en: http://localhost:8000

Endpoints disponibles:
- GET /api/nacional          → datos de los 4 países
- GET /api/nacional/{pais}   → datos de un país específico
- GET /api/territorial/{pais}→ datos por región/departamento
- GET /api/valor-economico/{pais} → valor económico estimado
- GET /api/tipo-cuidado/{pais}    → actividades de cuidado (Perú)
- GET /api/comparativo       → tabla comparativa entre países
- GET /api/resumen           → indicadores regionales

### 2. Frontend (Angular 17)

```bash
cd frontend
npm install
ng serve
```

El dashboard estará disponible en: http://localhost:4200

---

## Funcionalidades del dashboard

- **Vista "Horas de cuidado":** Gráfico de barras por componente (doméstico vs cuidado directo vs total)
- **Vista "Tipo de cuidado":** Actividades específicas con barras comparativas M/H (Perú)
- **Vista "Valor económico":** Estimación económica del trabajo no remunerado en USD
- **Análisis territorial:** Gráfico horizontal de top regiones con mayor brecha (clic para ver detalle)
- **Panel lateral interactivo:** Estadísticas del país/región seleccionada con donut chart
- **Tabla comparativa:** Los 4 países en una sola vista
- **Selector de países:** Perú, Colombia, Uruguay, México

---

## Datos

Los datos provienen de los microdatos oficiales de:
- **Perú** — INEI ENUT 2024 (1,925,501 registros de actividades analizados)
- **Colombia** — DANE ENUT 2023 (69,087 personas 15+ años)
- **Uruguay** — INE ENUT 2022 (muestra representativa nacional)
- **México** — INEGI ENUT 2024 (37,449 mujeres / 31,638 hombres)

Metodología: Clasificación CAUTAL (3xx = doméstico, 4xx = cuidado)

---

## Resultados principales

| País      | Mujeres (hrs/sem) | Hombres (hrs/sem) | Brecha |
|-----------|-------------------|-------------------|--------|
| Perú      | 36.2              | 13.1              | 23.1   |
| Colombia  | 48.2              | 26.4              | 21.8   |
| Uruguay   | 30.1              | 14.2              | 15.9   |
| México    | 49.6              | 16.9              | 32.7   |
