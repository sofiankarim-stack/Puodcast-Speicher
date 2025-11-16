from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from elevenlabs import ElevenLabs, VoiceSettings
from emergentintegrations.llm.chat import LlmChat, UserMessage
import aiofiles
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Clients  
elevenlabs_client = ElevenLabs(api_key=os.environ.get('ELEVENLABS_API_KEY'))

# Emergent LLM integration
emergent_llm_key = os.environ.get('EMERGENT_LLM_KEY')

# Create audio storage directory
AUDIO_DIR = ROOT_DIR / "audio_files"
AUDIO_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# MODELS
# ============================================================================

class VoiceSettingsModel(BaseModel):
    stability: float = 0.75
    similarity_boost: float = 0.85
    style: float = 0.0
    use_speaker_boost: bool = True

class SpeakerSegment(BaseModel):
    speaker: str  # "MARKUS", "KLAUS", "FRANZ", "JOSEF"
    text: str
    start_position: int
    end_position: int

class EpisodeMetadata(BaseModel):
    title: str
    description: str
    episode_number: Optional[int] = None
    category: Optional[str] = "Podcast"
    host: Optional[str] = "Der Bazi mit Baraka"
    guests: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    thumbnail_url: Optional[str] = None
    publish_date: Optional[datetime] = None

class Episode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text_content: str
    metadata: EpisodeMetadata
    selected_voice: str = "markus"  # Default voice
    voice_settings: VoiceSettingsModel = Field(default_factory=VoiceSettingsModel)
    speaker_segments: Optional[List[SpeakerSegment]] = []
    audio_url: Optional[str] = None
    audio_duration: Optional[float] = None
    transcription: Optional[str] = None
    shownotes: Optional[str] = None
    status: str = "draft"  # draft, processing, published
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None

class EpisodeCreate(BaseModel):
    text_content: str
    metadata: EpisodeMetadata
    selected_voice: Optional[str] = "markus"
    voice_settings: Optional[VoiceSettingsModel] = Field(default_factory=VoiceSettingsModel)
    speaker_segments: Optional[List[SpeakerSegment]] = []

class EpisodeUpdate(BaseModel):
    text_content: Optional[str] = None
    metadata: Optional[EpisodeMetadata] = None
    selected_voice: Optional[str] = None
    voice_settings: Optional[VoiceSettingsModel] = None
    speaker_segments: Optional[List[SpeakerSegment]] = []
    status: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice: str = "markus"
    voice_settings: Optional[VoiceSettingsModel] = None

class ChatGPTRequest(BaseModel):
    prompt: str
    context: Optional[str] = None

class TranscriptionRequest(BaseModel):
    audio_url: str

class AnalyticsStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    episode_id: str
    downloads: int = 0
    listeners: int = 0
    average_listen_duration: float = 0.0
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MusicFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    file_url: str
    category: str  # intro, outro, transition, background
    duration: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================================================
# VOICE MAPPING (ElevenLabs Voice IDs)
# ============================================================================

