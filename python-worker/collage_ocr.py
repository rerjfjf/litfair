import sys
import base64
import json
import subprocess
from pathlib import Path
from groq import Groq

API_KEY = os.environ.get("GROQ_API_KEY")

def convert_to_jpeg(image_path: str) -> str:
    out_path = str(image_path) + "_converted.jpg"
    try:
        subprocess.run(["sips", "-s", "format", "jpeg", image_path, "--out", out_path], capture_output=True, check=True)
        return out_path
    except Exception:
        return image_path

def analyze_collage(image_path: str) -> dict:
    client = Groq(api_key=API_KEY)
    converted = convert_to_jpeg(image_path)
    b64 = base64.b64encode(Path(converted).read_bytes()).decode()

    try:
        text_response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                {"type": "text", "text": "Прочитай весь текст на этом коллаже дословно. Если слово неразборчиво — напиши [?]. Выведи только текст, без комментариев."}
            ]}],
            max_tokens=2048
        )

        desc_response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                {"type": "text", "text": "Опиши подробно каждую часть коллажа: что изображено, общая тема и настроение, цвета, стиль оформления, связь с литературным произведением. Отвечай на русском."}
            ]}],
            max_tokens=1024
        )

        return {
            "text": text_response.choices[0].message.content,
            "description": desc_response.choices[0].message.content
        }
    finally:
        if converted != image_path and Path(converted).exists():
            Path(converted).unlink()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Файл не указан"}))
        sys.exit(1)
    if not Path(sys.argv[1]).exists():
        print(json.dumps({"error": f"Файл не найден: {sys.argv[1]}"}))
        sys.exit(1)
    result = analyze_collage(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))