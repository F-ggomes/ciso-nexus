"""Reference helpers for framework requirement identifiers (pure, no ORM)."""
from __future__ import annotations

import re

_TAIL = re.compile(r"^(.*?)(-\d+|\.\d+|\(\w+\))$")


def parent_refs(ref: str) -> list[str]:
    """'GV.PO-01' -> ['GV.PO-01', 'GV.PO']; '6.3' -> ['6.3', '6']; 'Art. 30(2)(a)' -> ['Art. 30(2)(a)', 'Art. 30(2)', 'Art. 30']."""
    out = [ref]
    cur = ref
    while True:
        m = _TAIL.match(cur)
        if not m:
            break
        cur = m.group(1)
        out.append(cur)
    return out
