# scripts/medication-catalog/extract-controlled-pdf.py

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

AUDIT_DIR = ROOT / ".medication-catalog-audit"
SOURCE_DIR = AUDIT_DIR / "sources"
LIB_DIR = AUDIT_DIR / "python-libs"

MANIFEST_FILE = SOURCE_DIR / "manifest.json"

DEFAULT_PDF_FILE = (
    SOURCE_DIR
    / "anvisa-rdc-985-2025-update-96.pdf"
)

DEFAULT_TEXT_FILE = (
    SOURCE_DIR
    / "anvisa-rdc-985-2025-update-96.txt"
)

DEFAULT_REPORT_FILE = (
    SOURCE_DIR
    / "anvisa-rdc-985-2025-update-96-extraction.json"
)

DEFAULT_RESOLUTION = "RDC 985/2025"
DEFAULT_UPDATE = 96

sys.path.insert(
    0,
    str(LIB_DIR),
)

try:
    from pypdf import PdfReader
except Exception as error:
    raise RuntimeError(
        "pypdf não disponível no diretório isolado de auditoria."
    ) from error


def sha256_file(
    file_path: Path,
) -> str:
    digest = hashlib.sha256()

    with file_path.open(
        "rb"
    ) as handle:
        for chunk in iter(
            lambda: handle.read(
                1024 * 1024
            ),
            b"",
        ):
            digest.update(
                chunk
            )

    return digest.hexdigest()


def normalize_page_text(
    value: str,
) -> str:
    value = value.replace(
        "\r\n",
        "\n",
    ).replace(
        "\r",
        "\n",
    )

    lines: list[str] = []

    for raw_line in value.split(
        "\n"
    ):
        line = re.sub(
            r"[ \t]+",
            " ",
            raw_line,
        ).strip()

        lines.append(
            line
        )

    # Mantém separação entre blocos, mas elimina sequências enormes
    # de linhas vazias geradas pelo PDF.
    output: list[str] = []

    blank_count = 0

    for line in lines:
        if not line:
            blank_count += 1

            if blank_count <= 2:
                output.append(
                    ""
                )

            continue

        blank_count = 0
        output.append(
            line
        )

    return "\n".join(
        output
    ).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extrai texto de PDF regulatório oficial da ANVISA "
            "com verificação obrigatória de SHA-256."
        )
    )

    parser.add_argument(
        "--pdf",
        type=Path,
        default=None,
    )

    parser.add_argument(
        "--text",
        type=Path,
        default=None,
    )

    parser.add_argument(
        "--report",
        type=Path,
        default=None,
    )

    parser.add_argument(
        "--sha256",
        default=None,
    )

    parser.add_argument(
        "--resolution",
        default=None,
    )

    parser.add_argument(
        "--update",
        type=int,
        default=None,
    )

    return parser.parse_args()


