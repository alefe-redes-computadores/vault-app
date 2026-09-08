# scripts/medication-catalog/parse-controlled-lists.py

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

DEFAULT_SOURCE_FILE = (
    ROOT
    / ".medication-catalog-audit"
    / "sources"
    / "anvisa-rdc-985-2025-update-96.txt"
)

DEFAULT_OUTPUT_DIR = (
    ROOT
    / ".medication-catalog-audit"
    / "structured"
)

DEFAULT_JSON_FILE = (
    DEFAULT_OUTPUT_DIR
    / "controlled-lists-update-96.json"
)

DEFAULT_SUMMARY_FILE = (
    DEFAULT_OUTPUT_DIR
    / "controlled-lists-update-96-summary.txt"
)

DEFAULT_RESOLUTION = "RDC 985/2025"
DEFAULT_UPDATE = 96

DEFAULT_EXPECTED_PROBES = {
    "METADONA": "A1",
    "CLONAZEPAM": "B1",
}

KNOWN_CLASSES = {
    "A1",
    "A2",
    "A3",
    "B1",
    "B2",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "D1",
    "D2",
    "E",
    "F1",
    "F2",
    "F3",
    "F4",
}


def normalize(
    value: str,
) -> str:
    value = unicodedata.normalize(
        "NFD",
        value,
    )

    value = "".join(
        char
        for char in value
        if unicodedata.category(
            char
        )
        != "Mn"
    )

    value = (
        value
        .replace(
            "ﬁ",
            "fi",
        )
        .replace(
            "ﬂ",
            "fl",
        )
        .lower()
    )

    value = re.sub(
        r"[^a-z0-9]+",
        " ",
        value,
    )

    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def clean_line(
    value: str,
) -> str:
    return re.sub(
        r"\s+",
        " ",
        value,
    ).strip()


def is_page_noise(
    line: str,
) -> bool:
    if not line:
        return True

    if re.fullmatch(
        r"=+",
        line,
    ):
        return True

    if re.fullmatch(
        r"PÁGINA\s+\d+",
        line,
        flags=re.I,
    ):
        return True

    if re.match(
        r"^\d{2}/\d{2}/\d{4},\s*\d{2}:\d{2}",
        line,
    ):
        return True

    if re.match(
        r"^Página\s+\d+\s+de\s+\d+",
        line,
        flags=re.I,
    ):
        return True

    if "ActionDatalegis.php" in line:
        return True

    return False


def detect_list_header(
    line: str,
) -> str | None:
    value = clean_line(
        line
    )

    match = re.fullmatch(
        r'LISTA\s*-\s*"?([A-F][1-5]?)"?',
        value,
        flags=re.I,
    )

    if match:
        result = (
            match.group(
                1
            )
            .upper()
        )

        if result in KNOWN_CLASSES:
            return result

        return None

    match = re.match(
        r'^LISTA\s+"?([A-F][1-5]?)"?\s*-\s+',
        value,
        flags=re.I,
    )

    if match:
        result = (
            match.group(
                1
            )
            .upper()
        )

        if result in KNOWN_CLASSES:
            return result

    return None


def parse_numbered_item(
    line: str,
) -> tuple[int, str] | None:
    match = re.match(
        r"^(\d+)\.\s*(.*)$",
        line,
    )

    if not match:
        return None

    return (
        int(
            match.group(
                1
            )
        ),
        clean_line(
            match.group(
                2
            )
        ),
    )


def looks_like_section_description(
    line: str,
) -> bool:
    upper = normalize(
        line
    )

    return (
        upper.startswith(
            "lista das substancias"
        )
        or upper.startswith(
            "lista de substancias"
        )
        or upper.startswith(
            "sujeita a notificacao"
        )
        or upper.startswith(
            "sujeitas a notificacao"
        )
        or upper.startswith(
            "sujeita a receita"
        )
        or upper.startswith(
            "sujeitas a receita"
        )
    )


def finalize_item(
    current: dict | None,
    output: list[dict],
) -> None:
    if not current:
        return

    name = clean_line(
        " ".join(
            current[
                "parts"
            ]
        )
    )

    if not name:
        return

    output.append(
        {
            "number":
                current[
                    "number"
                ],

            "name":
                name,

            "normalized":
                normalize(
                    name
                ),
        }
    )


