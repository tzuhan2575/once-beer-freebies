from pathlib import Path
import shutil

RAW_DIR = Path("raw_images")


def clear_raw_images():
    if not RAW_DIR.exists():
        print(f"找不到資料夾：{RAW_DIR}")
        return

    if not RAW_DIR.is_dir():
        print(f"{RAW_DIR} 不是資料夾")
        return

    deleted_count = 0

    for item in RAW_DIR.iterdir():
        try:
            if item.is_dir():
                shutil.rmtree(item)
                print(f"已刪除資料夾：{item}")
            else:
                item.unlink()
                print(f"已刪除檔案：{item}")

            deleted_count += 1

        except Exception as e:
            print(f"刪除失敗：{item}，原因：{e}")

    print(f"\n清理完成，共刪除 {deleted_count} 個項目。")
    print(f"已保留資料夾：{RAW_DIR}")


if __name__ == "__main__":
    clear_raw_images()