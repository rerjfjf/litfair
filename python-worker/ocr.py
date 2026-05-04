import sys
import base64
import json
from pathlib import Path
from groq import Groq

API_KEY = os.environ.get("GROQ_API_KEY")

def read_handwriting(image_path: str) -> dict:
    client = Groq(api_key=API_KEY)
    image_data = Path(image_path).read_bytes()
    b64 = base64.b64encode(image_data).decode()
    suffix = Path(image_path).suffix.lower()
    mime_types = {".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp"}
    mime_type = mime_types.get(suffix, "image/jpeg")

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                {"type": "text", "text": (
                    "Прочитай весь рукописный текст на этом изображении дословно. Будь предельно внимателе , не допускай ошибок, будь точен"
                    "Также опиши: оформление письма, почерк, структуру, общее впечатление. "
                    "Выведи ТОЛЬКО JSON без markdown:\n"
                    '{"text": "весь текст письма", "description": "описание оформления и стиля"}'
                )}
            ]
        }],
        max_tokens=2048
    )
    
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except:
        return {"text": raw, "description": ""}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Файл не указан"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    if not Path(image_path).exists():
        print(json.dumps({"error": f"Файл не найден: {image_path}"}))
        sys.exit(1)
    
    result = read_handwriting(image_path)
    print(json.dumps(result, ensure_ascii=False))