def parse_document(
    text: str,
) -> dict:
    lines = [
        clean_line(
            line
        )
        for line in text.splitlines()
    ]

    lists: dict[str, dict] = {}

    current_class: str | None = None
    current_item: dict | None = None
    mode = "outside"

    for line_number, line in enumerate(
        lines,
        start=1,
    ):
        if is_page_noise(
            line
        ):
            continue

        header = detect_list_header(
            line
        )

        if header:
            if (
                current_class
                and current_item
            ):
                finalize_item(
                    current_item,
                    lists[
                        current_class
                    ][
                        "substances"
                    ],
                )

            current_item = None
            current_class = header
            mode = "substances"

            lists.setdefault(
                header,
                {
                    "regulatoryClass":
                        header,

                    "headerLine":
                        line_number,

                    "substances":
                        [],

                    "adendoLines":
                        [],
                },
            )

            continue

        if not current_class:
            continue

        if re.fullmatch(
            r"ADENDO\s*:",
            line,
            flags=re.I,
        ):
            if current_item:
                finalize_item(
                    current_item,
                    lists[
                        current_class
                    ][
                        "substances"
                    ],
                )

                current_item = None

            mode = "adendo"

            continue

        if mode == "adendo":
            lists[
                current_class
            ][
                "adendoLines"
            ].append(
                {
                    "line":
                        line_number,

                    "text":
                        line,
                }
            )

            continue

        if looks_like_section_description(
            line
        ):
            continue

        numbered = parse_numbered_item(
            line
        )

        if numbered:
            if current_item:
                finalize_item(
                    current_item,
                    lists[
                        current_class
                    ][
                        "substances"
                    ],
                )

            number, name = numbered

            current_item = {
                "number":
                    number,

                "parts":
                (
                    [
                        name,
                    ]
                    if name
                    else []
                ),
            }

            continue

        if current_item:
            # Continuação de nome quebrado pelo PDF.
            # Evitamos anexar linhas que claramente iniciam
            # outra seção normativa.
            normalized_line = normalize(
                line
            )

            if (
                normalized_line.startswith(
                    "art "
                )
                or normalized_line.startswith(
                    "anexo "
                )
            ):
                continue

            current_item[
                "parts"
            ].append(
                line
            )

    if (
        current_class
        and current_item
    ):
        finalize_item(
            current_item,
            lists[
                current_class
            ][
                "substances"
            ],
        )

    return lists


def annotate_adendo_mentions(
    lists: dict[str, dict],
) -> None:
    for item in lists.values():
        adendo_text = normalize(
            " ".join(
                entry[
                    "text"
                ]
                for entry
                in item[
                    "adendoLines"
                ]
            )
        )

        for substance in item[
            "substances"
        ]:
            normalized_name = substance[
                "normalized"
            ]

            substance[
                "mentionedInAdendo"
            ] = (
                bool(
                    normalized_name
                )
                and normalized_name
                in adendo_text
            )


def find_probe(
    lists: dict[str, dict],
    probe: str,
) -> list[dict]:
    target = normalize(
        probe
    )

    matches: list[dict] = []

    for regulatory_class, item in lists.items():
        for substance in item[
            "substances"
        ]:
            if (
                target
                == substance[
                    "normalized"
                ]
            ):
                matches.append(
                    {
                        "regulatoryClass":
                            regulatory_class,

                        "number":
                            substance[
                                "number"
                            ],

                        "name":
                            substance[
                                "name"
                            ],

                        "mentionedInAdendo":
                            substance[
                                "mentionedInAdendo"
                            ],
                    }
                )

    return matches


