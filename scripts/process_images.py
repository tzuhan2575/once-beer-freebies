from pathlib import Path
from PIL import Image, ImageOps

RAW_DIR = Path("raw_images")
OUTPUT_DIR = Path("public/images")

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}

MAX_SIZE = 1600
QUALITY = 80


def process_image(input_path: Path, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(input_path) as img:
        img = ImageOps.exif_transpose(img)

        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")

        img.thumbnail((MAX_SIZE, MAX_SIZE))

        output_path = output_path.with_suffix(".webp")
        img.save(output_path, "WEBP", quality=QUALITY, method=6)


def main():
    if not RAW_DIR.exists():
        print(f"找不到原始圖片資料夾：{RAW_DIR}")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    success = 0
    failed = []

    for creator_dir in RAW_DIR.iterdir():
        if not creator_dir.is_dir():
            continue

        output_creator_dir = OUTPUT_DIR / creator_dir.name
        output_creator_dir.mkdir(parents=True, exist_ok=True)

        for file_path in creator_dir.iterdir():
            if not file_path.is_file():
                continue

            if file_path.suffix.lower() not in SUPPORTED_EXTS:
                print(f"略過不支援的檔案：{file_path}")
                continue

            total += 1
            output_file = output_creator_dir / f"{file_path.stem}.webp"

            try:
                process_image(file_path, output_file)
                success += 1
                print(f"完成：{file_path} -> {output_file}")
            except Exception as e:
                failed.append((file_path, str(e)))
                print(f"失敗：{file_path}，原因：{e}")

    print("\n處理完成")
    print(f"總圖片數：{total}")
    print(f"成功：{success}")
    print(f"失敗：{len(failed)}")

    if failed:
        print("\n以下圖片處理失敗，請檢查：")
        for path, error in failed:
            print(f"- {path}: {error}")


if __name__ == "__main__":
    main()