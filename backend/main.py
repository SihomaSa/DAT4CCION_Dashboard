from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="DAT4CCIÓN - Cuidado No Remunerado API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DATOS REALES EXTRAÍDOS DEL NOTEBOOK ENUT 2024/2023/2022 ───

DATA_NACIONAL = {
    "peru": {
        "nombre": "Perú",
        "iso": "PE",
        "anio_enut": 2024,
        "fuente": "INEI",
        "mujeres_total": 36.2,
        "hombres_total": 13.1,
        "brecha": 23.1,
        "mujeres_domestico": 25.0,
        "hombres_domestico": 8.4,
        "mujeres_cuidado": 12.6,
        "hombres_cuidado": 4.7,
        "ratio": 2.8,
        "poblacion_analizada": "1.9M registros de actividades",
    },
    "colombia": {
        "nombre": "Colombia",
        "iso": "CO",
        "anio_enut": 2023,
        "fuente": "DANE",
        "mujeres_total": 48.2,
        "hombres_total": 26.4,
        "brecha": 21.8,
        "mujeres_domestico": 34.8,
        "hombres_domestico": 17.3,
        "mujeres_cuidado": 13.4,
        "hombres_cuidado": 9.1,
        "ratio": 1.8,
        "poblacion_analizada": "69,087 personas 15+ años",
    },
    "uruguay": {
        "nombre": "Uruguay",
        "iso": "UY",
        "anio_enut": 2022,
        "fuente": "INE",
        "mujeres_total": 30.1,
        "hombres_total": 14.2,
        "brecha": 15.9,
        "mujeres_domestico": 21.5,
        "hombres_domestico": 10.1,
        "mujeres_cuidado": 8.6,
        "hombres_cuidado": 4.1,
        "ratio": 2.1,
        "poblacion_analizada": "Muestra representativa nacional",
    },
    "mexico": {
        "nombre": "México",
        "iso": "MX",
        "anio_enut": 2024,
        "fuente": "INEGI",
        "mujeres_total": 49.6,
        "hombres_total": 16.9,
        "brecha": 32.7,
        "mujeres_domestico": 29.4,
        "hombres_domestico": 11.2,
        "mujeres_cuidado": 10.1,
        "hombres_cuidado": 5.7,
        "ratio": 2.9,
        "poblacion_analizada": "37,449 mujeres / 31,638 hombres",
    },
}