def resolve_config() -> dict:
    args = parse_args()

    custom_mode = any(
        value is not None
        for value in [
            args.pdf,
            args.text,
            args.report,
            args.sha256,
            args.resolution,
            args.update,
        ]
    )

    if not custom_mode:
        if not MANIFEST_FILE.exists():
            raise RuntimeError(
                "manifest.json não encontrado."
            )

        manifest = json.loads(
            MANIFEST_FILE.read_text(
                encoding="utf-8"
            )
        )

        snapshot = (
            manifest
            .get(
                "files",
                {}
            )
            .get(
                "snapshot96",
                {}
            )
        )

        expected_hash = snapshot.get(
            "sha256"
        )

        if not expected_hash:
            raise RuntimeError(
                "SHA-256 do snapshot 96 ausente no manifesto."
            )

        return {
            "pdf": DEFAULT_PDF_FILE,
            "text": DEFAULT_TEXT_FILE,
            "report": DEFAULT_REPORT_FILE,
            "sha256": expected_hash,
            "authority": "ANVISA",
            "resolution": DEFAULT_RESOLUTION,
            "update": DEFAULT_UPDATE,
            "mode": "snapshot_default",
        }

    required = {
        "--pdf": args.pdf,
        "--text": args.text,
        "--report": args.report,
        "--sha256": args.sha256,
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

    return {
        "pdf": args.pdf,
        "text": args.text,
        "report": args.report,
        "sha256": args.sha256.lower(),
        "authority": "ANVISA",
        "resolution": args.resolution,
        "update": args.update,
        "mode": "custom_verified_pdf",
    }


def main() -> None:
    config = resolve_config()

    pdf_file: Path = config[
        "pdf"
    ]

    text_file: Path = config[
        "text"
    ]

    report_file: Path = config[
        "report"
    ]

    expected_hash: str = config[
        "sha256"
    ]

    authority: str = config[
        "authority"
    ]

    resolution: str = config[
        "resolution"
    ]

    update: int = config[
        "update"
    ]

    print(
        "🧠 VAULT — EXTRAÇÃO DE PDF REGULATÓRIO ANVISA\n"
    )

    print(
        f"📚 Resolução: {resolution}"
    )

    print(
        f"🔢 Update: {update}"
    )

    print(
        f"📄 PDF: {pdf_file}\n"
    )

    print(
        "🚫 Somente leitura do PDF oficial."
    )

    print(
        "🚫 Nenhuma conexão com Supabase.\n"
    )

    if not pdf_file.exists():
        raise RuntimeError(
            "PDF oficial não encontrado."
        )

    actual_hash = sha256_file(
        pdf_file
    )

    if actual_hash.lower() != expected_hash.lower():
        raise RuntimeError(
            "SHA-256 do PDF não corresponde ao valor esperado."
        )

    print(
        "✅ Integridade SHA-256 confirmada."
    )

    text_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    report_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    reader = PdfReader(
        str(
            pdf_file
        )
    )

    page_count = len(
        reader.pages
    )

    print(
        f"📄 Páginas no PDF: {page_count}"
    )

    extracted_pages: list[dict] = []
    combined_parts: list[str] = []

    pages_with_text = 0
    pages_without_text = 0

    for index, page in enumerate(
        reader.pages
    ):
        raw = page.extract_text() or ""

        text = normalize_page_text(
            raw
        )

        if text:
            pages_with_text += 1
        else:
            pages_without_text += 1

        extracted_pages.append(
            {
                "page": index + 1,
                "characters": len(
                    text
                ),
                "hasText": bool(
                    text
                ),
            }
        )

        combined_parts.append(
            (
                "\n\n"
                "============================================================\n"
                f"PÁGINA {index + 1}\n"
                "============================================================\n\n"
                f"{text}\n"
            )
        )

        print(
            f"   Página {index + 1}: {len(text)} caractere(s)"
        )

    combined_text = "".join(
        combined_parts
    )

    text_file.write_text(
        combined_text,
        encoding="utf-8",
    )

    normalized_search = (
        combined_text
        .upper()
        .replace(
            "Á",
            "A",
        )
        .replace(
            "Ã",
            "A",
        )
        .replace(
            "Â",
            "A",
        )
        .replace(
            "É",
            "E",
        )
        .replace(
            "Í",
            "I",
        )
        .replace(
            "Ó",
            "O",
        )
        .replace(
            "Õ",
            "O",
        )
        .replace(
            "Ú",
            "U",
        )
        .replace(
            "Ç",
            "C",
        )
    )

    probes = {}

    for probe in [
        "LISTA A1",
        "LISTA A2",
        "LISTA A3",
        "LISTA B1",
        "LISTA B2",
        "LISTA C1",
        "LISTA C2",
        "LISTA C3",
        "LISTA C4",
        "LISTA C5",
        "LISTA D1",
        "LISTA F1",
        "METADONA",
        "CLONAZEPAM",
        "ADENDO",
    ]:
        probes[
            probe
        ] = normalized_search.count(
            probe
        )

    report = {
        "generatedAt": datetime.now(
            timezone.utc
        ).isoformat(),

        "mode": "offline_pdf_extraction",

        "source": {
            "authority": authority,
            "resolution": resolution,
            "update": update,
            "pdf": str(
                pdf_file
            ),
            "sha256": actual_hash,
        },

        "extraction": {
            "pageCount": page_count,
            "pagesWithText": pages_with_text,
            "pagesWithoutText": pages_without_text,
            "characters": len(
                combined_text
            ),
            "pages": extracted_pages,
        },

        "probes": probes,

        "outputText": str(
            text_file
        ),
    }

    report_file.write_text(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "\n📊 EXTRAÇÃO"
    )

    print(
        "────────────────────────────────────────"
    )

    print(
        f"Páginas:             {page_count}"
    )

    print(
        f"Páginas com texto:   {pages_with_text}"
    )

    print(
        f"Páginas sem texto:   {pages_without_text}"
    )

    print(
        f"Caracteres extraídos:{len(combined_text):>9}"
    )

    print(
        "────────────────────────────────────────\n"
    )

    print(
        "🔎 SONDAS"
    )

    for key, value in probes.items():
        print(
            f"   {key:<14} {value}"
        )

    print(
        "\n📝 Texto bruto:"
    )

    print(
        f"   {text_file}"
    )

    print(
        "\n📝 Relatório:"
    )

    print(
        f"   {report_file}"
    )

    print(
        "\n🚫 Nenhuma escrita no Supabase."
    )

    print(
        "✅ Extração concluída."
    )


if __name__ == "__main__":
    main()
