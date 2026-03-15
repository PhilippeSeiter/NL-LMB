from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import logging
import uuid
import base64
import io
import zipfile
import re
import requests as req_lib
from datetime import datetime, timezone
from pathlib import Path
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import fal_client
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
FAL_KEY = os.environ.get('FAL_KEY', '')
FLUX_MODEL = os.environ.get('FLUX_MODEL', 'fal-ai/flux/dev')
BACKEND_URL = os.environ.get('BACKEND_URL', '')

os.environ["FAL_KEY"] = FAL_KEY
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

mongo_url = os.environ['MONGO_URL']
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ['DB_NAME']]

REFS_DIR = ROOT_DIR / "static" / "references"
REFS_DIR.mkdir(parents=True, exist_ok=True)

UPLOADS_DIR = ROOT_DIR / "static" / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ILLUS_REFS_DIR = ROOT_DIR / "static" / "references" / "illustrations"

app = FastAPI()
app.mount("/api/static", StaticFiles(directory=str(ROOT_DIR / "static")), name="static")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# --- Models ---

class PictoState(BaseModel):
    propositions: List[str] = []
    selections: List[int] = []
    images: List[str] = []
    valide: bool = False
    nom_fichiers: List[str] = []


class IllustrationState(BaseModel):
    propositions: List[str] = []
    selection: int = -1
    image: str = ""
    valide: bool = False
    nom_fichier: str = ""


class Article(BaseModel):
    index: int
    titre: str
    original_file_key: str = ""
    picto: PictoState = Field(default_factory=PictoState)
    illustration: IllustrationState = Field(default_factory=IllustrationState)


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    titre: str
    date_creation: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    statut: str = "en_cours"
    engine: str = "fal"
    articles: List[Article] = []


class SessionCreate(BaseModel):
    titre: str
    engine: str = "fal"
    articles: List[dict] = []


# --- Helpers ---

SYSTEM_PICTOS = (
    "Tu es un directeur artistique + icon designer pour Les Maîtres Bâtisseurs (LMB). "
    "À partir d'un titre d'article, tu proposes 10 idées numérotées de pictogrammes 3D pour illustrer ce titre. "
    "Chaque idée est décrite en 1 ligne (ce qu'on voit dans l'image). "
    "Tu termines par : \"Tu choisis quels numéros ?\" "
    "Règles : objets 3D glossy premium, fond blanc, format carré 1:1, zéro texte lisible, lisible en petit, style emoji 3D premium sérieux."
)

SYSTEM_ILLUSTRATIONS = (
    "Tu es un directeur artistique pour Les Maîtres Bâtisseurs (LMB). "
    "À partir d'un titre d'article, tu proposes 4 idées numérotées d'illustrations éditoriales 16/9. "
    "Chaque idée décrit concrètement ce qu'on verrait dans l'image. "
    "Style : scrapbook / textures / collage éditorial moderne, premium, lisible, expressif. "
    "Zéro texte lisible dans l'image. Tu termines par : \"Tu choisis quel numéro ?\""
)

AUTO_SELECT_PICTOS = (
    "Tu es un directeur artistique pour Les Maîtres Bâtisseurs. "
    "On te donne une liste numérotée de 10 idées de pictogrammes 3D. "
    "Choisis les 2 numéros qui illustrent le mieux le titre de l'article. "
    "Réponds UNIQUEMENT avec 2 chiffres séparés par une virgule, ex : 3,7"
)

AUTO_SELECT_ILLUS = (
    "Tu es un directeur artistique pour Les Maîtres Bâtisseurs. "
    "On te donne une liste numérotée de 4 idées d'illustrations éditoriales. "
    "Choisis le numéro qui illustre le mieux le titre de l'article. "
    "Réponds UNIQUEMENT avec 1 chiffre, ex : 2"
)


def parse_numbered_list(text: str, max_items: int = 10) -> List[str]:
    lines = text.strip().split('\n')
    results = []
    for line in lines:
        line = line.strip()
        match = re.match(r'^(\d+)[.):\-\s]+(.+)', line)
        if match:
            item = match.group(2).strip()
            item = re.sub(r'\*\*(.+?)\*\*', r'\1', item)
            if item:
                results.append(item)
    return results[:max_items]


# --- Session Routes ---

@api_router.get("/sessions")
async def get_sessions():
    sessions = await db.sessions.find({}, {"_id": 0}).sort("date_creation", -1).to_list(1000)
    return sessions


