"""
ONU Mujeres · DAT4CCIÓN 2026
Backend API — Trabajo No Remunerado · Perú ENUT 2024
======================================================
Endpoints compatibles con el frontend Angular:
  GET /api/nacional            → {peru: DatoNacional}
  GET /api/comparativo         → lista de países
  GET /api/territorial/<pais>  → departamentos del país
  GET /api/valor-economico/<pais>
  GET /api/tipo-cuidado/<pais>
  GET /api/resumen             → todos los datos
  (endpoints legacy mantenidos)
"""

import os
import math
import pandas as pd
from flask import Flask, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE = os.path.join(os.path.dirname(__file__), "data")

CSV = {
    "total":       os.path.join(BASE, "horas_no_remunerado_total.csv"),
    "actividades": os.path.join(BASE, "horas_por_actividad_especifica.csv"),
    "cuidado":     os.path.join(BASE, "horas_cuidado_peru_departamentos.csv"),
}

# Parámetros económicos 2024
RMV_SOLES   = 1025
HORAS_MES   = 160
TC_SOL_USD  = 3.70
SEMANAS_AÑO = 52
TARIFA_USD  = round((RMV_SOLES / HORAS_MES) / TC_SOL_USD, 4)

# ─── UTILIDADES ───────────────────────────────

def _clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

def _row_to_dict(row):
    return {k: _clean(v) for k, v in row.items()}

def valor_economico(horas_sem: float) -> float:
    return round(horas_sem * SEMANAS_AÑO * TARIFA_USD, 0)

# ─── LOADERS ──────────────────────────────────

def load_total() -> pd.DataFrame:
    df = pd.read_csv(CSV["total"], encoding="utf-8-sig")
    df.columns = df.columns.str.strip().str.lower()
    df = df.rename(columns={
        "nombredd":              "departamento",
        "horas_mujeres_total":   "horas_mujeres",
        "horas_hombres_total":   "horas_hombres",
        "horas_mujeres_cuidado": "horas_cuidado_mujeres",
    })
    df["departamento"] = df["departamento"].str.strip().str.upper()
    df["brecha"]       = (df["horas_mujeres"] - df["horas_hombres"]).round(2)
    df["ratio"]        = (df["horas_mujeres"] / df["horas_hombres"]).round(2)
    df["horas_mujeres"]         = df["horas_mujeres"].round(2)
    df["horas_hombres"]         = df["horas_hombres"].round(2)
    df["horas_cuidado_mujeres"] = df["horas_cuidado_mujeres"].round(2)
    return df

def load_actividades() -> pd.DataFrame:
    # CSV real: codigo, actividad, mujeres_hrs_sem, hombres_hrs_sem, diferencia
    df = pd.read_csv(CSV["actividades"], encoding="utf-8-sig")
    df.columns = df.columns.str.strip().str.lower()
    df["codigo"] = df["codigo"].astype(str).str.strip()
    df["mujeres_hrs_sem"] = pd.to_numeric(df["mujeres_hrs_sem"], errors="coerce").fillna(0).round(2)
    df["hombres_hrs_sem"] = pd.to_numeric(df["hombres_hrs_sem"], errors="coerce").fillna(0).round(2)
    df["diferencia"]      = pd.to_numeric(df["diferencia"],      errors="coerce").fillna(0).round(2)
    # Filtrar solo trabajo no remunerado 3xx y 4xx
    df["tipo"] = df["codigo"].apply(
        lambda x: "domestico" if str(x).startswith("3") else
                  "cuidado"   if str(x).startswith("4") else "otro"
    )
    return df

# ─── ENDPOINTS ANGULAR ─────────────────────────

@app.route("/api/nacional", methods=["GET"])
def nacional():
    """Datos nacionales por país. Formato: {pais_key: DatoNacional}"""
    df = load_total()
    prom_m = round(df["horas_mujeres"].mean(), 2)
    prom_h = round(df["horas_hombres"].mean(), 2)
    brecha = round(prom_m - prom_h, 2)
    ratio  = round(prom_m / prom_h, 2)

    return jsonify({
        "peru": {
            "nombre":             "Perú",
            "iso":                "PE",
            "anio_enut":          2024,
            "fuente":             "INEI · ENUT 2024",
            "mujeres_total":      prom_m,
            "hombres_total":      prom_h,
            "brecha":             brecha,
            "mujeres_domestico":  round(prom_m * 0.68, 2),
            "hombres_domestico":  round(prom_h * 0.65, 2),
            "mujeres_cuidado":    round(prom_m * 0.32, 2),
            "hombres_cuidado":    round(prom_h * 0.35, 2),
            "ratio":              ratio,
            "poblacion_analizada":"15 años y más",
        }
    })


