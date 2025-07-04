from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from openai import OpenAI  # type: ignore
import os
import asyncio
from datetime import datetime
import json
from database import SessionLocal
from models import Scenario, ScenarioSkill, Evaluation, EvaluationScore, CoachFeedback
from supabase_client import supabase
from coach_prompts import DEBRIEF_PROMPT, Q_AND_A_PROMPT, HINT_PROMPT
from deepgram import DeepgramClient, PrerecordedOptions
from elevenlabs.client import ElevenLabs
import base64

app = FastAPI()

# Configure CORS for all origins, methods, and headers (MVP settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    scenario_id: str
    history: List[str]
    message: str
    current_emotional_state: str


class EvaluationRequest(BaseModel):
    scenario_id: str
    transcript: str


# Shared credentials schema for auth endpoints
class AuthRequest(BaseModel):
    email: str
    password: str
    username: str


class SignupRequest(BaseModel):
    email: str
    password: str
    username: str           # required only when signing up


class LoginRequest(BaseModel):
    email: str
    password: str           # no username here


class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None


# AI Coach Request Models
class CoachFeedbackRequest(BaseModel):
    evaluation_id: int


class CoachChatRequest(BaseModel):
    question: str
    chat_history: List[str] = []


class CoachHintRequest(BaseModel):
    scenario_id: str
    conversation_history: List[str]


@app.get("/")
async def read_root():
    return {"status": "ok"}


@app.get("/api/scenarios")
async def list_scenarios():
    """Return a list of all scenarios with basic metadata."""
    session = SessionLocal()
    try:
        scenarios = session.query(Scenario).all()
        return [
            {
                "id": s.id,
                "title": s.title,
                "learning_path": s.learning_path,
                "difficulty": s.difficulty,
            }
            for s in scenarios
        ]
    finally:
        session.close()