@api_router.post("/sessions")
async def create_session(data: SessionCreate):
    articles = []
    for a in data.articles:
        art = Article(
            index=a.get("index", 1),
            titre=a.get("titre", ""),
            original_file_key=a.get("original_file_key", ""),
        )
        articles.append(art)
    session = Session(titre=data.titre, engine=data.engine, articles=articles)
    doc = session.model_dump()
    await db.sessions.insert_one(doc)
    return session.model_dump()


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    return session


@api_router.put("/sessions/{session_id}")
async def update_session(session_id: str, updates: dict):
    updates.pop("_id", None)
    await db.sessions.update_one({"id": session_id}, {"$set": updates})
    updated = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    return updated


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.sessions.delete_one({"id": session_id})
    return {"message": "Session supprimée"}


# --- OCR ---

@api_router.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
    content = await file.read()
    original_content = content  # conserver l'original avant resize

    try:
        from PIL import Image as PILImage
        img = PILImage.open(io.BytesIO(content))
        max_size = 1200
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), PILImage.LANCZOS)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        content = buffer.getvalue()
    except Exception as e:
        logger.warning(f"Image resize skipped: {e}")

    base64_image = base64.b64encode(content).decode("utf-8")

    chat = LlmChat(
        api_key=OPENAI_API_KEY,
        session_id=f"ocr-{uuid.uuid4()}",
        system_message=(
            "Tu es un assistant d'extraction de texte. "
            "Tu reçois une image d'article de newsletter. "
            "Extrais uniquement le titre principal de l'article visible dans cette image. "
            "Réponds avec le titre uniquement, sans ponctuation ni explication supplémentaire."
        )
    ).with_model("openai", "gpt-4o-mini")

    image_content = ImageContent(image_base64=base64_image)
    user_message = UserMessage(
        text="Extrais le titre principal de cet article. Réponds avec le titre uniquement.",
        file_contents=[image_content]
    )

    titre = await chat.send_message(user_message)

    # Sauvegarde de l'image originale
    file_key = str(uuid.uuid4())
    save_path = UPLOADS_DIR / f"{file_key}.png"
    with open(save_path, "wb") as f:
        f.write(original_content)

    return {"titre": titre.strip(), "file_key": file_key}


# --- Propositions ---

@api_router.post("/propositions/pictos")
async def get_picto_propositions(data: dict):
    titre = data.get("titre", "")
    auto = data.get("auto_select", False)
    chat = LlmChat(
        api_key=OPENAI_API_KEY,
        session_id=f"pictos-{uuid.uuid4()}",
        system_message=SYSTEM_PICTOS
    ).with_model("openai", "gpt-4o-mini")

    response = await chat.send_message(UserMessage(text=f"Titre de l'article : {titre}"))
    propositions = parse_numbered_list(response, max_items=10)

    auto_selections = []
    if auto and propositions:
        sel_chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"auto-pictos-{uuid.uuid4()}",
            system_message=AUTO_SELECT_PICTOS
        ).with_model("openai", "gpt-4o-mini")
        sel_resp = await sel_chat.send_message(UserMessage(
            text=f"Titre : {titre}\n\n" + "\n".join(f"{i+1}. {p}" for i, p in enumerate(propositions))
        ))
        nums = re.findall(r'\d+', sel_resp)
        auto_selections = [int(n) for n in nums[:2] if 1 <= int(n) <= len(propositions)]
        if len(auto_selections) < 2 and len(propositions) >= 2:
            auto_selections = [1, 2]

    return {"propositions": propositions, "raw": response, "auto_selections": auto_selections}


@api_router.post("/propositions/illustrations")
async def get_illustration_propositions(data: dict):
    titre = data.get("titre", "")
    auto = data.get("auto_select", False)
    chat = LlmChat(
        api_key=OPENAI_API_KEY,
        session_id=f"illus-{uuid.uuid4()}",
        system_message=SYSTEM_ILLUSTRATIONS
    ).with_model("openai", "gpt-4o-mini")

    response = await chat.send_message(UserMessage(text=f"Titre de l'article : {titre}"))
    propositions = parse_numbered_list(response, max_items=4)

    auto_selection = -1
    if auto and propositions:
        sel_chat = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"auto-illus-{uuid.uuid4()}",
            system_message=AUTO_SELECT_ILLUS
        ).with_model("openai", "gpt-4o-mini")
        sel_resp = await sel_chat.send_message(UserMessage(
            text=f"Titre : {titre}\n\n" + "\n".join(f"{i+1}. {p}" for i, p in enumerate(propositions))
        ))
        nums = re.findall(r'\d+', sel_resp)
        auto_selection = int(nums[0]) if nums and 1 <= int(nums[0]) <= len(propositions) else 1

    return {"propositions": propositions, "raw": response, "auto_selection": auto_selection}


