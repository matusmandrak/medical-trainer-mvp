"""Rubric definitions for evaluation scoring.

Each core skill includes five scoring levels (1-5).
"""

MASTER_RUBRIC: dict[str, dict[str, str]] = {
    "Empathy & Rapport Building": {
        "1": "Is dismissive of the patient's feelings or perspective. May use judgmental language or a condescending tone. Makes no attempt to build a connection.",
        "2": "Ignores or moves past the patient's emotional cues. The conversation is purely transactional and focused only on clinical facts.",
        "3": "Acknowledges the patient's emotion with a simple, generic phrase (e.g., 'I understand,' 'I see'). The acknowledgment feels procedural rather than genuine.",
        "4": "Shows clear empathy for the patient's situation and feelings. Asks follow-up questions about the patient's emotional state.",
        "5": "Masterfully validates the patient's feelings as legitimate (\"It makes complete sense that you would feel that way...\"). Uses reflective listening to show a deep understanding of the patient's perspective, creating a strong sense of trust and partnership.",
    },
    "Information Gathering": {
        "1": "Asks only leading or closed-ended questions. Interrupts the patient frequently. Fails to elicit the key information needed for the scenario.",
        "2": "Relies almost exclusively on closed-ended questions, resulting in a 'checklist' style of history taking. Misses key opportunities to explore the patient's perspective.",
        "3": "Uses a mix of open and closed questions but may not always use them appropriately. Gathers the necessary clinical facts but fails to uncover deeper concerns or beliefs.",
        "4": "Primarily uses open-ended questions to start and then uses closed-ended questions to effectively clarify details. Summarizes information to check for accuracy.",
        "5": "Masterfully uses open-ended questions to encourage the patient to tell their story. Listens actively without interruption. Skillfully probes sensitive areas and successfully uncovers the patient's underlying beliefs, concerns, and expectations.",
    },
    "Patient Education & Clarity": {
        "1": "Uses dense medical jargon without explanation, leaving the patient confused or intimidated. Makes no attempt to check for understanding.",
        "2": "Avoids some jargon but the explanation is still too clinical or disorganized. The patient may be left with an incomplete or inaccurate understanding.",
        "3": "Provides a technically correct explanation but does not use techniques to enhance understanding, such as analogies or chunking and checking.",
        "4": "Explains things clearly and avoids jargon. Pauses to ask if the patient has questions or if things make sense so far.",
        "5": "Explains complex information using simple language and powerful analogies. Delivers information in small, digestible chunks and uses the 'teach-back' method to confirm the patient has truly understood the plan.",
    },
    "Collaborative & Non-Judgmental Practice": {
        "1": "Is dismissive, arrogant, or scolding. Issues commands and presents a single treatment plan as a non-negotiable directive.",
        "2": "Is not overtly judgmental but operates from a purely paternalistic model. Tells the patient what the plan is without asking for their input.",
        "3": "Presents one or two options but does so in a way that makes it clear which one the doctor prefers. Asks for the patient's agreement but not their active input.",
        "4": "Explicitly presents multiple, viable options and asks for the patient's preference. Shows respect for the patient's perspective throughout the conversation.",
        "5": "Explicitly validates the patient's unique perspective and life context. Co-creates a plan with the patient as an equal partner. Successfully negotiates a plan that is both medically sound and a good fit for the patient's life.",
    },
    "Managing Difficult Conversations": {
        "1": "Reacts defensively or becomes argumentative. Escalates the conflict or shuts down completely. Fails to manage the emotional climate of the room.",
        "2": "Appears flustered or uncomfortable with the patient's strong emotions. May try to change the subject or offer premature, unconvincing reassurance.",
        "3": "Remains calm and professional but does not actively de-escalate the situation. Manages to state the necessary clinical information but the emotional tension remains.",
        "4": "Successfully de-escalates the initial emotion by using validating language. Is able to set a clear boundary in a respectful manner.",
        "5": "Masterfully manages the emotional climate. Remains calm, centered, and compassionate. Uses advanced techniques like naming the emotion ('It sounds like you are feeling incredibly frustrated...') to de-escalate conflict and is able to guide the conversation to a productive conclusion.",
    },
} 