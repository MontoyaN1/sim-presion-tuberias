#!/usr/bin/env python3
"""Contraste independiente del modelo acustoelastico en Python.

Replica el generador aleatorio y las ecuaciones del proyecto TypeScript,
compara contra validation/ts_results.json y produce las figuras del informe.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

GEOMETRY = {"innerRadius": 0.1, "wallThickness": 0.005, "length": 1.0}
MATERIAL = {
    "id": "steel",
    "youngModulus": 200e9,
    "poisson": 0.3,
    "density": 7850,
    "acoustoelastic": -1.0e-10,
}
FLUIDS = {
    "water": {
        "id": "water",
        "name": "Agua",
        "phase": "liquid",
        "density": 1000.0,
        "viscosity": 1.0e-3,
        "color": "#3b82f6",
    },
    "crude": {
        "id": "crude",
        "name": "Crudo",
        "phase": "liquid",
        "density": 900.0,
        "viscosity": 5.0e-2,
        "color": "#b45309",
    },
    "hydrogen": {
        "id": "hydrogen",
        "name": "Hidrogeno",
        "phase": "gas",
        "density": 0.0899,
        "viscosity": 8.9e-6,
        "molarMass": 2.016e-3,
        "color": "#22c55e",
    },
}

GAS_CONSTANT = 8.314462618
DEFAULT_TEMPERATURE = 300.0

P1 = 10e6
P2 = 8e6
SECTION = 0.5
TRIALS = 500
TOF_NOISE = 0.0005
ALPHA_TOLERANCE = 0.02
C0_TOLERANCE = 0.0002
SEED = 12345
TEMPERATURE = 300.0


class Lcg:
    def __init__(self, seed: int = 12345) -> None:
        self.state = seed & 0xFFFFFFFF

    def next(self) -> float:
        self.state = (1664525 * self.state + 1013904223) & 0xFFFFFFFF
        return self.state / 4294967296.0


def gaussian(rng: Lcg) -> float:
    u1 = max(rng.next(), 1e-12)
    u2 = rng.next()
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)


def hoop_stress(pressure: float) -> float:
    return pressure * GEOMETRY["innerRadius"] / GEOMETRY["wallThickness"]


def reference_wave_speed() -> float:
    return math.sqrt(MATERIAL["youngModulus"] / MATERIAL["density"])


def wave_speed_at_pressure(pressure: float) -> float:
    return reference_wave_speed() * (
        1.0 + MATERIAL["acoustoelastic"] * hoop_stress(pressure)
    )


def linear_pressure(p1: float, p2: float, x: float) -> float:
    return p1 - (x / GEOMETRY["length"]) * (p1 - p2)


def gas_pressure(p1: float, p2: float, x: float) -> float:
    p1sq = p1 * p1
    p2sq = p2 * p2
    return math.sqrt(p1sq - (x / GEOMETRY["length"]) * (p1sq - p2sq))


def pressure_at_section(fluid: dict, p1: float, p2: float, x: float) -> float:
    if fluid["phase"] == "gas":
        return gas_pressure(p1, p2, x)
    return linear_pressure(p1, p2, x)


def model_comparison(fluid: dict, p1: float, p2: float, x: float) -> dict:
    true_pressure = pressure_at_section(fluid, p1, p2, x)
    incompressible = linear_pressure(p1, p2, x)
    return {
        "truePressure": true_pressure,
        "incompressiblePressure": incompressible,
        "modelError": true_pressure - incompressible,
    }


def hagen_poiseuille(fluid: dict, pressure_drop: float) -> dict:
    radius = GEOMETRY["innerRadius"]
    area = math.pi * radius * radius
    volumetric = (
        math.pi * radius**4 * pressure_drop / (8.0 * fluid["viscosity"] * GEOMETRY["length"])
    )
    mean_velocity = volumetric / area
    diameter = 2.0 * radius
    reynolds = fluid["density"] * mean_velocity * diameter / fluid["viscosity"]
    return {
        "pressureDrop": pressure_drop,
        "volumetricFlow": volumetric,
        "meanVelocity": mean_velocity,
        "maxVelocity": 2.0 * mean_velocity,
        "reynolds": reynolds,
        "laminar": reynolds < 2300.0,
        "model": "hagen-poiseuille",
    }


def compressible_mass_flow(fluid: dict, p1: float, p2: float, temperature: float) -> float:
    diameter = 2.0 * GEOMETRY["innerRadius"]
    molar_mass = fluid.get("molarMass", 2.016e-3)
    return (
        math.pi
        * diameter**4
        / (256.0 * fluid["viscosity"] * GEOMETRY["length"])
        * (molar_mass / (GAS_CONSTANT * temperature))
        * (p1 * p1 - p2 * p2)
    )


def gas_flow(fluid: dict, p1: float, p2: float, temperature: float) -> dict:
    mass_flow = compressible_mass_flow(fluid, p1, p2, temperature)
    molar_mass = fluid.get("molarMass", 2.016e-3)
    mean_pressure = 0.5 * (p1 + p2)
    mean_density = mean_pressure * molar_mass / (GAS_CONSTANT * temperature)
    volumetric = mass_flow / mean_density
    area = math.pi * GEOMETRY["innerRadius"] ** 2
    mean_velocity = volumetric / area
    diameter = 2.0 * GEOMETRY["innerRadius"]
    reynolds = mean_density * mean_velocity * diameter / fluid["viscosity"]
    return {
        "pressureDrop": p1 - p2,
        "volumetricFlow": volumetric,
        "meanVelocity": mean_velocity,
        "maxVelocity": 2.0 * mean_velocity,
        "reynolds": reynolds,
        "laminar": reynolds < 2300.0,
        "model": "compressible-isothermal",
    }


def flow_state(fluid: dict, p1: float, p2: float, temperature: float) -> dict:
    if fluid["phase"] == "gas":
        return gas_flow(fluid, p1, p2, temperature)
    return hagen_poiseuille(fluid, p1 - p2)


def measure_pressure(
    true_pressure: float,
    tof_noise: float,
    alpha_uncertainty: float,
    c0_uncertainty: float,
    rng: Lcg,
) -> dict:
    c_true = wave_speed_at_pressure(true_pressure)
    tof_true = GEOMETRY["length"] / c_true
    tof = tof_true * (1.0 + tof_noise * gaussian(rng))
    c_measured = GEOMETRY["length"] / tof
    alpha = MATERIAL["acoustoelastic"] * (1.0 + alpha_uncertainty * gaussian(rng))
    c0 = reference_wave_speed() * (1.0 + c0_uncertainty * gaussian(rng))
    estimated = (
        GEOMETRY["wallThickness"]
        / (alpha * GEOMETRY["innerRadius"])
        * (c_measured / c0 - 1.0)
    )
    error = estimated - true_pressure
    return {
        "truePressure": true_pressure,
        "tof": tof,
        "waveSpeed": c_measured,
        "estimatedPressure": estimated,
        "error": error,
        "relativeError": 0.0 if true_pressure == 0 else error / true_pressure,
    }


def run_monte_carlo(
    pressure: float,
    trials: int,
    tof_noise: float,
    alpha_uncertainty: float,
    c0_uncertainty: float,
    seed: int = 12345,
) -> dict:
    rng = Lcg(seed)
    estimates = [
        measure_pressure(pressure, tof_noise, alpha_uncertainty, c0_uncertainty, rng)[
            "estimatedPressure"
        ]
        for _ in range(trials)
    ]
    mean = sum(estimates) / trials
    std = (
        math.sqrt(sum((value - mean) ** 2 for value in estimates) / (trials - 1))
        if trials > 1
        else 0.0
    )
    bias = mean - pressure
    rmse = math.sqrt(sum((value - pressure) ** 2 for value in estimates) / trials)
    mae = sum(abs(value - pressure) for value in estimates) / trials
    return {
        "truePressure": pressure,
        "mean": mean,
        "std": std,
        "bias": bias,
        "rmse": rmse,
        "mae": mae,
        "ci95": 1.96 * std,
        "relativeError": 0.0 if pressure == 0 else bias / pressure,
    }


def sample_estimates(
    pressure: float,
    trials: int,
    tof_noise: float,
    alpha_uncertainty: float,
    c0_uncertainty: float,
    seed: int = 12345,
) -> list[float]:
    rng = Lcg(seed)
    return [
        measure_pressure(pressure, tof_noise, alpha_uncertainty, c0_uncertainty, rng)[
            "estimatedPressure"
        ]
        for _ in range(trials)
    ]


def validate_fluid(fluid_id: str, trials: int, seed: int) -> dict:
    fluid = FLUIDS[fluid_id]
    comparison = model_comparison(fluid, P1, P2, SECTION * GEOMETRY["length"])
    stats = run_monte_carlo(
        comparison["truePressure"],
        trials,
        TOF_NOISE,
        ALPHA_TOLERANCE,
        C0_TOLERANCE,
        seed,
    )
    flow = flow_state(fluid, P1, P2, TEMPERATURE)
    return {
        "id": fluid_id,
        "name": fluid["name"],
        "truePressure": comparison["truePressure"],
        "estimatedPressure": stats["mean"],
        "stats": stats,
        "modelError": comparison["modelError"],
        "totalError": stats["bias"] + comparison["modelError"],
        "flow": flow,
    }


def error_budget(pressure: float, noise: float) -> tuple[list[tuple[str, float]], float]:
    gain = abs(MATERIAL["acoustoelastic"] * hoop_stress(pressure))
    reference_tolerance = C0_TOLERANCE
    dispersion_tolerance = 0.00002

    if gain == 0.0:
        phases = [
            ("Mecanica", 0.0),
            ("Acustoelastica", reference_tolerance),
            ("Propagacion", dispersion_tolerance),
            ("Deteccion", noise),
            ("Inversion", 0.0),
        ]
        return phases, reference_tolerance + dispersion_tolerance + noise

    stress_to_speed = gain / (1.0 - gain)
    mechanical = stress_to_speed * math.sqrt(0.005**2 + 0.001**2 + 0.002**2)
    acoustic = math.sqrt((stress_to_speed * ALPHA_TOLERANCE) ** 2 + reference_tolerance**2)
    propagation = dispersion_tolerance
    detection = noise
    total_speed = mechanical + acoustic + propagation + detection
    inverted = total_speed / gain
    phases = [
        ("Mecanica", mechanical),
        ("Acustoelastica", acoustic),
        ("Propagacion", propagation),
        ("Deteccion", detection),
        ("Inversion", inverted - total_speed),
    ]
    return phases, inverted


def relative_difference(a: float, b: float) -> float:
    denominator = max(abs(a), abs(b))
    if denominator < 1e-15:
        return abs(a - b)
    return abs(a - b) / denominator


def get_path(data: dict, path: str) -> object:
    current: object = data
    for part in path.split("."):
        if not isinstance(current, dict):
            raise KeyError(path)
        current = current[part]
    return current


def compare_with_typescript(python_results: list[dict]) -> dict:
    target = HERE / "ts_results.json"
    if not target.exists():
        return {
            "available": False,
            "passed": False,
            "maxRelativeDifference": None,
            "details": [],
            "message": "Falta validation/ts_results.json; ejecuta npm test para generarlo.",
        }

    typescript = json.loads(target.read_text(encoding="utf-8"))
    numeric_fields = [
        "truePressure",
        "estimatedPressure",
        "stats.mean",
        "stats.std",
        "stats.bias",
        "stats.rmse",
        "stats.mae",
        "stats.ci95",
        "modelError",
        "totalError",
        "flow.reynolds",
    ]

    details: list[dict] = []
    max_difference = 0.0
    for fluid in typescript["fluids"]:
        python_fluid = next(item for item in python_results if item["id"] == fluid["id"])
        for field in numeric_fields:
            ts_value = float(get_path(fluid, field))
            py_value = float(get_path(python_fluid, field))
            difference = relative_difference(ts_value, py_value)
            max_difference = max(max_difference, difference)
            details.append(
                {
                    "fluid": fluid["id"],
                    "field": field,
                    "typescript": ts_value,
                    "python": py_value,
                    "relativeDifference": difference,
                }
            )
        for field in ("flow.laminar", "flow.model"):
            ts_value = get_path(fluid, field)
            py_value = get_path(python_fluid, field)
            details.append(
                {
                    "fluid": fluid["id"],
                    "field": field,
                    "typescript": ts_value,
                    "python": py_value,
                    "equal": ts_value == py_value,
                }
            )

    booleans_match = all(item.get("equal", True) for item in details)
    passed = max_difference < 1e-6 and booleans_match
    return {
        "available": True,
        "passed": passed,
        "maxRelativeDifference": max_difference,
        "details": details,
        "message": "OK" if passed else "Discrepancia superior a 1e-6",
    }


def configure_style() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": "white",
            "savefig.facecolor": "white",
            "axes.facecolor": "white",
            "axes.edgecolor": "#cbd5e1",
            "axes.labelcolor": "#0f172a",
            "axes.titlecolor": "#0f172a",
            "axes.grid": True,
            "grid.color": "#e2e8f0",
            "grid.linestyle": "--",
            "grid.linewidth": 0.6,
            "text.color": "#0f172a",
            "xtick.color": "#475569",
            "ytick.color": "#475569",
            "font.size": 10,
            "legend.frameon": False,
        }
    )


def figure_pressure_vs_estimate() -> Path:
    pressures = np.linspace(0.0, 10e6, 6)
    figure, axis = plt.subplots(figsize=(7.2, 4.8), constrained_layout=True)
    axis.plot(
        [0.0, 10.0],
        [0.0, 10.0],
        color="#94a3b8",
        linestyle="--",
        linewidth=1.0,
        label="Identidad",
    )

    for index, fluid in enumerate(FLUIDS.values()):
        means = []
        errors = []
        for point, pressure in enumerate(pressures):
            stats = run_monte_carlo(
                float(pressure),
                200,
                TOF_NOISE,
                ALPHA_TOLERANCE,
                C0_TOLERANCE,
                SEED + point,
            )
            means.append(stats["mean"] / 1e6)
            errors.append(stats["ci95"] / 1e6)
        axis.errorbar(
            pressures / 1e6,
            means,
            yerr=errors,
            fmt="o-",
            color=fluid["color"],
            linewidth=1.4,
            markersize=4,
            capsize=3,
            label=fluid["name"],
        )

    axis.set_xlabel("Presion real (MPa)")
    axis.set_ylabel("Presion estimada (MPa)")
    axis.set_title("Presion estimada vs. real (acero, r = 100 mm, t = 5 mm)")
    axis.set_xlim(0.0, 10.0)
    axis.set_ylim(0.0, 10.0)
    axis.legend(loc="upper left")
    output = HERE / "pressure_vs_estimate.png"
    figure.savefig(output, dpi=180)
    plt.close(figure)
    return output


def figure_error_histograms(python_results: list[dict]) -> Path:
    figure, axes = plt.subplots(1, 3, figsize=(12.0, 3.8), sharey=True, constrained_layout=True)

    for axis, result in zip(axes, python_results):
        fluid = FLUIDS[result["id"]]
        samples = sample_estimates(
            result["truePressure"],
            1000,
            TOF_NOISE,
            ALPHA_TOLERANCE,
            C0_TOLERANCE,
            SEED,
        )
        errors = [(value - result["truePressure"]) / 1e6 for value in samples]
        axis.hist(errors, bins=30, color=fluid["color"], alpha=0.78, edgecolor="white")
        axis.axvline(0.0, color="#e11d48", linestyle="--", linewidth=1.2)
        bias = sum(errors) / len(errors)
        rmse = math.sqrt(sum(value * value for value in errors) / len(errors))
        axis.set_title(
            f"{fluid['name']}\nbias {bias:+.3f} MPa - RMSE {rmse:.3f} MPa",
            fontsize=10,
        )
        axis.set_xlabel("P estimada - P real (MPa)")

    axes[0].set_ylabel("Frecuencia")
    figure.suptitle(
        "Distribucion del error de estimacion (1000 corridas Monte Carlo)",
        fontsize=11,
    )
    output = HERE / "error_histograms.png"
    figure.savefig(output, dpi=180)
    plt.close(figure)
    return output


def draw_waterfall(
    axis: plt.Axes,
    phases: list[tuple[str, float]],
    total: float,
    ylim: float,
    title: str,
    include_total: bool,
    label_tiny: bool,
) -> None:
    colors = ["#38bdf8", "#22d3ee", "#a78bfa", "#f59e0b", "#f43f5e"]
    cumulative = 0.0
    for index, (label, value) in enumerate(phases):
        axis.bar(
            index,
            value * 100.0,
            bottom=cumulative * 100.0,
            color=colors[index],
            width=0.66,
            edgecolor="white",
            linewidth=0.6,
        )
        if label_tiny or value * 100.0 > ylim * 0.02:
            axis.text(
                index,
                (cumulative + value) * 100.0,
                f"{value * 100.0:.3f}%",
                ha="center",
                va="bottom",
                fontsize=7,
                color="#334155",
            )
        cumulative += value

    if include_total:
        axis.bar(
            len(phases),
            total * 100.0,
            color="#34d399",
            width=0.66,
            edgecolor="white",
            linewidth=0.6,
        )
        axis.text(
            len(phases),
            total * 100.0,
            f"{total * 100.0:.2f}%",
            ha="center",
            va="bottom",
            fontsize=8,
            color="#0f172a",
        )

    labels = [phase[0] for phase in phases] + (["Total"] if include_total else [])
    axis.set_xticks(range(len(labels)))
    axis.set_xticklabels(labels, rotation=18, ha="right", fontsize=9)
    axis.set_ylabel("Contribucion (%)")
    axis.set_title(title, fontsize=10, fontweight="bold")
    axis.set_ylim(0.0, ylim)


def figure_error_budget() -> Path:
    phases, total = error_budget(5e6, TOF_NOISE)
    speed_phases = phases[:4]
    speed_total = sum(value for _, value in speed_phases)

    figure, (left, right) = plt.subplots(
        1,
        2,
        figsize=(11.0, 4.4),
        gridspec_kw={"width_ratios": [1.0, 1.0]},
        constrained_layout=True,
    )
    left_ylim = speed_total * 100.0 * 1.25
    draw_waterfall(
        left,
        speed_phases,
        speed_total,
        left_ylim,
        "Primeras fases (error en c)",
        False,
        True,
    )

    draw_waterfall(
        right,
        phases,
        total,
        total * 100.0 * 1.15,
        "Presupuesto completo (error en presion)",
        True,
        False,
    )
    right.set_ylabel("Contribucion (%)")

    figure.suptitle(
        "Presupuesto de error a 5 MPa (acero, r = 100 mm, t = 5 mm, ruido TOF = 0.05 %)",
        fontsize=11,
    )
    output = HERE / "error_budget.png"
    figure.savefig(output, dpi=180)
    plt.close(figure)
    return output


def print_summary(python_results: list[dict], comparison: dict) -> None:
    print()
    print("Caso de validacion")
    print(f"  P1 = {P1 / 1e6:.1f} MPa, P2 = {P2 / 1e6:.1f} MPa, seccion = {SECTION:.2f} L")
    print(
        f"  {TRIALS} corridas, ruido TOF = {TOF_NOISE * 100:.2f} %, "
        f"alpha = +/-{ALPHA_TOLERANCE * 100:.0f} %, c0 = +/-{C0_TOLERANCE * 100:.2f} %"
    )
    print()
    header = f"{'Fluido':<10} {'P real':>8} {'P est':>8} {'RMSE':>8} {'MAE':>8} {'Sesgo':>8} {'Total':>8}"
    print(header)
    print("-" * len(header))
    for result in python_results:
        total = math.hypot(result["stats"]["rmse"], result["modelError"])
        percent = 100.0 * total / result["truePressure"] if result["truePressure"] else 0.0
        print(
            f"{result['name']:<10} "
            f"{result['truePressure'] / 1e6:8.3f} "
            f"{result['estimatedPressure'] / 1e6:8.3f} "
            f"{result['stats']['rmse'] / 1e6:8.3f} "
            f"{result['stats']['mae'] / 1e6:8.3f} "
            f"{result['stats']['bias'] / 1e6:8.3f} "
            f"{percent:7.2f}%"
        )
    print()
    if comparison["available"]:
        print(
            "Contraste TypeScript vs Python: "
            f"max diferencia relativa = {comparison['maxRelativeDifference']:.2e} "
            f"({comparison['message']})"
        )
    else:
        print(comparison["message"])
    print()


def main() -> None:
    configure_style()
    python_results = [
        validate_fluid(fluid_id, TRIALS, SEED) for fluid_id in FLUIDS
    ]
    comparison = compare_with_typescript(python_results)

    figure_pressure_vs_estimate()
    figure_error_histograms(python_results)
    figure_error_budget()

    report = {
        "config": {
            "p1": P1,
            "p2": P2,
            "sectionFraction": SECTION,
            "trials": TRIALS,
            "tofNoise": TOF_NOISE,
            "alphaUncertainty": ALPHA_TOLERANCE,
            "c0Uncertainty": C0_TOLERANCE,
            "seed": SEED,
            "temperature": TEMPERATURE,
        },
        "python": python_results,
        "comparison": comparison,
        "figures": [
            "validation/pressure_vs_estimate.png",
            "validation/error_histograms.png",
            "validation/error_budget.png",
        ],
    }
    (HERE / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print_summary(python_results, comparison)
    print(f"Reporte: {HERE / 'report.json'}")
    print(f"Figuras: {HERE / 'pressure_vs_estimate.png'}")
    print(f"          {HERE / 'error_histograms.png'}")
    print(f"          {HERE / 'error_budget.png'}")

    if comparison["available"] and not comparison["passed"]:
        raise SystemExit("El contraste con TypeScript no paso el umbral de 1e-6.")


if __name__ == "__main__":
    main()