# --- Image Generation ---

@api_router.post("/generate/picto")
async def generate_picto(data: dict):
    proposition = data.get("proposition", "")
    article_index = data.get("article_index", 1)
    picto_number = data.get("picto_number", 1)
    engine = data.get("engine", "fal")

    date_str = datetime.now().strftime("%Y%m%d")
    article_str = str(article_index).zfill(2)
    nom_fichier = f"Picto_{picto_number}_Article{article_str}_LMB_{date_str}.png"

    if engine == "openai":
        prompt = (
            f"A single premium 3D glossy icon for a newsletter article about: {proposition}. "
            "Style: isolated 3D object with glossy surfaces, soft studio lighting, vivid saturated colors, "
            "pure white background, centered composition, square 1:1 format, "
            "professional premium icon design like a high-end emoji 3D render. "
            "Absolutely no text, no letters, no numbers visible in the image."
        )
        response = await openai_client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
            quality="medium",
            n=1,
        )
        img_data = response.data[0]
        if img_data.b64_json:
            image_bytes = base64.b64decode(img_data.b64_json)
        else:
            image_bytes = req_lib.get(img_data.url, timeout=60).content
        file_key = str(uuid.uuid4())
        save_path = UPLOADS_DIR / f"{file_key}.png"
        save_path.write_bytes(image_bytes)
        image_url = f"{BACKEND_URL}/api/static/uploads/{file_key}.png"
    else:
        # FAL.ai — comportement actuel
        ref_files = ["picto3.png", "picto5.png", "picto6.png"]
        ref_urls = [
            f"{BACKEND_URL}/api/static/references/{f}"
            for f in ref_files
            if (REFS_DIR / f).exists()
        ]

        if ref_urls:
            ref_tags = " ".join(f"@image{i+1}" for i in range(len(ref_urls)))
            prompt = (
                f"Generate a new premium 3D icon in the exact same visual style as {ref_tags}: "
                f"{proposition}. "
                "Same glossy 3D render, same soft studio lighting, same vivid colors, same premium quality. "
                "Square format, centered object, no text, no letters."
            )
            handler = await fal_client.submit_async(
                "fal-ai/flux-2/edit",
                arguments={
                    "prompt": prompt,
                    "image_urls": ref_urls,
                    "image_size": "square_hd",
                    "num_inference_steps": 28,
                    "guidance_scale": 2.5,
                    "num_images": 1,
                    "output_format": "png",
                }
            )
        else:
            prompt = (
                f"A single premium 3D rendered icon, centered, square composition, "
                f"pure white background, glossy 3D object, soft studio lighting, "
                f"vivid colors, no text, no letters: {proposition}. "
                "Photorealistic quality, smooth surfaces, professional icon design."
            )
            handler = await fal_client.submit_async(
                FLUX_MODEL,
                arguments={
                    "prompt": prompt,
                    "image_size": "square_hd",
                    "num_inference_steps": 28,
                    "guidance_scale": 3.5,
                    "num_images": 1,
                }
            )
        result = await handler.get()
        image_url = result["images"][0]["url"]

    return {"image_url": image_url, "nom_fichier": nom_fichier}


