"""Merge viewer.html content into CISO Nexus:
1. Extracts and saves structured JSON files in backend/app/content/
2. Merges 302 frameworks into Framework table in PostgreSQL (without duplicates)
3. Enriches and merges 5,452 Google Drive files into KnowledgeDocument (without duplicates)
4. Indexes 1,484 legal/regulatory obligations into KnowledgeDocument (without duplicates)
5. Copies viewer.html to frontend public and backend content directories
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path

from app.db.models import Framework, KnowledgeDocument
from app.db.session import SessionLocal

PROJECT_ROOT = Path("/Users/fgpaulos/CISO PROJECT")
VIEWER_HTML_PATH = PROJECT_ROOT / "viewer.html"
BACKEND_CONTENT_DIR = Path("/Users/fgpaulos/CISO PROJECT/ciso-nexus/backend/app/content")
FRONTEND_PUBLIC_DIR = Path("/Users/fgpaulos/CISO PROJECT/ciso-nexus/frontend/public")


def extract_viewer_payload() -> dict:
    print(f"Reading {VIEWER_HTML_PATH}...")
    with open(VIEWER_HTML_PATH, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    scripts = re.findall(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
    if not scripts:
        raise ValueError("No script tags found in viewer.html")

    b64_data = scripts[0].strip()
    raw = base64.b64decode(b64_data)
    decompressed = gzip.decompress(raw).decode("utf-8", errors="ignore")
    data = json.loads(decompressed)
    print(f"Successfully decompressed payload ({len(decompressed):,} bytes).")
    return data


def save_content_files(data: dict):
    print("Saving structured JSON assets to backend/app/content/...")
    BACKEND_CONTENT_DIR.mkdir(parents=True, exist_ok=True)
    FRONTEND_PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Metadata
    meta = {
        "built": data.get("built", datetime.now(UTC).strftime("%Y-%m-%d")),
        "frameworks_count": len(data.get("frameworks", [])),
        "drive_count": len(data.get("drive", [])),
        "obligations_count": len(data.get("obl", {}).get("rows", [])),
        "sources_count": len(data.get("src", [])),
        "chats_count": len(data.get("chats", [])),
        "crosswalks_pairs_count": len(data.get("pairs", [])),
        "datasets_count": len(data.get("datasets", [])),
        "skills_count": len(data.get("skills", [])),
    }
    with open(BACKEND_CONTENT_DIR / "grc_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    # 2. Frameworks
    with open(BACKEND_CONTENT_DIR / "grc_frameworks.json", "w", encoding="utf-8") as f:
        json.dump(data.get("frameworks", []), f, indent=2, ensure_ascii=False)

    # 3. Obligations
    with open(BACKEND_CONTENT_DIR / "grc_obligations.json", "w", encoding="utf-8") as f:
        json.dump(data.get("obl", {}), f, indent=2, ensure_ascii=False)

    # 4. Drive catalog
    with open(BACKEND_CONTENT_DIR / "grc_drive.json", "w", encoding="utf-8") as f:
        json.dump(data.get("drive", []), f, indent=2, ensure_ascii=False)

    # 5. Datasets & Skills
    with open(BACKEND_CONTENT_DIR / "grc_datasets.json", "w", encoding="utf-8") as f:
        json.dump(data.get("datasets", []), f, indent=2, ensure_ascii=False)

    with open(BACKEND_CONTENT_DIR / "grc_skills.json", "w", encoding="utf-8") as f:
        json.dump(data.get("skills", []), f, indent=2, ensure_ascii=False)

    # 6. Copy viewer.html to both locations
    shutil.copy2(VIEWER_HTML_PATH, FRONTEND_PUBLIC_DIR / "viewer.html")
    shutil.copy2(VIEWER_HTML_PATH, BACKEND_CONTENT_DIR / "viewer.html")
    print("✓ Structured content files and viewer.html saved.")


def merge_frameworks(db, frameworks: list[dict]):
    print(f"\nMerging {len(frameworks)} Frameworks into PostgreSQL...")
    existing_fws = {f.id.lower(): f for f in db.query(Framework).all()}
    added = 0
    updated = 0

    KIND_MAP = {
        "standard": "standard",
        "regulation": "regulation",
        "law": "law",
        "guideline": "guideline",
        "framework": "framework",
        "legislation": "law",
        "directive": "regulation",
        "code of practice": "guideline",
    }

    JURISDICTION_MAP = {
        "international": "INTL",
        "european union": "EU",
        "united states": "US",
        "portugal": "PT",
        "angola": "AO",
        "united kingdom": "UK",
        "germany": "DE",
        "france": "FR",
        "spain": "ES",
    }

    for fw in frameworks:
        fw_id = fw.get("id", "").strip()
        if not fw_id:
            continue

        raw_kind = (fw.get("type") or "standard").lower().strip()
        kind = KIND_MAP.get(raw_kind, "framework")

        raw_jur = (fw.get("jurisdiction") or "INTL").lower().strip()
        jurisdiction = JURISDICTION_MAP.get(raw_jur, fw.get("jurisdiction", "INTL")[:16].upper())

        name = (fw.get("name") or fw_id)[:255]
        issuer = (fw.get("issuer") or "")[:128]
        version = (fw.get("version") or "")[:32]
        source_url = (fw.get("url") or "")[:512]

        existing = existing_fws.get(fw_id.lower())
        if existing:
            # Update missing attributes without duplicating
            if not existing.source_url and source_url:
                existing.source_url = source_url
            if not existing.issuer and issuer:
                existing.issuer = issuer
            if not existing.version and version:
                existing.version = version
            updated += 1
        else:
            new_fw = Framework(
                id=fw_id[:64],
                name=name,
                kind=kind,
                jurisdiction=jurisdiction,
                issuer=issuer,
                version=version,
                source_url=source_url,
            )
            db.add(new_fw)
            existing_fws[fw_id.lower()] = new_fw
            added += 1

    db.commit()
    print(f"✓ Frameworks: {added} adicionados, {updated} atualizados/enriquecidos (Total na base de dados: {len(existing_fws)}).")


def merge_drive_documents(db, drive_items: list[list]):
    print(f"\nMerging {len(drive_items)} Google Drive documents into KnowledgeDocument...")
    existing_docs = db.query(KnowledgeDocument).filter_by(doc_type="library").all()
    by_title = {d.title.lower(): d for d in existing_docs}
    by_file = {d.file_path.lower(): d for d in existing_docs if d.file_path}

    enriched = 0
    added = 0

    for item in drive_items:
        # Structure: [title, url, category, subcategory, lang, type, date, size, location]
        title = item[0] if len(item) > 0 else ""
        url = item[1] if len(item) > 1 else ""
        category = item[2] if len(item) > 2 else ""
        subcat = item[3] if len(item) > 3 else ""
        doc_ext = item[5] if len(item) > 5 else ""

        if not title:
            continue

        clean_title = title.strip()
        tags = [t for t in [category, subcat, doc_ext, "google-drive"] if t]

        existing = by_title.get(clean_title.lower()) or by_file.get(clean_title.lower())
        if existing:
            # Enrich existing record with direct Drive URL and tags without duplicating
            if url and existing.source_url != url:
                existing.source_url = url
            # Merge tags
            cur_tags = set(existing.tags or [])
            cur_tags.update(tags)
            existing.tags = list(cur_tags)
            enriched += 1
        else:
            marker = hashlib.sha256(f"drive:{clean_title}:{url}".encode()).hexdigest()
            doc = KnowledgeDocument(
                org_id=None,
                doc_type="library",
                title=clean_title[:512],
                file_path=clean_title,
                source_url=url[:512],
                text=f"{clean_title}\nCategoria: {category}\nSubcategoria: {subcat}\nGoogle Drive Link: {url}",
                sha256=marker,
                tags=tags,
                language="pt-PT",
            )
            db.add(doc)
            by_title[clean_title.lower()] = doc
            added += 1

    db.commit()
    print(f"✓ Documentos Google Drive: {enriched} registos enriquecidos com URLs do Drive, {added} novos documentos adicionados.")


def merge_obligations(db, obl_data: dict):
    cols = obl_data.get("cols", [])
    rows = obl_data.get("rows", [])
    print(f"\nMerging {len(rows)} Legal & Regulatory Obligations into KnowledgeDocument...")

    existing_obls = {
        d.file_path: d
        for d in db.query(KnowledgeDocument).filter_by(doc_type="obligation").all()
        if d.file_path
    }

    added = 0
    updated = 0

    col_idx = {c: i for i, c in enumerate(cols)}

    def get_val(r, col_name: str) -> str:
        idx = col_idx.get(col_name)
        if idx is not None and idx < len(r):
            return str(r[idx] or "").strip()
        return ""

    for row in rows:
        obl_id = get_val(row, "obligation_id")
        law = get_val(row, "law")
        article = get_val(row, "article")
        addressee = get_val(row, "addressee")
        topic = get_val(row, "topic")
        obligation = get_val(row, "obligation")
        deadline = get_val("deadline_or_timing")
        applies_from = get_val("applies_from")
        conditions = get_val("conditions_or_exemptions")
        evidence = get_val("evidence_examples")
        penalty = get_val("penalty_ref")
        iso27001 = get_val("mapping_iso27001")
        nist_csf = get_val("mapping_nist_csf")
        source = get_val("source")

        if not obl_id:
            continue

        ref_key = f"obl:{obl_id}"
        title = f"[{obl_id}] {law} - {article}: {topic}"[:512]
        body_text = f"""# Obrigação Legal: {obl_id}