def parse_probe(
    value: str,
) -> tuple[str, str]:
    if "=" not in value:
        raise argparse.ArgumentTypeError(
            "Probe deve usar formato NOME=CLASSE, ex.: CLONAZEPAM=B1"
        )

    name, regulatory_class = value.split(
        "=",
        1,
    )

    name = name.strip().upper()
    regulatory_class = regulatory_class.strip().upper()

    if not name:
        raise argparse.ArgumentTypeError(
            "Nome da probe não pode ser vazio."
        )

    if regulatory_class not in KNOWN_CLASSES:
        raise argparse.ArgumentTypeError(
            f"Classe regulatória desconhecida: {regulatory_class}"
        )

    return (
        name,
        regulatory_class,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Parser estrutural offline das listas controladas da ANVISA."
        )
    )

    parser.add_argument(
        "--source",
        type=Path,
        default=None,
        help="TXT oficial previamente extraído.",
    )

    parser.add_argument(
        "--json",
        type=Path,
        default=None,
        help="JSON estruturado de saída.",
    )

    parser.add_argument(
        "--summary",
        type=Path,
        default=None,
        help="Resumo TXT de saída.",
    )

    parser.add_argument(
        "--resolution",
        default=None,
        help='Ex.: "RDC 999/2025".',
    )

    parser.add_argument(
        "--update",
        type=int,
        default=None,
        help="Número da atualização.",
    )

    parser.add_argument(
        "--probe",
        action="append",
        type=parse_probe,
        default=None,
        help=(
            "Probe estrutural repetível no formato NOME=CLASSE. "
            "Ex.: --probe CARISOPRODOL=B1"
        ),
    )

    return parser.parse_args()


def resolve_config() -> dict:
    args = parse_args()

    custom_mode = any(
        value is not None
        for value in [
            args.source,
            args.json,
            args.summary,
            args.resolution,
            args.update,
            args.probe,
        ]
    )

    if not custom_mode:
        return {
            "source": DEFAULT_SOURCE_FILE,
            "json": DEFAULT_JSON_FILE,
            "summary": DEFAULT_SUMMARY_FILE,
            "resolution": DEFAULT_RESOLUTION,
            "update": DEFAULT_UPDATE,
            "expectedProbes": DEFAULT_EXPECTED_PROBES,
            "mode": "snapshot_default",
        }

    required = {
        "--source": args.source,
        "--json": args.json,
        "--summary": args.summary,
        "--resolution": args.resolution,
        "--update": args.update,
    }

    missing = [
        key
        for key, value in required.items()
        if value is None
    ]

    if missing:
        raise RuntimeError(
            "Modo customizado incompleto. Faltando: "
            + ", ".join(
                missing
            )
        )

    expected_probes = dict(
        args.probe
        or []
    )

    if not expected_probes:
        raise RuntimeError(
            "Modo customizado exige ao menos uma --probe NOME=CLASSE."
        )

    return {
        "source": args.source,
        "json": args.json,
        "summary": args.summary,
        "resolution": args.resolution,
        "update": args.update,
        "expectedProbes": expected_probes,
        "mode": "custom_snapshot",
    }