VOICE_MAPPING = {
    "markus": "21m00Tcm4TlvDq8ikWAM",  # Rachel - will use for Bavarian neutral
    "klaus": "AZnzlk1XvdvUeBnXmlld",   # Domi - warm
    "franz": "ErXwobaYiN019PkySvjV",   # Antoni - authoritative
    "josef": "VR6AewLTigWG4xSOukaG",   # Arnold - regional
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def parse_speaker_segments(text: str) -> List[Dict[str, Any]]:
    """Parse text with [SPEAKER] tags into segments"""
    segments = []
    current_speaker = "markus"  # default
    lines = text.split('\n')
    current_text = []
    start_pos = 0
    
    for line in lines:
        # Check for speaker tags
        if line.strip().startswith('[') and ']' in line:
            # Save previous segment
            if current_text:
                segment_text = '\n'.join(current_text)
                segments.append({
                    "speaker": current_speaker.lower(),
                    "text": segment_text,
                    "start_position": start_pos,
                    "end_position": start_pos + len(segment_text)
                })
                start_pos += len(segment_text)
                current_text = []
            
            # Extract new speaker
            tag_end = line.index(']')
            speaker = line[1:tag_end].strip().lower()
            if speaker in VOICE_MAPPING:
                current_speaker = speaker
            
            # Add remaining text on this line
            remaining = line[tag_end+1:].strip()
            if remaining:
                current_text.append(remaining)
        else:
            current_text.append(line)
    
    # Add final segment
    if current_text:
        segment_text = '\n'.join(current_text)
        segments.append({
            "speaker": current_speaker.lower(),
            "text": segment_text,
            "start_position": start_pos,
            "end_position": start_pos + len(segment_text)
        })
    
    return segments


# ============================================================================
# API ENDPOINTS
# ============================================================================

@api_router.get("/")
async def root():
    return {"message": "Podcast App API - Der Bazi mit Baraka"}


# ============================================================================
# EPISODES CRUD
# ============================================================================

@api_router.post("/episodes", response_model=Episode)
async def create_episode(episode_input: EpisodeCreate):
    """Create a new episode"""
    try:
        # Parse speaker segments if present
        if not episode_input.speaker_segments:
            segments = parse_speaker_segments(episode_input.text_content)
            episode_input.speaker_segments = [SpeakerSegment(**seg) for seg in segments]
        
        # Auto-increment episode number
        latest_episode = await db.episodes.find_one(
            sort=[("metadata.episode_number", -1)]
        )
        if latest_episode and not episode_input.metadata.episode_number:
            episode_input.metadata.episode_number = latest_episode.get("metadata", {}).get("episode_number", 0) + 1
        elif not episode_input.metadata.episode_number:
            episode_input.metadata.episode_number = 1
        
        episode = Episode(**episode_input.model_dump())
        
        # Save to database
        doc = episode.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        if doc.get('published_at'):
            doc['published_at'] = doc['published_at'].isoformat()
        if doc.get('metadata', {}).get('publish_date'):
            doc['metadata']['publish_date'] = doc['metadata']['publish_date'].isoformat()
        
        await db.episodes.insert_one(doc)
        logger.info(f"Created episode: {episode.id}")
        
        return episode
    except Exception as e:
        logger.error(f"Error creating episode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/episodes", response_model=List[Episode])
async def get_episodes(limit: int = 50, skip: int = 0):
    """Get all episodes"""
    try:
        episodes = await db.episodes.find(
            {}, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        # Convert ISO strings back to datetime
        for ep in episodes:
            if isinstance(ep.get('created_at'), str):
                ep['created_at'] = datetime.fromisoformat(ep['created_at'])
            if isinstance(ep.get('updated_at'), str):
                ep['updated_at'] = datetime.fromisoformat(ep['updated_at'])
            if ep.get('published_at') and isinstance(ep['published_at'], str):
                ep['published_at'] = datetime.fromisoformat(ep['published_at'])
            if ep.get('metadata', {}).get('publish_date') and isinstance(ep['metadata']['publish_date'], str):
                ep['metadata']['publish_date'] = datetime.fromisoformat(ep['metadata']['publish_date'])
        
        return episodes
    except Exception as e:
        logger.error(f"Error fetching episodes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/episodes/{episode_id}", response_model=Episode)
async def get_episode(episode_id: str):
    """Get a single episode"""
    try:
        episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        # Convert ISO strings back to datetime
        if isinstance(episode.get('created_at'), str):
            episode['created_at'] = datetime.fromisoformat(episode['created_at'])
        if isinstance(episode.get('updated_at'), str):
            episode['updated_at'] = datetime.fromisoformat(episode['updated_at'])
        if episode.get('published_at') and isinstance(episode['published_at'], str):
            episode['published_at'] = datetime.fromisoformat(episode['published_at'])
        if episode.get('metadata', {}).get('publish_date') and isinstance(episode['metadata']['publish_date'], str):
            episode['metadata']['publish_date'] = datetime.fromisoformat(episode['metadata']['publish_date'])
        
        return episode
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/episodes/{episode_id}", response_model=Episode)
async def update_episode(episode_id: str, update_data: EpisodeUpdate):
    """Update an episode"""
    try:
        episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        # Prepare update
        update_dict = {k: v for k, v in update_data.model_dump(exclude_unset=True).items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Re-parse speaker segments if text changed
        if 'text_content' in update_dict and not update_data.speaker_segments:
            segments = parse_speaker_segments(update_dict['text_content'])
            update_dict['speaker_segments'] = segments
        
        await db.episodes.update_one(
            {"id": episode_id},
            {"$set": update_dict}
        )
        
        # Fetch updated episode
        updated_episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
        
        # Convert ISO strings back to datetime
        if isinstance(updated_episode.get('created_at'), str):
            updated_episode['created_at'] = datetime.fromisoformat(updated_episode['created_at'])
        if isinstance(updated_episode.get('updated_at'), str):
            updated_episode['updated_at'] = datetime.fromisoformat(updated_episode['updated_at'])
        if updated_episode.get('published_at') and isinstance(updated_episode['published_at'], str):
            updated_episode['published_at'] = datetime.fromisoformat(updated_episode['published_at'])
        if updated_episode.get('metadata', {}).get('publish_date') and isinstance(updated_episode['metadata']['publish_date'], str):
            updated_episode['metadata']['publish_date'] = datetime.fromisoformat(updated_episode['metadata']['publish_date'])
        
        logger.info(f"Updated episode: {episode_id}")
        return updated_episode
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating episode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: str):
    """Delete an episode"""
    try:
        result = await db.episodes.delete_one({"id": episode_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        logger.info(f"Deleted episode: {episode_id}")
        return {"message": "Episode deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting episode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TEXT-TO-SPEECH (ElevenLabs)
# ============================================================================

@api_router.post("/tts/generate")
async def generate_tts(request: TTSRequest):
    """Generate audio from text using ElevenLabs"""
    try:
        voice_id = VOICE_MAPPING.get(request.voice.lower(), VOICE_MAPPING["markus"])
        
        # Prepare voice settings
        voice_settings = VoiceSettings(
            stability=request.voice_settings.stability if request.voice_settings else 0.75,
            similarity_boost=request.voice_settings.similarity_boost if request.voice_settings else 0.85,
            style=request.voice_settings.style if request.voice_settings else 0.0,
            use_speaker_boost=request.voice_settings.use_speaker_boost if request.voice_settings else True
        )
        
        # Generate audio
        logger.info(f"Generating TTS with voice: {request.voice}")
        audio_generator = elevenlabs_client.text_to_speech.convert(
            voice_id=voice_id,
            text=request.text,
            model_id="eleven_multilingual_v2",
            voice_settings=voice_settings
        )
        
        # Save audio file
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        
        # Write audio chunks to file
        with open(audio_path, "wb") as audio_file:
            for chunk in audio_generator:
                audio_file.write(chunk)
        
        audio_url = f"/api/audio/{audio_filename}"
        logger.info(f"TTS generated successfully: {audio_url}")
        
        return {
            "audio_url": audio_url,
            "filename": audio_filename,
            "voice": request.voice
        }
    except Exception as e:
        logger.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@api_router.post("/tts/generate-episode/{episode_id}")
async def generate_episode_audio(episode_id: str):
    """Generate audio for an entire episode with multiple speakers"""
    try:
        episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        # Update status
        await db.episodes.update_one(
            {"id": episode_id},
            {"$set": {"status": "processing"}}
        )
        
        # Get speaker segments
        segments = episode.get('speaker_segments', [])
        if not segments:
            # Parse from text
            segments = parse_speaker_segments(episode['text_content'])
        
        # Generate audio for each segment
        audio_files = []
        for i, segment in enumerate(segments):
            voice_id = VOICE_MAPPING.get(segment['speaker'].lower(), VOICE_MAPPING["markus"])
            
            voice_settings = VoiceSettings(
                stability=episode.get('voice_settings', {}).get('stability', 0.75),
                similarity_boost=episode.get('voice_settings', {}).get('similarity_boost', 0.85),
                style=episode.get('voice_settings', {}).get('style', 0.0),
                use_speaker_boost=episode.get('voice_settings', {}).get('use_speaker_boost', True)
            )
            
            logger.info(f"Generating segment {i+1}/{len(segments)} with voice: {segment['speaker']}")
            audio_generator = elevenlabs_client.text_to_speech.convert(
                voice_id=voice_id,
                text=segment['text'],
                model_id="eleven_multilingual_v2",
                voice_settings=voice_settings
            )
            
            segment_filename = f"{episode_id}_segment_{i}.mp3"
            segment_path = AUDIO_DIR / segment_filename
            
            with open(segment_path, "wb") as audio_file:
                for chunk in audio_generator:
                    audio_file.write(chunk)
            
            audio_files.append(segment_filename)
        
        # For MVP, we'll return the first segment or concatenate later
        # In production, use FFmpeg to concatenate audio files
        final_audio_url = f"/api/audio/{audio_files[0]}" if audio_files else None
        
        # Update episode with audio URL
        await db.episodes.update_one(
            {"id": episode_id},
            {"$set": {
                "audio_url": final_audio_url,
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Episode audio generated: {episode_id}")
        
        return {
            "episode_id": episode_id,
            "audio_url": final_audio_url,
            "segments": len(audio_files)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating episode audio: {str(e)}")
        # Update status to error
        await db.episodes.update_one(
            {"id": episode_id},
            {"$set": {"status": "error"}}
        )
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """Serve audio files"""
    audio_path = AUDIO_DIR / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg")


# ============================================================================
# ChatGPT Integration (Smart Suggestions)
# ============================================================================

@api_router.post("/chatgpt/suggest")
async def chatgpt_suggestion(request: ChatGPTRequest):
    """Get ChatGPT suggestions for titles, descriptions, shownotes, etc."""
    try:
        system_message = "Du bist ein hilfreicher Assistent für Podcast-Produzenten. Antworte auf Deutsch und sei kreativ aber präzise."
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": request.prompt}
        ]
        
        if request.context:
            messages.insert(1, {"role": "user", "content": f"Kontext: {request.context}"})
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        suggestion = response.choices[0].message.content
        logger.info("ChatGPT suggestion generated")
        
        return {
            "suggestion": suggestion,
            "prompt": request.prompt
        }
    except Exception as e:
        logger.error(f"Error with ChatGPT: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ChatGPT error: {str(e)}")


@api_router.post("/chatgpt/generate-shownotes/{episode_id}")
async def generate_shownotes(episode_id: str):
    """Generate shownotes for an episode"""
    try:
        episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        prompt = f"""
        Erstelle professionelle Shownotes für diese Podcast-Episode:
        
        Titel: {episode['metadata']['title']}
        Inhalt: {episode['text_content'][:1000]}...
        
        Die Shownotes sollten enthalten:
        1. Eine kurze Zusammenfassung (2-3 Sätze)
        2. Hauptthemen mit Zeitmarkern (geschätzt)
        3. Wichtige Erwähnungen oder Links
        4. Keywords für SEO
        
        Format: Markdown
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Du bist ein Experte für Podcast-Shownotes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        shownotes = response.choices[0].message.content
        
        # Update episode with shownotes
        await db.episodes.update_one(
            {"id": episode_id},
            {"$set": {"shownotes": shownotes}}
        )
        
        logger.info(f"Shownotes generated for episode: {episode_id}")
        
        return {
            "episode_id": episode_id,
            "shownotes": shownotes
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating shownotes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ANALYTICS
# ============================================================================

@api_router.get("/analytics/dashboard")
async def get_dashboard_stats():
    """Get dashboard analytics"""
    try:
        # Total episodes
        total_episodes = await db.episodes.count_documents({})
        
        # Published episodes
        published_episodes = await db.episodes.count_documents({"status": "published"})
        
        # Total downloads (mock data for MVP)
        total_downloads = published_episodes * 150  # Average
        
        # Recent episodes
        recent_episodes = await db.episodes.find(
            {}, {"_id": 0}
        ).sort("created_at", -1).limit(3).to_list(3)
        
        # Convert dates
        for ep in recent_episodes:
            if isinstance(ep.get('created_at'), str):
                ep['created_at'] = datetime.fromisoformat(ep['created_at'])
            if isinstance(ep.get('updated_at'), str):
                ep['updated_at'] = datetime.fromisoformat(ep['updated_at'])
        
        return {
            "total_episodes": total_episodes,
            "published_episodes": published_episodes,
            "total_downloads": total_downloads,
            "average_listeners": 120,
            "recent_episodes": recent_episodes,
            "upcoming_episodes": []  # TODO: Add scheduled episodes
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/analytics/episode/{episode_id}")
async def get_episode_analytics(episode_id: str):
    """Get analytics for a specific episode"""
    try:
        episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")
        
        # Mock analytics data for MVP
        return {
            "episode_id": episode_id,
            "downloads": 245,
            "listeners": 198,
            "average_listen_duration": 78.5,  # percentage
            "top_countries": ["Germany", "Austria", "Switzerland"],
            "traffic_sources": {
                "spotify": 45,
                "apple_podcasts": 30,
                "direct": 15,
                "other": 10
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episode analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# MUSIC LIBRARY
# ============================================================================

@api_router.post("/music/upload")
async def upload_music(file: UploadFile = File(...), category: str = "background"):
    """Upload music or sound effects"""
    try:
        # Save file
        music_filename = f"{uuid.uuid4()}_{file.filename}"
        music_path = AUDIO_DIR / music_filename
        
        async with aiofiles.open(music_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Create music entry
        music_file = MusicFile(
            name=file.filename,
            file_url=f"/api/audio/{music_filename}",
            category=category
        )
        
        doc = music_file.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.music_library.insert_one(doc)
        logger.info(f"Music file uploaded: {file.filename}")
        
        return music_file
    except Exception as e:
        logger.error(f"Error uploading music: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/music", response_model=List[MusicFile])
async def get_music_library(category: Optional[str] = None):
    """Get music library"""
    try:
        query = {"category": category} if category else {}
        music_files = await db.music_library.find(query, {"_id": 0}).to_list(100)
        
        for file in music_files:
            if isinstance(file.get('created_at'), str):
                file['created_at'] = datetime.fromisoformat(file['created_at'])
        
        return music_files
    except Exception as e:
        logger.error(f"Error fetching music library: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# VOICES (Available voices info)
# ============================================================================

@api_router.get("/voices")
async def get_available_voices():
    """Get available voices"""
    return {
        "voices": [
            {
                "id": "markus",
                "name": "Markus",
                "description": "Neutral, professionell, klare Aussprache",
                "best_for": "Nachrichten, Tutorials",
                "accent": "Bayerisch Neutral"
            },
            {
                "id": "klaus",
                "name": "Klaus",
                "description": "Warm, sympathisch, etwas Dialekt",
                "best_for": "Geschichten, Interviews",
                "accent": "Bayerisch Warm"
            },
            {
                "id": "franz",
                "name": "Franz",
                "description": "Selbstbewusst, autoritär, tief",
                "best_for": "Kommentare, Debatten",
                "accent": "Bayerisch Autoritär"
            },
            {
                "id": "josef",
                "name": "Josef",
                "description": "Starker Dialekt, sehr authentisch",
                "best_for": "Comedy, Authentizität",
                "accent": "Bayerisch Regional"
            }
        ]
    }


# Include the router in the main app
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
    client.close()