# Horas territorial por país (datos reales del notebook)
TERRITORIAL = {
    "uruguay": [
        {"nombre": "Río Negro", "mujeres": 35.4, "hombres": 8.7, "brecha": 26.7, "pct_mujeres": 80.3},
        {"nombre": "Paysandú", "mujeres": 27.8, "hombres": 7.5, "brecha": 20.3, "pct_mujeres": 78.8},
        {"nombre": "Salto", "mujeres": 32.5, "hombres": 10.4, "brecha": 22.1, "pct_mujeres": 75.8},
        {"nombre": "Flores", "mujeres": 29.0, "hombres": 9.4, "brecha": 19.6, "pct_mujeres": 75.5},
        {"nombre": "Rocha", "mujeres": 24.9, "hombres": 8.2, "brecha": 16.7, "pct_mujeres": 75.2},
        {"nombre": "Cerro Largo", "mujeres": 32.8, "hombres": 16.3, "brecha": 16.5, "pct_mujeres": 66.8},
        {"nombre": "Durazno", "mujeres": 26.2, "hombres": 11.6, "brecha": 14.7, "pct_mujeres": 69.3},
        {"nombre": "Colonia", "mujeres": 25.2, "hombres": 16.1, "brecha": 9.1, "pct_mujeres": 61.0},
        {"nombre": "Artigas", "mujeres": 25.4, "hombres": 15.3, "brecha": 10.1, "pct_mujeres": 62.4},
        {"nombre": "Canelones", "mujeres": 32.2, "hombres": 24.5, "brecha": 7.7, "pct_mujeres": 56.8},
    ],
    "colombia": [
        {"nombre": "Atlántico", "mujeres": 64.5, "hombres": 14.6, "brecha": 49.9, "pct_mujeres": 81.5},
        {"nombre": "Bolívar", "mujeres": 64.0, "hombres": 18.6, "brecha": 45.4, "pct_mujeres": 77.5},
        {"nombre": "Arauca", "mujeres": 57.9, "hombres": 14.3, "brecha": 43.6, "pct_mujeres": 80.2},
        {"nombre": "Amazonas", "mujeres": 48.2, "hombres": 13.5, "brecha": 34.7, "pct_mujeres": 78.1},
        {"nombre": "Antioquia", "mujeres": 47.8, "hombres": 15.5, "brecha": 32.3, "pct_mujeres": 75.5},
        {"nombre": "Cundinamarca", "mujeres": 45.3, "hombres": 18.2, "brecha": 27.1, "pct_mujeres": 71.3},
        {"nombre": "Valle del Cauca", "mujeres": 43.1, "hombres": 17.9, "brecha": 25.2, "pct_mujeres": 70.7},
        {"nombre": "Nariño", "mujeres": 41.6, "hombres": 19.4, "brecha": 22.2, "pct_mujeres": 68.2},
        {"nombre": "Bogotá D.C.", "mujeres": 38.4, "hombres": 21.3, "brecha": 17.1, "pct_mujeres": 64.3},
        {"nombre": "Santander", "mujeres": 36.2, "hombres": 22.1, "brecha": 14.1, "pct_mujeres": 62.1},
    ],
    "peru": [
        {"nombre": "Lima", "mujeres": 35.0, "hombres": 19.0, "brecha": 16.0, "pct_mujeres": 64.8},
        {"nombre": "Arequipa", "mujeres": 38.2, "hombres": 16.4, "brecha": 21.8, "pct_mujeres": 70.0},
        {"nombre": "Cusco", "mujeres": 41.5, "hombres": 14.2, "brecha": 27.3, "pct_mujeres": 74.5},
        {"nombre": "Puno", "mujeres": 43.8, "hombres": 12.9, "brecha": 30.9, "pct_mujeres": 77.2},
        {"nombre": "Junín", "mujeres": 39.6, "hombres": 15.1, "brecha": 24.5, "pct_mujeres": 72.4},
        {"nombre": "Piura", "mujeres": 37.4, "hombres": 13.8, "brecha": 23.6, "pct_mujeres": 73.1},
        {"nombre": "La Libertad", "mujeres": 36.9, "hombres": 14.5, "brecha": 22.4, "pct_mujeres": 71.8},
        {"nombre": "Cajamarca", "mujeres": 44.2, "hombres": 11.7, "brecha": 32.5, "pct_mujeres": 79.1},
        {"nombre": "Loreto", "mujeres": 40.3, "hombres": 13.3, "brecha": 27.0, "pct_mujeres": 75.2},
        {"nombre": "Ancash", "mujeres": 38.8, "hombres": 14.9, "brecha": 23.9, "pct_mujeres": 72.3},
    ],
    "mexico": [
        {"nombre": "Ciudad de México", "mujeres": 42.3, "hombres": 18.4, "brecha": 23.9, "pct_mujeres": 69.7},
        {"nombre": "Oaxaca", "mujeres": 58.4, "hombres": 12.3, "brecha": 46.1, "pct_mujeres": 82.6},
        {"nombre": "Chiapas", "mujeres": 60.2, "hombres": 11.8, "brecha": 48.4, "pct_mujeres": 83.6},
        {"nombre": "Guerrero", "mujeres": 56.7, "hombres": 13.1, "brecha": 43.6, "pct_mujeres": 81.2},
        {"nombre": "Veracruz", "mujeres": 52.3, "hombres": 14.7, "brecha": 37.6, "pct_mujeres": 78.1},
        {"nombre": "Jalisco", "mujeres": 47.8, "hombres": 17.2, "brecha": 30.6, "pct_mujeres": 73.5},
        {"nombre": "Nuevo León", "mujeres": 45.1, "hombres": 19.8, "brecha": 25.3, "pct_mujeres": 69.5},
        {"nombre": "Sonora", "mujeres": 44.6, "hombres": 20.1, "brecha": 24.5, "pct_mujeres": 68.9},
        {"nombre": "Coahuila", "mujeres": 43.2, "hombres": 21.4, "brecha": 21.8, "pct_mujeres": 66.9},
        {"nombre": "Aguascalientes", "mujeres": 41.5, "hombres": 22.3, "brecha": 19.2, "pct_mujeres": 65.1},
    ],
}

# Valor económico estimado (salario mínimo por hora × horas no remuneradas × 52 semanas)
VALOR_ECONOMICO = {
    "peru": {
        "salario_hora_usd": 1.85,
        "valor_anual_mujeres_usd": 3480,
        "valor_anual_hombres_usd": 1260,
        "pct_pbi": 14.2,
        "nota": "Basado en RMV Perú S/1,025 (2024)"
    },
    "colombia": {
        "salario_hora_usd": 1.56,
        "valor_anual_mujeres_usd": 3912,
        "valor_anual_hombres_usd": 2143,
        "pct_pbi": 19.8,
        "nota": "Basado en salario mínimo COP 1,300,000 (2023)"
    },
    "uruguay": {
        "salario_hora_usd": 3.21,
        "valor_anual_mujeres_usd": 5021,
        "valor_anual_hombres_usd": 2368,
        "pct_pbi": 22.1,
        "nota": "Basado en salario mínimo UYU 22,268 (2022)"
    },
    "mexico": {
        "salario_hora_usd": 1.12,
        "valor_anual_mujeres_usd": 2890,
        "valor_anual_hombres_usd": 984,
        "pct_pbi": 16.5,
        "nota": "Basado en salario mínimo MXN 207.44/día (2024)"
    },
}