**Normativo / Lei:** {law}
**Artigo / Secção:** {article}
**Destinatário:** {addressee}
**Tema:** {topic}
**Prazo / Periodicidade:** {deadline}
**Data de Aplicação:** {applies_from}

## Conteúdo da Obrigação
{obligation}

## Condições e Isenções
{conditions or "N/A"}

## Exemplos de Evidências Auditáveis
{evidence or "N/A"}

## Regime Sancionatório e Penalidades
{penalty or "N/A"}

## Mapeamento de Controlos Normativos
- **ISO/IEC 27001:** {iso27001 or "N/A"}
- **NIST CSF:** {nist_csf or "N/A"}

**Fonte Oficial:** {source}
"""
        marker = hashlib.sha256(ref_key.encode()).hexdigest()
        tags = [t for t in [law.split(" - ")[0], topic, "obrigacao-legal", "compliance"] if t]

        existing = existing_obls.get(ref_key)
        if existing:
            existing.title = title
            existing.text = body_text
            existing.source_url = source[:512]
            existing.tags = tags
            updated += 1
        else:
            doc = KnowledgeDocument(
                org_id=None,
                doc_type="obligation",
                title=title,
                file_path=ref_key,
                source_url=source[:512],
                text=body_text,
                sha256=marker,
                tags=tags,
                language="pt-PT" if ("decreto" in law.lower() or "lei" in law.lower() or "aviso" in law.lower() or "portaria" in law.lower()) else "en",
            )
            db.add(doc)
            existing_obls[ref_key] = doc
            added += 1

    db.commit()
    print(f"✓ Obrigações Legais: {added} novas indexadas, {updated} atualizadas (Total: {len(existing_obls)}).")


def main():
    print("=================================================================")
    print("INTEGRAÇÃO E MERGE COMPLETO DO VIEWER.HTML NO CISO NEXUS")
    print("=================================================================")

    data = extract_viewer_payload()
    save_content_files(data)

    with SessionLocal() as db:
        merge_frameworks(db, data.get("frameworks", []))
        merge_drive_documents(db, data.get("drive", []))
        merge_obligations(db, data.get("obl", {}))

    print("\n=================================================================")
    print("MERGE CONCLUÍDO COM SUCESSO SEM DUPLICAÇÕES!")
    print("=================================================================")


if __name__ == "__main__":
    main()
