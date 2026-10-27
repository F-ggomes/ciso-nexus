"""Download the official text of EU acts from the Publications Office (Cellar) and write
app/content/texts/<framework_id>.<lang>.md in the format read by app.services.repository.

EU legal texts may be reused with attribution (Commission Decision 2011/833/EU).
Only the Official Journal text is authentic; these files are a convenience copy.

    python scripts/fetch_eu_texts.py            # all acts, pt-PT and en
    python scripts/fetch_eu_texts.py gdpr nis2  # selected framework ids
"""
from __future__ import annotations

import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

import httpx

ACTS = {
    "gdpr": ("32016R0679", "Regulamento (UE) 2016/679 (RGPD)", "Regulation (EU) 2016/679 (GDPR)"),
    "nis2": ("32022L2555", "Diretiva (UE) 2022/2555 (NIS2)", "Directive (EU) 2022/2555 (NIS2)"),
    "dora": ("32022R2554", "Regulamento (UE) 2022/2554 (DORA)", "Regulation (EU) 2022/2554 (DORA)"),
    "eu-ai-act": ("32024R1689", "Regulamento (UE) 2024/1689 (Regulamento IA)", "Regulation (EU) 2024/1689 (AI Act)"),
    "rts-2024-1774": ("32024R1774", "Regulamento Delegado (UE) 2024/1774", "Commission Delegated Regulation (EU) 2024/1774"),
    "rts-2024-1772": ("32024R1772", "Regulamento Delegado (UE) 2024/1772", "Commission Delegated Regulation (EU) 2024/1772"),
    "its-2024-2956": ("32024R2956", "Regulamento de Execução (UE) 2024/2956", "Commission Implementing Regulation (EU) 2024/2956"),
}
LANGS = {"pt-PT": ("por", 1), "en": ("eng", 2)}
OUT = Path(__file__).resolve().parent.parent / "app" / "content" / "texts"
SUPER = {"o": "º", "a": "ª"}


class _OJ(HTMLParser):
    """Flatten Official Journal XHTML into (class, text, in_table_row_cells) paragraphs."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.paras: list[tuple[str, str, int]] = []
        self._cls: str | None = None
        self._buf: list[str] = []
        self._super = False
        self._cell = 0
        self._row: list[str] = []
        self._depth_tr = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "p":
            self._cls, self._buf = a.get("class", ""), []
        elif tag == "span" and a.get("class") == "oj-super":
            self._super = True
        elif tag == "tr":
            self._depth_tr += 1
            if self._depth_tr == 1:
                self._row = []
        elif tag == "br" and self._cls is not None:
            self._buf.append(" ")

    def handle_endtag(self, tag):
        if tag == "p" and self._cls is not None:
            text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            if text:
                if self._depth_tr:
                    self._row.append((self._cls, text))
                else:
                    self.paras.append((self._cls, text, 0))
            self._cls = None
        elif tag == "span" and self._super:
            self._super = False
        elif tag == "tr":
            if self._depth_tr == 1 and self._row:
                cls = self._row[-1][0]
                self.paras.append((cls, " ".join(t for _, t in self._row), len(self._row)))
                self._row = []
            self._depth_tr -= 1

    def handle_data(self, data):
        if self._cls is None:
            return
        if self._super:
            d = data.strip()
            self._buf.append(SUPER.get(d, f"({d})" if d.isdigit() else d))
        else:
            self._buf.append(data)


def to_markdown(xhtml: str, fid: str, lang: str, title: str, celex: str) -> tuple[str, int]:
    p = _OJ()
    p.feed(xhtml)
    art_re = re.compile(r"^(Artigo|Article)\s+(\d+[a-z]?)", re.IGNORECASE)
    annex_re = re.compile(r"^(ANEXO|ANNEX)\b\s*([IVXLC]*)", re.IGNORECASE)
    lines: list[str] = []
    notes: list[str] = []
    started = articles = 0
    pending_art: str | None = None
    for cls, text, cells in p.paras:
        if cls == "oj-note":
            notes.append(f"- {text}")
            continue
        if cls.startswith("oj-hd") or cls in ("oj-separator", "oj-doc-end"):
            continue
        m = art_re.match(text)
        if cls == "oj-ti-art" and m:
            pending_art = m.group(2)
            started = 1
            articles += 1
            lines += ["", f"## [Art. {pending_art}] {text}"]
            continue
        if cls == "oj-sti-art" and pending_art:
            lines[-1] += f" — {text}"
            pending_art = None
            continue
        pending_art = None
        a = annex_re.match(text)
        if cls == "oj-doc-ti" and started and a:
            lines += ["", f"## [Anexo {a.group(2)}] {text}" if lang == "pt-PT" else f"## [Annex {a.group(2)}] {text}"]
            continue
        if cls == "oj-doc-ti" and not started:
            if not lines:
                lines += ["## [Preâmbulo] " + text if lang == "pt-PT" else "## [Preamble] " + text]
            else:
                lines.append(f"**{text}**")
            continue
        if cls.startswith(("oj-ti-section", "oj-ti-grseq")) or cls == "oj-ti-tbl":
            lines += ["", f"### {text}"]
            continue
        lines.append(f"- {text}" if cells > 1 else text)
    if notes:
        lines += ["", "## [Notas] Notas" if lang == "pt-PT" else "## [Notes] Notes", *notes]
    src = f"https://eur-lex.europa.eu/legal-content/{'PT' if lang == 'pt-PT' else 'EN'}/TXT/?uri=CELEX:{celex}"
    head = [
        "---",
        f"framework_id: {fid}",
        f"title: {title} — {'texto integral' if lang == 'pt-PT' else 'full text'}",
        f"language: {lang}",
        "doc_type: legal_text",
        f"source_url: {src}",
        f"retrieved: {date.today().isoformat()}",
        ("licence: © União Europeia, https://eur-lex.europa.eu. Reutilização autorizada (Decisão 2011/833/UE). "
        "Só faz fé o texto publicado no Jornal Oficial."),
        "---",
        "",
    ]
    body = re.sub(r"\n{3,}", "\n\n", "\n\n".join(l for l in lines if l is not None))
    return "\n".join(head) + body.strip() + "\n", articles


def fetch(celex: str, lang3: str) -> str:
    r = httpx.get(f"https://publications.europa.eu/resource/celex/{celex}",
                  headers={"Accept": "application/xhtml+xml", "Accept-Language": lang3}, follow_redirects=True, timeout=120)
    r.raise_for_status()
    return r.text


def main(ids: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for fid in ids or list(ACTS):
        celex, title_pt, title_en = ACTS[fid]
        for lang, (lang3, ti) in LANGS.items():
            md, n = to_markdown(fetch(celex, lang3), fid, lang, (title_pt, title_en)[ti - 1], celex)
            (OUT / f"{fid}.{lang}.md").write_text(md, encoding="utf-8")
            print(f"{fid}.{lang}: {n} articles, {len(md) // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:])
