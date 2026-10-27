import re

def clean_and_patch(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Clean any duplicated style block
    style_replacement = """<style>
:root {
  --bg: #f8fafc; --panel: #ffffff; --panel-2: #f1f5f9; --text: #0f172a; --muted: #64748b; --line: #e2e8f0;
  --accent: #0d9488; --accent-soft: rgba(13, 148, 136, 0.12); --ok: #059669; --ok-soft: #ecfdf5; --warn: #d97706; --warn-soft: #fffbeb;
  --info: #4f46e5; --info-soft: #eef2ff; --mark: #fef08a; --shadow: 0 1px 3px rgba(0,0,0,.05);
  --radius: 8px; --mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0b0f19; --panel: #0f172a; --panel-2: #1e293b; --text: #f8fafc; --muted: #94a3b8; --line: #334155;
  --accent: #14b8a6; --accent-soft: rgba(20, 184, 166, 0.18); --ok: #10b981; --ok-soft: rgba(16, 185, 129, 0.15); --warn: #f59e0b; --warn-soft: rgba(245, 158, 11, 0.15);
  --info: #818cf8; --info-soft: rgba(99, 102, 241, 0.15); --mark: #854d0e; --shadow: none; } }
:root[data-theme="dark"] {
  --bg: #0b0f19; --panel: #0f172a; --panel-2: #1e293b; --text: #f8fafc; --muted: #94a3b8; --line: #334155;
  --accent: #14b8a6; --accent-soft: rgba(20, 184, 166, 0.18); --ok: #10b981; --ok-soft: rgba(16, 185, 129, 0.15); --warn: #f59e0b; --warn-soft: rgba(245, 158, 11, 0.15);
  --info: #818cf8; --info-soft: rgba(99, 102, 241, 0.15); --mark: #854d0e; --shadow: none; }
body.is-embedded header {
  display: none !important;
}
body.is-embedded main {
  padding: 12px 14px;
  max-width: 100%;
}
* { box-sizing: border-box; }"""

    content = re.sub(r"<style>.*?\*\s*\{\s*box-sizing:\s*border-box;\s*\}", style_replacement, content, count=1, flags=re.DOTALL)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Cleaned {file_path}")

clean_and_patch("frontend/public/viewer.html")
clean_and_patch("backend/app/content/viewer.html")
