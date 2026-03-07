"""
Script to extract Mermaid blocks from markdown files,
render them to PNG using mmdc, and replace with image references.
"""
import os
import re
import subprocess
import sys

REPORTS_DIR = r"E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports"
FIGURES_DIR = r"E:\anmh1205\IoT_Vehicle_Tracking_System\resources\reports\thesis-chapters\assets\figures"
TEMP_DIR = r"E:\anmh1205\IoT_Vehicle_Tracking_System\tmp-mermaid"

os.makedirs(FIGURES_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Map directory prefixes to short slugs
def get_slug(filepath):
    """Generate a short descriptive slug from filepath."""
    rel = os.path.relpath(filepath, REPORTS_DIR).replace("\\", "/")
    # Remove .md extension and common prefixes
    rel = rel.replace(".md", "")
    rel = rel.replace("iot-vehicle-tracking-report/", "")
    rel = rel.replace("thesis-chapters/", "thesis-")
    # Simplify path segments
    parts = rel.split("/")
    # Take last 2 meaningful parts
    slug = "-".join(parts[-2:]) if len(parts) > 1 else parts[0]
    # Clean up
    slug = re.sub(r'[^a-zA-Z0-9-]', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug[:60]  # Max length

def extract_and_render(filepath):
    """Extract mermaid blocks, render to PNG, replace in file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all mermaid blocks
    pattern = r'```mermaid\n(.*?)```'
    matches = list(re.finditer(pattern, content, re.DOTALL))

    if not matches:
        return 0

    slug = get_slug(filepath)
    rendered = 0
    new_content = content

    for i, match in enumerate(reversed(matches)):  # Reverse to preserve positions
        idx = len(matches) - 1 - i  # Original index
        mermaid_code = match.group(1).strip()
        fig_name = f"{slug}-{idx+1:02d}"
        mmd_path = os.path.join(TEMP_DIR, f"{fig_name}.mmd")
        png_path = os.path.join(FIGURES_DIR, f"{fig_name}.png")

        # Write .mmd file
        with open(mmd_path, 'w', encoding='utf-8') as f:
            f.write(mermaid_code)

        # Render with mmdc (mermaid-cli v11)
        cmd = [
            "npx", "-y", "@mermaid-js/mermaid-cli",
            "-i", mmd_path,
            "-o", png_path,
            "-b", "white"
        ]
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30,
                shell=True
            )
            if result.returncode == 0 and os.path.exists(png_path):
                # Calculate relative path from markdown file to figures dir
                md_dir = os.path.dirname(filepath)
                rel_img_path = os.path.relpath(png_path, md_dir).replace("\\", "/")

                # Replace mermaid block with image reference
                # Keep the mermaid block as a comment and add image
                replacement = f"![{fig_name}]({rel_img_path})"
                new_content = new_content[:match.start()] + replacement + new_content[match.end():]
                rendered += 1
                print(f"  OK: {fig_name}.png")
            else:
                print(f"  FAIL: {fig_name} - {result.stderr[:200] if result.stderr else 'unknown error'}")
        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT: {fig_name}")
        except Exception as e:
            print(f"  ERROR: {fig_name} - {e}")

    if rendered > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  Updated {filepath} ({rendered} diagrams)")

    return rendered

def main():
    total = 0
    files_processed = 0

    for root, dirs, files in os.walk(REPORTS_DIR):
        for fname in sorted(files):
            if not fname.endswith('.md'):
                continue
            filepath = os.path.join(root, fname)
            with open(filepath, 'r', encoding='utf-8') as f:
                if '```mermaid' not in f.read():
                    continue

            print(f"\nProcessing: {os.path.relpath(filepath, REPORTS_DIR)}")
            count = extract_and_render(filepath)
            total += count
            if count > 0:
                files_processed += 1

    print(f"\n{'='*50}")
    print(f"Total: {total} diagrams rendered in {files_processed} files")
    print(f"Output: {FIGURES_DIR}")

if __name__ == "__main__":
    main()
