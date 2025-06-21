from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
from openai import OpenAI  # type: ignore
import os
import asyncio
from datetime import datetime
import json
from database import SessionLocal
from models import Evaluation

app = FastAPI()

# Configure CORS for all origins, methods, and headers (MVP settings)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    history: List[str]
    message: str


class EvaluationRequest(BaseModel):
    transcript: str


@app.get("/")
async def read_root():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat_endpoint(chat: ChatMessage):
    """Generate a chat response using the OpenAI GPT model."""
    # Load persona prompt
    try:
        with open(os.path.join(os.path.dirname(__file__), "project_brief.txt"), "r", encoding="utf-8") as f:
            persona_prompt = (
                "You are a role-playing AI. Your only job is to portray the character of Elena Petrova based on the following description. "
                "You must never break character. Do not act as a doctor, therapist, or AI assistant. Only respond as Elena would. "
                "Here is your character profile: " + f.read()
            )
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Persona prompt not found.")

    client = OpenAI()  # Uses OPENAI_API_KEY from environment variables

    # Build the message list for the chat completion
    messages = [{"role": "system", "content": persona_prompt}]

    for idx, text in enumerate(chat.history):
        role = "user" if idx % 2 == 0 else "assistant"
        messages.append({"role": role, "content": text})

    # Add the current user message
    messages.append({"role": "user", "content": chat.message})

    # Call the model in a thread to avoid blocking the event loop
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )
        ai_response = completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    return {"response": ai_response}


@app.post("/api/evaluate")
async def evaluate_endpoint(request: EvaluationRequest):
    """Evaluate a transcript using the AI and save results to the database."""
    # Load rubric definition
    try:
        with open(os.path.join(os.path.dirname(__file__), "project_brief.txt"), "r", encoding="utf-8") as f:
            rubric_definition = f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Rubric definition not found.")

    # Build the ultra-strict master prompt
    master_prompt = (
        "You are an automated evaluation engine. Your entire response must be a single, valid JSON object and nothing else. "
        "First, think step-by-step through the transcript and for each criterion in the rubric, write down your reasoning for the score. "
        "After your internal analysis, you must format your final output as a single JSON object with the exact keys: 'empathy_score' (integer), 'investigative_questioning_score' (integer), 'collaborative_problem_solving_score' (integer), and 'ai_justifications'.\n\n"
        "The 'ai_justifications' value MUST be another JSON object containing a key for each score criterion with your detailed written justification as its string value. Do not omit any part of this structure.\n\n"
        f"Here is the rubric:\n{rubric_definition}\n\n"
        "EXAMPLE of a valid response format:\n"
        '{"empathy_score": 1, "investigative_questioning_score": 2, "collaborative_problem_solving_score": 1, "ai_justifications": {"empathy_score": "The doctor was dismissive and did not acknowledge the patient\'s concerns.", "investigative_questioning_score": "The questions were mostly closed-ended and did not explore the patient\'s perspective.", "collaborative_problem_solving_score": "The doctor issued a command rather than suggesting a collaborative plan."}}\n\n'
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
            messages=messages,
        )
        ai_content = completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    # Parse AI JSON response
    try:
        evaluation_data = json.loads(ai_content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI response was not valid JSON.")

    # Persist to DB
    session = SessionLocal()
    try:
        evaluation_record = Evaluation(
            created_at=datetime.utcnow(),
            user_id=None,
            scenario_id=None,
            full_transcript=transcript_text,
            empathy_score=evaluation_data.get("empathy_score"),
            investigative_questioning_score=evaluation_data.get("investigative_questioning_score"),
            collaborative_problem_solving_score=evaluation_data.get("collaborative_problem_solving_score"),
            ai_justifications=evaluation_data.get("ai_justifications"),
        )
        session.add(evaluation_record)
        session.commit()
    except Exception as db_err:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    finally:
        session.close()

    return evaluation_data 