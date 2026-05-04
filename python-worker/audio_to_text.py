import sys
import json
from pathlib import Path
from groq import Groq

API_KEY = os.environ.get("GROQ_API_KEY")
SUPPORTED = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg", ".flac"}

def transcribe(audio_path: str, language: str = "ru") -> dict:
    client = Groq(api_key=API_KEY)
    path = Path(audio_path)
    
    if path.suffix.lower() not in SUPPORTED:
        return {"error": f"Неподдерживаемый формат: {path.suffix}"}
    
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=(path.name, f),
            language=language,
            response_format="text"
        )
    
    text = response if isinstance(response, str) else str(response)
    
    return {
        "transcript": text,
        "language": language,
        "description": f"Аудиозапись распознана. Длина текста: {len(text)} символов."
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Файл не указан"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "ru"
    
    if not Path(audio_path).exists():
        print(json.dumps({"error": f"Файл не найден: {audio_path}"}))
        sys.exit(1)
    
    result = transcribe(audio_path, language)
    print(json.dumps(result, ensure_ascii=False))