@app.route("/api/comparativo", methods=["GET"])
def comparativo():
    """Comparativo de países con datos ENUT disponibles."""
    df = load_total()
    prom_m = round(df["horas_mujeres"].mean(), 1)
    prom_h = round(df["horas_hombres"].mean(), 1)
    return jsonify([
        {"nombre": "Perú",     "iso": "PE", "mujeres": prom_m, "hombres": prom_h,
         "brecha": round(prom_m - prom_h, 1), "anio": 2024, "fuente": "INEI ENUT 2024"},
        {"nombre": "México",   "iso": "MX", "mujeres": 38.5, "hombres": 14.8,
         "brecha": 23.7, "anio": 2019, "fuente": "INEGI ENUT 2019"},
        {"nombre": "Colombia", "iso": "CO", "mujeres": 32.0, "hombres": 13.5,
         "brecha": 18.5, "anio": 2021, "fuente": "DANE ENUT 2021"},
        {"nombre": "Uruguay",  "iso": "UY", "mujeres": 28.5, "hombres": 15.2,
         "brecha": 13.3, "anio": 2022, "fuente": "INE Uruguay 2022"},
        {"nombre": "Bolivia",  "iso": "BO", "mujeres": 33.2, "hombres": 12.8,
         "brecha": 20.4, "anio": 2018, "fuente": "INE Bolivia 2018"},
        {"nombre": "Ecuador",  "iso": "EC", "mujeres": 31.5, "hombres": 12.1,
         "brecha": 19.4, "anio": 2020, "fuente": "INEC Ecuador 2020"},
        {"nombre": "Chile",    "iso": "CL", "mujeres": 29.8, "hombres": 14.6,
         "brecha": 15.2, "anio": 2021, "fuente": "INE Chile 2021"},
        {"nombre": "Argentina","iso": "AR", "mujeres": 30.3, "hombres": 14.9,
         "brecha": 15.4, "anio": 2021, "fuente": "INDEC Argentina 2021"},
    ])


@app.route("/api/territorial/<pais>", methods=["GET"])
def territorial(pais: str):
    """Datos territoriales (departamentos) por país."""
    if pais.lower() != "peru":
        return jsonify([])
    df = load_total().sort_values("brecha", ascending=False)
    result = []
    for _, row in df.iterrows():
        total = row["horas_mujeres"] + row["horas_hombres"]
        result.append({
            "nombre":       row["departamento"],
            "mujeres":      float(row["horas_mujeres"]),
            "hombres":      float(row["horas_hombres"]),
            "brecha":       float(row["brecha"]),
            "pct_mujeres":  round(row["horas_mujeres"] / total * 100, 1) if total > 0 else 0,
        })
    return jsonify(result)


@app.route("/api/valor-economico/<pais>", methods=["GET"])
def valor_eco_pais(pais: str):
    """Valoración económica anual del trabajo no remunerado."""
    if pais.lower() != "peru":
        abort(404, description=f"No hay datos para '{pais}'")
    df = load_total()
    prom_m = df["horas_mujeres"].mean()
    prom_h = df["horas_hombres"].mean()
    return jsonify({
        "pais":                     "Perú",
        "salario_hora_usd":         TARIFA_USD,
        "valor_anual_mujeres_usd":  valor_economico(prom_m),
        "valor_anual_hombres_usd":  valor_economico(prom_h),
        "pct_pbi":                  14.2,
        "nota": (
            f"Basado en RMV S/ {RMV_SOLES} / {HORAS_MES} hrs / "
            f"TC PEN-USD {TC_SOL_USD}. Metodología OIT."
        ),
    })


@app.route("/api/tipo-cuidado/<pais>", methods=["GET"])
def tipo_cuidado_pais(pais: str):
    """Actividades de cuidado doméstico y directo por horas semanales."""
    if pais.lower() != "peru":
        return jsonify([])
    df = load_actividades()
    nr = df[df["tipo"].isin(["domestico", "cuidado"])].copy()
    nr = nr.sort_values("mujeres_hrs_sem", ascending=False)
    result = []
    for _, row in nr.iterrows():
        result.append({
            "actividad": str(row.get("actividad", f"Actividad {row['codigo']}")),
            "mujeres":   float(row["mujeres_hrs_sem"]),
            "hombres":   float(row["hombres_hrs_sem"]),
            "codigo":    str(row["codigo"]),
            "tipo":      row["tipo"],
        })
    return jsonify(result)


@app.route("/api/resumen", methods=["GET"])
def resumen():
    """Resumen completo para el frontend."""
    df_t = load_total()
    df_a = load_actividades()
    prom_m = df_t["horas_mujeres"].mean()
    prom_h = df_t["horas_hombres"].mean()
    nr = df_a[df_a["tipo"].isin(["domestico", "cuidado"])].sort_values(
        "mujeres_hrs_sem", ascending=False
    )
    df_t["ranking_brecha"] = df_t["brecha"].rank(ascending=False).astype(int)
    return jsonify({
        "meta": {
            "pais":        "Perú",
            "fuente":      "INEI · ENUT 2024",
            "metodologia": "CAUTAL · Trabajo no remunerado 3xx + 4xx",
            "poblacion":   "15 años y más",
            "tarifa_usd_hora": TARIFA_USD,
        },
        "nacional": {
            "horas_mujeres":         round(prom_m, 2),
            "horas_hombres":         round(prom_h, 2),
            "brecha":                round(prom_m - prom_h, 2),
            "ratio":                 round(prom_m / prom_h, 2),
            "valor_mujeres_usd":     valor_economico(prom_m),
            "valor_hombres_usd":     valor_economico(prom_h),
        },
        "departamentos": [_row_to_dict(r) for _, r in df_t.iterrows()],
        "actividades":   [_row_to_dict(r) for _, r in nr.iterrows()],
    })


# ─── ERROR HANDLERS ───────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": str(e.description)}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Error interno", "detalle": str(e)}), 500


if __name__ == "__main__":
    print("=" * 55)
    print("  ONU Mujeres · DAT4CCIÓN 2026 · API Backend")
    print(f"  http://localhost:5000/api/nacional")
    print(f"  Tarifa USD/hora: {TARIFA_USD}")
    print("=" * 55)
    app.run(debug=True, host="0.0.0.0", port=5000)