@api_router.post("/generate/illustration")
async def generate_illustration(data: dict):
    proposition = data.get("proposition", "")
    article_index = data.get("article_index", 1)
    engine = data.get("engine", "fal")

    date_str = datetime.now().strftime("%Y%m%d")
    article_str = str(article_index).zfill(2)
    nom_fichier = f"Illustration_Article{article_str}_LMB_{date_str}.png"

    if engine == "openai":
        prompt = (
            f"An editorial illustration for a newsletter article about: {proposition}. "
            "Style: scrapbook collage editorial, mix of photography fragments, geometric shapes, "
            "paper textures, torn edges, modern magazine layout, expressive dynamic composition, "
            "premium editorial quality, rich colors, layered visual storytelling. "
            "16:9 landscape format. Absolutely no readable text, no letters visible."
        )
        response = await openai_client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1536x1024",
            quality="medium",
            n=1,
        )
        img_data = response.data[0]
        if img_data.b64_json:
            image_bytes = base64.b64decode(img_data.b64_json)
        else:
            image_bytes = req_lib.get(img_data.url, timeout=60).content
        file_key = str(uuid.uuid4())
        save_path = UPLOADS_DIR / f"{file_key}.png"
        save_path.write_bytes(image_bytes)
        image_url = f"{BACKEND_URL}/api/static/uploads/{file_key}.png"
    else:
        # FAL.ai — comportement actuel
        illus_ref_files = ["illus1.png", "illus2.png", "illus3.png"]
        illus_ref_urls = [
            f"{BACKEND_URL}/api/static/references/illustrations/{f}"
            for f in illus_ref_files
            if (ILLUS_REFS_DIR / f).exists()
        ]

        if illus_ref_urls:
            ref_tags = " ".join(f"@image{i+1}" for i in range(len(illus_ref_urls)))
            prompt = (
                f"Generate a new editorial illustration in the exact same visual style as {ref_tags}: "
                f"{proposition}. "
                "Same scrapbook collage style, same textures, same composition quality, "
                "16:9 landscape format, no readable text."
            )
            handler = await fal_client.submit_async(
                "fal-ai/flux-2/edit",
                arguments={
                    "prompt": prompt,
                    "image_urls": illus_ref_urls,
                    "image_size": {"width": 1792, "height": 1024},
                    "num_inference_steps": 28,
                    "guidance_scale": 2.5,
                    "num_images": 1,
                    "output_format": "png",
                }
            )
        else:
            prompt = (
                f"Editorial illustration, 16:9 landscape format, scrapbook collage style, "
                f"modern premium editorial, expressive, no text, no letters: {proposition}. "
                "High quality magazine editorial, textured collage."
            )
            handler = await fal_client.submit_async(
                FLUX_MODEL,
                arguments={
                    "prompt": prompt,
                    "image_size": {"width": 1792, "height": 1024},
                    "num_inference_steps": 28,
                    "guidance_scale": 3.5,
                    "num_images": 1,
                }
            )
        result = await handler.get()
        image_url = result["images"][0]["url"]

    return {"image_url": image_url, "nom_fichier": nom_fichier}


# --- Export ZIP ---

@api_router.get("/sessions/{session_id}/export")
async def export_session_zip(session_id: str):
    session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    zip_buffer = io.BytesIO()

    def build_zip():
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            date_str = datetime.now().strftime("%Y%m%d")
            for article in session.get("articles", []):
                art_str = str(article.get("index", 0)).zfill(2)

                # Image originale uploadée
                file_key = article.get("original_file_key", "")
                if file_key:
                    orig_path = UPLOADS_DIR / f"{file_key}.png"
                    if orig_path.exists():
                        nom_orig = f"Article{art_str}_LMB_{date_str}.png"
                        zf.writestr(nom_orig, orig_path.read_bytes())

                # Pictos générés
                picto = article.get("picto", {})
                for img_url, nom in zip(picto.get("images", []), picto.get("nom_fichiers", [])):
                    if img_url:
                        try:
                            resp = req_lib.get(img_url, timeout=30)
                            if resp.status_code == 200:
                                zf.writestr(nom, resp.content)
                        except Exception as e:
                            logger.error(f"Download error {img_url}: {e}")

                # Illustration générée
                illus = article.get("illustration", {})
                img_url = illus.get("image", "")
                nom = illus.get("nom_fichier", "")
                if img_url and nom:
                    try:
                        resp = req_lib.get(img_url, timeout=30)
                        if resp.status_code == 200:
                            zf.writestr(nom, resp.content)
                    except Exception as e:
                        logger.error(f"Download error {img_url}: {e}")

    await run_in_threadpool(build_zip)
    zip_buffer.seek(0)

    await db.sessions.update_one({"id": session_id}, {"$set": {"statut": "terminee"}})

    titre_safe = re.sub(r'[^\w\-]', '_', session.get("titre", "session"))[:40]
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={titre_safe}.zip"}
    )


# --- Health ---

@api_router.get("/")
async def root():
    return {"message": "LMB Illustrations API — OK"}


# --- App setup ---

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    db_client.close()
