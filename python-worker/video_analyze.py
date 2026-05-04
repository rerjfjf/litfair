import sys
import base64
import json
import subprocess
import tempfile
from pathlib import Path
from groq import Groq

API_KEY = os.environ.get("GROQ_API_KEY")

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except FileNotFoundError:
        return False
    return True

def get_duration(video_path: str) -> float:
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", video_path
    ], capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except:
        return 0.0

def extract_audio(video_path: str, out_path: str):
    subprocess.run([
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-ar", "16000", "-ac", "1", "-f", "mp3", out_path
    ], capture_output=True, check=True)

def extract_frames(video_path: str, out_dir: str, count: int = 5):
    duration = get_duration(video_path)
    if duration <= 0:
        return
    interval = duration / (count + 1)
    for i in range(1, count + 1):
        ts = interval * i
        out = f"{out_dir}/frame_{i:02d}.jpg"
        subprocess.run([
            "ffmpeg", "-y", "-ss", str(ts), "-i", video_path,
            "-frames:v", "1", "-q:v", "2", out
        ], capture_output=True)

def transcribe_audio(client: Groq, audio_path: str) -> str:
    with open(audio_path, "rb") as f:
        response = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=(Path(audio_path).name, f),
            language="ru",
            response_format="text"
        )
    return response if isinstance(response, str) else str(response)

def analyze_frames(client: Groq, frame_paths: list) -> str:
    content = []
    for i, fp in enumerate(sorted(frame_paths)):
        b64 = base64.b64encode(Path(fp).read_bytes()).decode()
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
        content.append({"type": "text", "text": f"[Кадр {i+1} из {len(frame_paths)}]"})
    content.append({"type": "text", "text": (
        "Это кадры из буктрейлера по литературному произведению. Опиши:\n"
        "1. Что происходит на видео (сюжет, действия)\n"
        "2. Визуальный стиль (цвета, освещение, атмосфера)\n"
        "3. Насколько видео передаёт атмосферу книги\n"
        "Отвечай на русском, чётко и по делу."
    )})
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": content}],
        max_tokens=2048
    )
    return response.choices[0].message.content

def analyze_video(video_path: str) -> dict:
    if not check_ffmpeg():
        return {"error": "ffmpeg не найден"}

    client = Groq(api_key=API_KEY)

    with tempfile.TemporaryDirectory() as tmp:
        audio_path = f"{tmp}/audio.mp3"
        try:
            extract_audio(video_path, audio_path)
            transcript = transcribe_audio(client, audio_path)
        except Exception as e:
            transcript = ""

        extract_frames(video_path, tmp, count=4)
        frames = sorted(Path(tmp).glob("frame_*.jpg"))

        if frames:
            visual_desc = analyze_frames(client, list(frames))
        else:
            visual_desc = "Кадры не удалось извлечь"

    return {
        "transcript": transcript,
        "visual_description": visual_desc,
        "description": f"Видео проанализировано. Речь: {len(transcript)} симв. Кадров: {len(frames) if frames else 0}."
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Файл не указан"}))
        sys.exit(1)

    video_path = sys.argv[1]
    if not Path(video_path).exists():
        print(json.dumps({"error": f"Файл не найден: {video_path}"}))
        sys.exit(1)

    result = analyze_video(video_path)
    print(json.dumps(result, ensure_ascii=False))