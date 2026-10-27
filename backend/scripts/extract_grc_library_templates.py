#!/usr/bin/env python3
"""
GRC Library Template Extractor and Generator for CISO Nexus.
Scans '/Users/fgpaulos/My Drive/GRC Specialist Biblioteca',
extracts content, structures, tables, and checklists from docx templates,
and generates standardized pt-PT markdown templates in app/content/templates/.
"""

import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

BASE_DIR = Path('/Users/fgpaulos/My Drive/GRC Specialist Biblioteca')
TARGET_DIR = Path(__file__).resolve().parent.parent / 'app' / 'content' / 'templates'

def get_docx_elements(docx_path: Path):
    if not docx_path.exists():
        return []
    try:
        with zipfile.ZipFile(docx_path) as z:
            if 'word/document.xml' not in z.namelist():
                return []
            xml_content = z.read('word/document.xml')
        root = ET.fromstring(xml_content)
        body = root.find(f'{{{W_NS}}}body')
        if body is None:
            return []
        
        items = []
        for el in body:
            if el.tag == f'{{{W_NS}}}p':
                texts = [t.text for t in el.iter(f'{{{W_NS}}}t') if t.text]
                s = ''.join(texts).strip()
                if s:
                    items.append(('p', s))
            elif el.tag == f'{{{W_NS}}}tbl':
                rows = []
                for tr in el.findall(f'{{{W_NS}}}tr'):
                    cells = []
                    for tc in tr.findall(f'{{{W_NS}}}tc'):
                        c_texts = [t.text for t in tc.iter(f'{{{W_NS}}}t') if t.text]
                        cells.append(' '.join(''.join(c_texts).split()))
                    if any(cells):
                        rows.append(cells)
                if rows:
                    items.append(('tbl', rows))
        return items
    except (OSError, ValueError, KeyError) as e:
        print(f"Error reading {docx_path}: {e}", file=sys.stderr)
        return []

print(f"GRC Base Library: {BASE_DIR}")
print(f"Target Template Directory: {TARGET_DIR}")
print(f"Target exists: {TARGET_DIR.exists()}")