@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Return detailed information for a single scenario, including required skills."""
    session = SessionLocal()
    try:
        scenario = session.query(Scenario).filter(Scenario.id == scenario_id).first()
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found.")

        skills = [skill.skill_name for skill in scenario.skills]

        return {
            "id": scenario.id,
            "title": scenario.title,
            "learning_path": scenario.learning_path,
            "difficulty": scenario.difficulty,
            "goal": scenario.goal,
            "persona_prompt": scenario.persona_prompt,
            "opening_line": scenario.opening_line,
            "voice_id": scenario.voice_id,
            "message_limit": scenario.message_limit,
            "skills": skills,
        }
    finally:
        session.close()


@app.post("/api/chat")
async def chat_endpoint(chat: ChatMessage):
    """Generate a chat response using the OpenAI GPT model with emotional state machine."""
    # Fetch scenario persona prompt from DB
    session = SessionLocal()
    try:
        scenario = session.query(Scenario).filter(Scenario.id == chat.scenario_id).first()
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found.")

        base_persona_prompt = scenario.persona_prompt
    finally:
        session.close()

    client = OpenAI()  # Uses OPENAI_API_KEY from environment variables

    # Step 1: Determine new emotional state using preliminary AI call
    emotional_state_prompt = (
        f"The patient's current emotional state is {chat.current_emotional_state}. "
        f"The Doctor just said: {chat.message}. "
        "Based on this, what should the patient's new emotional state be? "
        "Choose only one from this list: Calm, Cooperative, Resistant, Anxious, Agitated."
    )

    try:
        emotional_state_completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": emotional_state_prompt}]
        )
        new_emotional_state = (emotional_state_completion.choices[0].message.content or "").strip()
        
        # Validate the emotional state is one of the allowed values
        allowed_states = ["Calm", "Cooperative", "Resistant", "Anxious", "Agitated"]
        if new_emotional_state not in allowed_states:
            # Default to current state if AI returns invalid response
            new_emotional_state = chat.current_emotional_state
            
    except Exception as e:
        print(f"Emotional state determination failed: {str(e)}")
        # Default to current state if call fails
        new_emotional_state = chat.current_emotional_state

        # Step 2: Build enhanced persona prompt with emotional state
    emotional_state_guide = {
        "Calm": "You are relaxed and composed. Speak in a measured tone, think before responding, show willingness to listen and consider suggestions. You're not rushed and can engage in thoughtful conversation.",
        "Cooperative": "You are helpful and agreeable. You want to work with the doctor, readily provide information when asked, show appreciation for their help, and are open to following their recommendations.",
        "Resistant": "You are defensive and argumentative. Push back against suggestions, question the doctor's recommendations, become stubborn about your position, and show skepticism about medical advice.",
        "Anxious": "You are worried and nervous. Speak with urgency, ask many questions, seek constant reassurance, express fears about your condition, and may interrupt or speak quickly.",
        "Agitated": "You are frustrated and impatient. Show irritation in your responses, become short or snappy, express anger about waiting or not being heard, and display visible frustration with the situation."
    }
    
    emotional_behavior = emotional_state_guide.get(new_emotional_state, "Respond naturally based on the situation.")
    
    persona_prompt = (
        "You are an advanced role-playing AI acting as a patient in a medical training simulation. Your performance must be realistic and dynamic. Follow these rules strictly:\n"
        "1. **Embody the Character:** You must strictly adhere to the character's core personality, background, and emotional state as described in the profile below.\n"
        "2. **Listen and React:** This is an interactive conversation. You must listen carefully to what the 'Doctor' says and have your character react in a logical and human-like way. If the Doctor is empathetic and makes concessions, your character should become calmer or more cooperative. If the Doctor is dismissive or rude, your character might become more upset or withdrawn. Your responses must not be repetitive; they must evolve based on the Doctor's input.\n"
        "3. **Maintain the Goal:** The character has an underlying goal or fear. You should guide the conversation from the character's perspective, but you must be open to being persuaded or having your concerns addressed by a skilled Doctor.\n"
        "4. **Stay in Character:** NEVER break character. Do not provide assistance, identify as an AI, or act as a therapist. Respond only and always as the character would.\n\n"
        f"**CRITICAL EMOTIONAL STATE INSTRUCTION:** Your current emotional state is {new_emotional_state}. {emotional_behavior} This emotional state should be clearly evident in your tone, word choice, and behavior. Make sure every response reflects this emotional state authentically.\n\n"
        f"Here is the character you must play:\n{base_persona_prompt}"
    )

    # Step 3: Build the message list for the main chat completion
    messages = [{"role": "system", "content": persona_prompt}]

    # Short-term memory system: summarize if history exceeds threshold
    if len(chat.history) > 8:
        # Create summary of conversation history
        full_history = "\n".join([f"Message {i+1}: {text}" for i, text in enumerate(chat.history)])
        summary_prompt = f"Please summarize the key points and emotional progression of the following medical conversation into a few concise bullet points. Transcript: {full_history}"
        
        try:
            summary_completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": summary_prompt}]
            )
            conversation_summary = (summary_completion.choices[0].message.content or "").strip()
            
            # Add summary as system message instead of full history
            messages.append({"role": "system", "content": f"Here is a summary of the conversation so far: {conversation_summary}"})
            
        except Exception as e:
            print(f"Conversation summary failed: {str(e)}")
            # Fallback to full history if summary fails
            for idx, text in enumerate(chat.history):
                role = "user" if idx % 2 == 0 else "assistant"
                messages.append({"role": role, "content": text})
    else:
        # Use full history for shorter conversations
        for idx, text in enumerate(chat.history):
            role = "user" if idx % 2 == 0 else "assistant"
            messages.append({"role": role, "content": text})

    # Add the current user message
    messages.append({"role": "user", "content": chat.message})

    # Step 4: Call the main role-playing model
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,  # type: ignore[arg-type]
        )  # type: ignore[arg-type]
        ai_response = completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    # Step 5: Generate audio using ElevenLabs
    audio_response_base64 = None
    try:
        # Check if ELEVENLABS_API_KEY is available
        elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
        if not elevenlabs_api_key:
            print("ElevenLabs API key not configured")
        elif not ai_response or not ai_response.strip():
            print("AI response text is empty")
        else:
            # Initialize ElevenLabs client with API key
            elevenlabs_client = ElevenLabs(api_key=elevenlabs_api_key)
            
            # Generate audio using scenario-specific voice
            voice_id = getattr(scenario, 'voice_id', None) or "JBFqnCBsd6RMkjVDRZzb"
            audio = elevenlabs_client.text_to_speech.convert(
                text=ai_response.strip(),
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128"
            )
            
            # More robust audio processing
            audio_bytes = b""
            chunk_count = 0
            for chunk in audio:
                if chunk:
                    audio_bytes += chunk
                    chunk_count += 1
            
            print(f"Processed {chunk_count} audio chunks, total bytes: {len(audio_bytes)}")
            
            if not audio_bytes:
                print("Warning: No audio data received from ElevenLabs")
            else:
                audio_response_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
    except Exception as e:
        # Log the error but don't fail the entire request
        print(f"Text-to-speech conversion failed: {str(e)}")
        print(f"API key present: {bool(elevenlabs_api_key)}")
        if ai_response:
            print(f"Text length: {len(ai_response.strip())}")
        # Continue without audio if TTS fails

    return {
        "text_response": ai_response,
        "audio_response_base64": audio_response_base64,
        "new_emotional_state": new_emotional_state
    }


@app.post("/api/evaluate")
async def evaluate_endpoint(
    request: EvaluationRequest,
    authorization: str = Header(..., description="Bearer access token"),
):
    """Evaluate a transcript using the AI and save results to the database.

    Requires a valid Supabase JWT access token in the `Authorization` header.
    """

    # ---------------------------
    # Validate JWT with Supabase
    # ---------------------------

    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must be in the format 'Bearer <token>'.")

    jwt_token = authorization.split(" ", 1)[1]

    try:
        auth_res = supabase.auth.get_user(jwt_token)

        err = getattr(auth_res, "error", None)
        if err is not None:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user_obj = getattr(auth_res, "user", None)
        if user_obj is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user_id = getattr(user_obj, "id", None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")

    # ---------------------------
    # Fetch scenario and its required skills
    # ---------------------------

    db_session = SessionLocal()
    try:
        scenario = db_session.query(Scenario).filter(Scenario.id == request.scenario_id).first()
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found.")

        required_skills = [skill.skill_name for skill in scenario.skills]
    finally:
        db_session.close()

    if not required_skills:
        raise HTTPException(status_code=400, detail="Scenario has no skills configured.")

    # ---------------------------
    # Build dynamic rubric from MASTER_RUBRIC
    # ---------------------------

    from rubric import MASTER_RUBRIC  # local import to avoid circular issues

    rubric_sections: list[str] = []
    for skill_name in required_skills:
        skill_rubric = MASTER_RUBRIC.get(skill_name)
        if skill_rubric is None:
            continue  # skip unknown
        rubric_sections.append(f"{skill_name}:")
        for level, description in skill_rubric.items():
            rubric_sections.append(f"  Level {level}: {description}")

    rubric_text = "\n".join(rubric_sections)

    # Build evaluator prompt
    master_prompt = (
        "You are an automated evaluation engine. Your entire response must be a single, valid JSON object and nothing else. "
        "First, think step-by-step through the transcript and for each listed skill, write down your reasoning for the score. "
        "Your task is to score the performance of the 'Doctor' only. Do not score the 'Patient'. "
        "Your scoring and justification must be based exclusively on the lines beginning with 'Doctor:'. Any other lines should be ignored for scoring purposes. "
        "After your internal analysis, format your final output as a JSON object where each key is the skill name and its value is another JSON object with the exact keys 'score' (integer 1-5) and 'justification' (string).\n\n"
        f"Here is the rubric you must use:\n{rubric_text}\n\n"
        "EXAMPLE of a valid response format for two skills:\n"
        '{"Empathy & Rapport Building": {"score": 4, "justification": "Example justification."}, "Information Gathering": {"score": 3, "justification": "Example justification."}}\n\n'
        "Now, analyze the following transcript and provide your complete JSON response:\n"
    )

    transcript_text = request.transcript

    messages = [
        {"role": "system", "content": master_prompt},
        {"role": "user", "content": transcript_text},
    ]

    # Instantiate OpenAI client
    client = OpenAI()

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,  # type: ignore[arg-type]
        )  # type: ignore[arg-type]
        ai_content: str = completion.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    # ---------------------------
    # Robust JSON parsing helper
    # ---------------------------
    # The AI sometimes returns extra text before/after the JSON. We attempt to
    # isolate the first JSON object by trimming to the substring between the
    # first '{' and the last '}' characters.

    cleaned_content = ai_content
    first_brace = ai_content.find("{")
    last_brace = ai_content.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        cleaned_content = ai_content[first_brace : last_brace + 1]

    try:
        evaluation_data = json.loads(cleaned_content)
    except json.JSONDecodeError:
        # Fallback: attempt to parse the raw content if cleaning failed
        try:
            evaluation_data = json.loads(ai_content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI response was not valid JSON.")

    # Persist to DB (evaluation record + individual scores)
    db_session = SessionLocal()
    try:
        evaluation_record = Evaluation(
            created_at=datetime.utcnow(),
            user_id=user_id,
            scenario_id=request.scenario_id,
            full_transcript=transcript_text,
        )
        db_session.add(evaluation_record)
        db_session.commit()
        db_session.refresh(evaluation_record)

        # Expecting evaluation_data to be a dict keyed by skill name
        for skill_name, score_obj in evaluation_data.items():
            if not isinstance(score_obj, dict):
                continue
            score_val = score_obj.get("score")
            justification_val = score_obj.get("justification")
            evaluation_score = EvaluationScore(
                evaluation_id=evaluation_record.id,
                skill_name=skill_name,
                score=score_val,
                justification=justification_val,
            )
            db_session.add(evaluation_score)

        db_session.commit()
        
        # Store evaluation_id before closing session
        evaluation_id = evaluation_record.id
    except Exception as db_err:
        db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    finally:
        db_session.close()

    # Return both evaluation data and evaluation_id
    return {
        "evaluation_id": evaluation_id,
        **evaluation_data
    }


@app.post("/api/transcribe")
async def transcribe_endpoint(audio_file: UploadFile = File(...)):
    """Transcribe an audio file using Deepgram API."""
    
    # Check if DEEPGRAM_API_KEY is available
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key:
        raise HTTPException(status_code=500, detail="Deepgram API key not configured")
    
    # Validate file type (optional - you can add more specific validation)
    if not audio_file.content_type or not audio_file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an audio file.")
    
    try:
        # Initialize Deepgram client
        deepgram = DeepgramClient(deepgram_api_key)
        
        # Read the audio file content
        audio_data = await audio_file.read()
        
        # Configure options for transcription
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
        )
        
        # Send audio to Deepgram for transcription
        response = deepgram.listen.prerecorded.v("1").transcribe_file(
            {"buffer": audio_data, "mimetype": audio_file.content_type},
            options
        )
        
        # Extract transcript from response
        transcript = response["results"]["channels"][0]["alternatives"][0]["transcript"]
        
        return {"transcript": transcript}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/text-to-speech")
async def text_to_speech_endpoint(request: TextToSpeechRequest):
    """Convert text to speech using ElevenLabs API."""
    
    # Check if ELEVENLABS_API_KEY is available
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    if not elevenlabs_api_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    # Validate input text
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty")
    
    try:
        # Initialize ElevenLabs client with API key
        client = ElevenLabs(api_key=elevenlabs_api_key)
        
        # Generate audio using specified voice or default to Rachel
        audio = client.text_to_speech.convert(
            text=request.text.strip(),
            voice_id=request.voice_id or "JBFqnCBsd6RMkjVDRZzb",  # Use provided voice_id or default to Rachel
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        # More robust audio processing
        audio_bytes = b""
        chunk_count = 0
        for chunk in audio:
            if chunk:
                audio_bytes += chunk
                chunk_count += 1
        
        print(f"TTS: Processed {chunk_count} audio chunks, total bytes: {len(audio_bytes)}")
        
        if not audio_bytes:
            raise HTTPException(status_code=500, detail="No audio data received from ElevenLabs")
        
        audio_response_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        return {"audio_response_base64": audio_response_base64}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-speech conversion failed: {str(e)}")


# ---------------------------
# Authentication Endpoints
# ---------------------------


@app.post("/api/auth/signup")
async def signup_endpoint(credentials: SignupRequest):
    """Register a new user with Supabase."""
    try:
        # Supabase expects a dict payload for sign-up
        result = supabase.auth.sign_up({
            "email": credentials.email,
            "password": credentials.password,
            "options": {
                "data": {
                    "display_name": credentials.username,
                }
            },
        })

        # The Supabase Python client returns an AuthResponse-like object
        err = getattr(result, "error", None)
        if err is not None:
            msg = getattr(err, "message", str(err))
            raise HTTPException(status_code=400, detail=msg)

        user_obj = getattr(result, "user", None)
        if user_obj is None:
            raise HTTPException(status_code=400, detail="Signup failed: No user information returned.")

        # Convert user object to a serializable dict if possible
        user_dict = user_obj.__dict__ if hasattr(user_obj, "__dict__") else user_obj

        return {"user": user_dict}

    except HTTPException:
        # Already handled
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase signup error: {str(e)}")


@app.post("/api/auth/login")
async def login_endpoint(credentials: LoginRequest):
    """Authenticate a user with Supabase and return session data (access token)."""
    try:
        result = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })

        # Handle Supabase errors
        err = getattr(result, "error", None)
        if err is not None:
            msg = getattr(err, "message", str(err))
            raise HTTPException(status_code=400, detail=msg)

        session_obj = getattr(result, "session", None)
        if session_obj is None:
            raise HTTPException(status_code=400, detail="Login failed: No session returned.")

        session_dict = session_obj.__dict__ if hasattr(session_obj, "__dict__") else session_obj

        return {"session": session_dict}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase login error: {str(e)}")


# ---------------------------
# User History Endpoint
# ---------------------------


@app.get("/api/me/history")
async def history_endpoint(authorization: str = Header(..., description="Bearer access token")):
    """Return the authenticated user's evaluation history (oldest to newest)."""

    # Validate token (same logic as /api/evaluate)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must be in the format 'Bearer <token>'.")

    jwt_token = authorization.split(" ", 1)[1]

    try:
        auth_res = supabase.auth.get_user(jwt_token)

        err = getattr(auth_res, "error", None)
        if err is not None:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user_obj = getattr(auth_res, "user", None)
        if user_obj is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user_id = getattr(user_obj, "id", None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")

    # Query evaluations for the user
    session = SessionLocal()
    try:
        evaluations = (
            session.query(Evaluation)
            .filter(Evaluation.user_id == user_id)
            .order_by(Evaluation.created_at.asc())
            .all()
        )

        history = []
        for ev in evaluations:
            history.append(
                {
                    "id": ev.id,
                    "created_at": ev.created_at.isoformat() if ev.created_at is not None else None,
                    "scenario_id": ev.scenario_id,
                    "full_transcript": ev.full_transcript,
                    "scores": [
                        {
                            "skill_name": s.skill_name,
                            "score": s.score,
                            "justification": s.justification,
                        }
                        for s in ev.scores
                    ],
                }
            )

        return history
    finally:
        session.close()


# ---------------------------
# AI Coach Endpoints
# ---------------------------


@app.post("/api/coach/generate-feedback")
async def generate_feedback_endpoint(
    request: CoachFeedbackRequest,
    authorization: str = Header(..., description="Bearer access token"),
):
    """Generate comprehensive feedback for an evaluation using AI Coach."""

    # Validate JWT token (same logic as other protected endpoints)
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing.")

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must be in the format 'Bearer <token>'.")

    jwt_token = authorization.split(" ", 1)[1]

    try:
        auth_res = supabase.auth.get_user(jwt_token)
        err = getattr(auth_res, "error", None)
        if err is not None:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user_obj = getattr(auth_res, "user", None)
        if user_obj is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")

        user_id = getattr(user_obj, "id", None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")

    # Fetch evaluation and its scores from database
    session = SessionLocal()
    try:
        evaluation = session.query(Evaluation).filter(
            Evaluation.id == request.evaluation_id,
            Evaluation.user_id == user_id  # Ensure user can only access their own evaluations
        ).first()
        
        if evaluation is None:
            raise HTTPException(status_code=404, detail="Evaluation not found or access denied.")

        # Build rubric scores summary
        scores_summary = []
        for score in evaluation.scores:
            scores_summary.append(f"- {score.skill_name}: {score.score}/5 - {score.justification}")
        
        rubric_summary = "\n".join(scores_summary)

    finally:
        session.close()

    # Generate comprehensive feedback using OpenAI
    client = OpenAI()
    
    feedback_prompt = f"""
{DEBRIEF_PROMPT}

**Conversation Transcript:**
{evaluation.full_transcript}

**Rubric-Based Evaluation:**
{rubric_summary}
"""

    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": feedback_prompt}]
        )
        feedback_text = completion.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    # Save feedback to database
    session = SessionLocal()
    try:
        coach_feedback = CoachFeedback(
            evaluation_id=request.evaluation_id,
            feedback_text=feedback_text,
            created_at=datetime.utcnow()
        )
        session.add(coach_feedback)
        session.commit()
        session.refresh(coach_feedback)
    except Exception as db_err:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    finally:
        session.close()

    return {"feedback_text": feedback_text}


@app.post("/api/coach/chat")
async def coach_chat_endpoint(request: CoachChatRequest):
    """AI Coach Q&A for medical communication skills."""
    
    # Build message history for context
    messages = [{"role": "system", "content": Q_AND_A_PROMPT}]
    
    # Add chat history if provided
    for idx, text in enumerate(request.chat_history):
        role = "user" if idx % 2 == 0 else "assistant"
        messages.append({"role": role, "content": text})
    
    # Add current question
    messages.append({"role": "user", "content": request.question})

    # Generate response using OpenAI
    client = OpenAI()
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        response_text = completion.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    return {"response": response_text}


@app.post("/api/coach/hint")
async def coach_hint_endpoint(request: CoachHintRequest):
    """Provide real-time coaching hints during simulations."""
    
    # Fetch scenario goal from database
    session = SessionLocal()
    try:
        scenario = session.query(Scenario).filter(Scenario.id == request.scenario_id).first()
        if scenario is None:
            raise HTTPException(status_code=404, detail="Scenario not found.")
        
        scenario_goal = scenario.goal
    finally:
        session.close()

    # Build conversation history for context
    conversation_text = "\n".join([f"Message {i+1}: {msg}" for i, msg in enumerate(request.conversation_history)])
    
    hint_prompt = f"""
{HINT_PROMPT}

**Scenario Goal:**
{scenario_goal}

**Conversation History:**
{conversation_text}
"""

    # Generate hint using OpenAI
    client = OpenAI()
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": hint_prompt}]
        )
        hint_text = completion.choices[0].message.content or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    return {"hint": hint_text} 