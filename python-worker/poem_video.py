import sys
import json
import subprocess
import tempfile
from pathlib import Path
from groq import Groq

API_KEY = os.environ.get("GROQ_API_KEY")

def check_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except FileNotFoundError:
        return False

def extract_audio(video_path: str, out_path: str):
    subprocess.run([
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-ar", "16000", "-ac", "1", "-f", "mp3", out_path
    ], capture_output=True, check=True)

def transcribe(audio_path: str) -> str:
    client = Groq(api_key=API_KEY)
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=(Path(audio_path).name, f),
            language="ru",
            response_format="text"
        )
    return response if isinstance(response, str) else str(response)

def poem_from_video(video_path: str) -> dict:
    if not check_ffmpeg():
        return {"error": "ffmpeg не найден"}

    with tempfile.TemporaryDirectory() as tmp:
        audio_path = f"{tmp}/audio.mp3"
        try:
            extract_audio(video_path, audio_path)
            text = transcribe(audio_path)
        except Exception as e:
            return {"error": str(e)}

    return {
        "transcript": text,
        "description": f"Стихотворение распознано из видео. Длина: {len(text)} символов."
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Файл не указан"}))
        sys.exit(1)
    if not Path(sys.argv[1]).exists():
        print(json.dumps({"error": f"Файл не найден: {sys.argv[1]}"}))
        sys.exit(1)
    result = poem_from_video(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False))