def main() -> None:
    config = resolve_config()

    source_file: Path = config[
        "source"
    ]

    json_file: Path = config[
        "json"
    ]

    summary_file: Path = config[
        "summary"
    ]

    resolution: str = config[
        "resolution"
    ]

    update: int = config[
        "update"
    ]

    expected_probes: dict[str, str] = config[
        "expectedProbes"
    ]

    print(
        "🧠 VAULT — PARSER ESTRUTURAL DAS LISTAS ANVISA\n"
    )

    print(
        f"📚 Resolução: {resolution}"
    )

    print(
        f"🔢 Update: {update}"
    )

    print(
        f"📄 Fonte: {source_file}\n"
    )

    print(
        "🚫 Offline."
    )

    print(
        "🚫 Nenhuma conexão com Supabase."
    )

    print(
        "🚫 Nenhuma classificação de receita será persistida.\n"
    )

    if not source_file.exists():
        raise RuntimeError(
            "Texto oficial extraído não encontrado."
        )

    text = source_file.read_text(
        encoding="utf-8"
    )

    lists = parse_document(
        text
    )

    annotate_adendo_mentions(
        lists
    )

    if not lists:
        raise RuntimeError(
            "Nenhuma lista regulatória foi detectada."
        )

    probes = {
        probe:
            find_probe(
                lists,
                probe,
            )
        for probe
        in expected_probes
    }

    failures: list[str] = []

    for probe, expected_class in expected_probes.items():
        matches = probes[
            probe
        ]

        if len(
            matches
        ) != 1:
            failures.append(
                (
                    f"{probe}: esperado 1 match, "
                    f"encontrado {len(matches)}"
                )
            )

            continue

        if (
            matches[
                0
            ][
                "regulatoryClass"
            ]
            != expected_class
        ):
            failures.append(
                (
                    f"{probe}: esperado {expected_class}, "
                    f"encontrado "
                    f"{matches[0]['regulatoryClass']}"
                )
            )

    result = {
        "generatedAt":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "mode":
            "offline_structural_parse",

        "source": {
            "authority":
                "ANVISA",

            "resolution":
                resolution,

            "update":
                update,

            "sourceText":
                str(
                    source_file
                ),
        },

        "lists":
            lists,

        "probes":
            probes,

        "validationFailures":
            failures,
    }

    json_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    summary_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    json_file.write_text(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    summary: list[str] = []

    summary.append(
        f"VAULT — ANVISA CONTROLLED LISTS / UPDATE {update}"
    )

    summary.append(
        "=" * 56
    )

    summary.append(
        ""
    )

    total = 0

    for regulatory_class in sorted(
        lists.keys()
    ):
        item = lists[
            regulatory_class
        ]

        count = len(
            item[
                "substances"
            ]
        )

        total += count

        mentioned = sum(
            1
            for substance
            in item[
                "substances"
            ]
            if substance[
                "mentionedInAdendo"
            ]
        )

        summary.append(
            (
                f"{regulatory_class:<3} "
                f"{count:>4} substâncias | "
                f"{len(item['adendoLines']):>4} linhas de adendo | "
                f"{mentioned:>3} substâncias citadas nominalmente no adendo"
            )
        )

    summary.append(
        ""
    )

    summary.append(
        f"TOTAL: {total} itens numerados"
    )

    summary.append(
        ""
    )

    summary.append(
        "PROBES"
    )

    summary.append(
        "-" * 56
    )

    for probe, matches in probes.items():
        if not matches:
            summary.append(
                f"{probe}: NÃO ENCONTRADO"
            )

            continue

        for match in matches:
            summary.append(
                (
                    f"{probe}: "
                    f"{match['regulatoryClass']} "
                    f"#{match['number']} "
                    f"| adendo={'SIM' if match['mentionedInAdendo'] else 'NÃO'}"
                )
            )

    if failures:
        summary.append(
            ""
        )

        summary.append(
            "VALIDATION FAILURES"
        )

        summary.extend(
            failures
        )

    summary_file.write_text(
        "\n".join(
            summary
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "📊 LISTAS DETECTADAS"
    )

    print(
        "────────────────────────────────────────────────────────"
    )

    for regulatory_class in sorted(
        lists.keys()
    ):
        item = lists[
            regulatory_class
        ]

        mentioned = sum(
            1
            for substance
            in item[
                "substances"
            ]
            if substance[
                "mentionedInAdendo"
            ]
        )

        print(
            (
                f"{regulatory_class:<3} "
                f"{len(item['substances']):>4} substância(s)"
                f" | adendo: {len(item['adendoLines']):>4} linha(s)"
                f" | citadas no adendo: {mentioned}"
            )
        )

    print(
        "────────────────────────────────────────────────────────\n"
    )

    print(
        "🔬 PROBES REGULATÓRIOS"
    )

    for probe, matches in probes.items():
        if not matches:
            print(
                f"❌ {probe}: não encontrado"
            )

            continue

        for match in matches:
            print(
                (
                    f"✅ {probe}: "
                    f"LISTA {match['regulatoryClass']} "
                    f"#{match['number']} "
                    f"| citado no adendo: "
                    f"{'SIM' if match['mentionedInAdendo'] else 'NÃO'}"
                )
            )

    print(
        ""
    )

    print(
        f"📝 JSON: {json_file}"
    )

    print(
        f"📝 Resumo: {summary_file}"
    )

    if failures:
        print(
            "\n❌ Validação estrutural falhou:"
        )

        for failure in failures:
            print(
                "   " + failure
            )

        raise RuntimeError(
            "Probes regulatórios não corresponderam ao documento esperado."
        )

    print(
        f"\n✅ {len(expected_probes)} probe(s) validada(s) estruturalmente."
    )

    print(
        "🚫 Nenhuma escrita no Supabase."
    )

    print(
        "✅ Parser estrutural concluído."
    )


if __name__ == "__main__":
    main()
