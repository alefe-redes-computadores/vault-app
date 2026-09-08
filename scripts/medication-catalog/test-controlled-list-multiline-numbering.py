# scripts/medication-catalog/test-controlled-list-multiline-numbering.py

from __future__ import annotations

import importlib.util
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

PARSER = (
    ROOT
    / "scripts"
    / "medication-catalog"
    / "parse-controlled-lists.py"
)

spec = importlib.util.spec_from_file_location(
    "vault_parser",
    PARSER,
)

if spec is None or spec.loader is None:
    raise RuntimeError(
        "Parser não carregado."
    )

module = importlib.util.module_from_spec(
    spec
)

spec.loader.exec_module(
    module
)


def normalize(value: str) -> str:
    value = unicodedata.normalize(
        "NFD",
        value,
    )

    value = "".join(
        char
        for char in value
        if unicodedata.category(char) != "Mn"
    )

    value = (
        value
        .replace("ﬁ", "fi")
        .replace("ﬂ", "fl")
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


def identity(value: str) -> str:
    match = re.match(
        r"^(.*?)(?:\s+ou(?=\s|[A-Za-zÀ-ÿ0-9(])|$)",
        value,
        flags=re.I,
    )

    if not match:
        return normalize(
            value
        )

    return normalize(
        match.group(1)
    )


inline = """
LISTA F1 - SUBSTÂNCIAS ENTORPECENTES
1. 2F-VIMINOL ou2-(TESTE)
2. CARFENTANIL ouTESTE
ADENDO:
1) exemplo
"""

multiline = """
LISTA F1 - SUBSTÂNCIAS ENTORPECENTES
1.
2F-VIMINOL
ou
2-(TESTE)
2.
CARFENTANIL
ou
TESTE
ADENDO:
1) exemplo
"""

a = module.parse_document(
    inline
)["F1"]["substances"]

b = module.parse_document(
    multiline
)["F1"]["substances"]

assert len(a) == 2
assert len(b) == 2

assert [x["number"] for x in a] == [1, 2]
assert [x["number"] for x in b] == [1, 2]

assert identity(a[0]["name"]) == "2f viminol"
assert identity(b[0]["name"]) == "2f viminol"

assert identity(a[1]["name"]) == "carfentanil"
assert identity(b[1]["name"]) == "carfentanil"

print("✅ inline preservado")
print("✅ multiline suportado")
print("✅ identidade principal preservada")
print("✅ diferença ou2/ou 2 não vira mudança normativa")
print("✅ teste concluído")