# Tipo de cuidado (actividades específicas Perú - top del notebook)
TIPO_CUIDADO = {
    "peru": [
        {"actividad": "Preparación y servicio de alimentos", "mujeres": 9.8, "hombres": 2.4, "codigo": "3xx"},
        {"actividad": "Limpieza de la vivienda", "mujeres": 6.2, "hombres": 1.8, "codigo": "3xx"},
        {"actividad": "Cuidado de niños 0-5 años", "mujeres": 5.3, "hombres": 1.9, "codigo": "4xx"},
        {"actividad": "Cuidado de niños 6-14 años", "mujeres": 3.8, "hombres": 1.6, "codigo": "4xx"},
        {"actividad": "Lavado y cuidado de ropa", "mujeres": 4.1, "hombres": 0.6, "codigo": "3xx"},
        {"actividad": "Compras para el hogar", "mujeres": 2.8, "hombres": 1.4, "codigo": "3xx"},
        {"actividad": "Cuidado de adultos mayores", "mujeres": 2.1, "hombres": 0.7, "codigo": "4xx"},
        {"actividad": "Mantenimiento del hogar", "mujeres": 0.8, "hombres": 2.6, "codigo": "3xx"},
        {"actividad": "Trámites del hogar", "mujeres": 1.3, "hombres": 1.5, "codigo": "3xx"},
        {"actividad": "Cuidado de personas con discapacidad", "mujeres": 1.2, "hombres": 0.5, "codigo": "4xx"},
    ]
}


@app.get("/")
def root():
    return {"mensaje": "API DAT4CCIÓN 2026 - Cuidado No Remunerado en América Latina"}


@app.get("/api/paises")
def get_paises():
    return list(DATA_NACIONAL.keys())


@app.get("/api/nacional")
def get_todos_nacional():
    return DATA_NACIONAL


@app.get("/api/nacional/{pais}")
def get_nacional(pais: str):
    if pais not in DATA_NACIONAL:
        return JSONResponse(status_code=404, content={"error": f"País '{pais}' no encontrado"})
    return DATA_NACIONAL[pais]


@app.get("/api/territorial/{pais}")
def get_territorial(pais: str):
    if pais not in TERRITORIAL:
        return JSONResponse(status_code=404, content={"error": f"País '{pais}' no encontrado"})
    return sorted(TERRITORIAL[pais], key=lambda x: x["brecha"], reverse=True)


@app.get("/api/valor-economico/{pais}")
def get_valor_economico(pais: str):
    if pais not in VALOR_ECONOMICO:
        return JSONResponse(status_code=404, content={"error": f"País '{pais}' no encontrado"})
    return {**VALOR_ECONOMICO[pais], **{"pais": DATA_NACIONAL[pais]["nombre"]}}


@app.get("/api/tipo-cuidado/{pais}")
def get_tipo_cuidado(pais: str):
    if pais not in TIPO_CUIDADO:
        return JSONResponse(
            status_code=404,
            content={"error": f"Datos de tipo de cuidado no disponibles para '{pais}'. Disponible: peru"}
        )
    return TIPO_CUIDADO[pais]


@app.get("/api/comparativo")
def get_comparativo():
    return [
        {
            "pais": v["nombre"],
            "iso": v["iso"],
            "mujeres": v["mujeres_total"],
            "hombres": v["hombres_total"],
            "brecha": v["brecha"],
            "ratio": v["ratio"],
            "anio": v["anio_enut"],
            "fuente": v["fuente"],
        }
        for v in DATA_NACIONAL.values()
    ]


@app.get("/api/resumen")
def get_resumen():
    brechas = [v["brecha"] for v in DATA_NACIONAL.values()]
    mujeres = [v["mujeres_total"] for v in DATA_NACIONAL.values()]
    return {
        "promedio_brecha_regional": round(sum(brechas) / len(brechas), 1),
        "max_brecha": max(brechas),
        "min_brecha": min(brechas),
        "promedio_horas_mujeres": round(sum(mujeres) / len(mujeres), 1),
        "paises_analizados": 4,
        "metodologia": "Encuestas Nacionales de Uso del Tiempo (ENUT) + clasificación CAUTAL",
    }
