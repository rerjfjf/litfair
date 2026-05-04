import sys
import base64
import json
import subprocess
import tempfile
from pathlib import Path
from groq import Groq

API_KEY = os.environ.get("GROQ_API_KEY")

def extract_images_from_pdf(pdf_path: str, out_dir: str) -> list:
    subprocess.run(["pdfimages", "-png", pdf_path, f"{out_dir}/img"], capture_output=True)
    images = sorted(Path(out_dir).glob("img-*.png"))
    return [img for img in images if img.stat().st_size > 10_000]

def pick_frames(images: list) -> list:
    step = 2 if len(images) <= 8 else 3
    return images[::step]

def describe_image(client: Groq, image_path: Path) -> str:
    b64 = base64.b64encode(image_path.read_bytes()).decode()
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role":"user","content":[
            {"type":"image_url","image_url":{"url":f"data:image/png;base64,{b64}"}},
            {"type":"text","text":"Опиши максимально подробно что на изображении: люди, действия, предметы, место, атмосфера, цвета, тексты. Отвечай на русском."}
        ]}],
        max_tokens=1024
    )
    return response.choices[0].message.content

def analyze_pdf(pdf_path: str) -> dict:
    client = Groq(api_key=API_KEY)
    with tempfile.TemporaryDirectory() as tmp:
        images = extract_images_from_pdf(pdf_path, tmp)
        if not images:
            return {"error": "Изображения не найдены в PDF", "descriptions": []}

        selected = pick_frames(images)
        descriptions = []
        for i, img_path in enumerate(selected):
            desc = describe_image(client, img_path)
            descriptions.append({"index": i+1, "description": desc})

    combined = "\n\n".join([f"Фото {d['index']}: {d['description']}" for d in descriptions])
    return {
        "descriptions": descriptions,
        "text": combined,
        "description": f"PDF буклет проанализирован. Найдено и описано {len(descriptions)} изображений."
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Файл не указан"}))
        sys.exit(1)
    if not Path(sys.argv[1]).exists():
        print(json.dumps({"error": f"Файл не найден: {sys.argv[1]}"}))
        sys.exit(1)
    result = analyze_pdf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))