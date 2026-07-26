# StudyMate AI - Project Report

**Course:** Vibe Coding: Building & Deploying an AI Web Application on AWS
**Deployed URL:** `[PLACEHOLDER: Paste your live AWS URL here]`

---

## 1. Application Overview & Tech Stack
StudyMate AI is a full-stack web application designed to act as a personalized AI study companion. It allows users to upload documents, receive summaries, chat with the material, and generate AI-graded quizzes.

**Tech Stack:**
*   **Frontend:** React (Vite) - *Adjusted from vanilla HTML/JS to provide a more robust, modern SPA experience while fulfilling all functional requirements.*
*   **Backend:** Python 3.11+, FastAPI, uvicorn
*   **AI/LLM:** Anthropic Claude API (`claude-3-5-sonnet-20240620`)
*   **Containerization:** Docker (Multi-stage build)
*   **Deployment:** AWS App Runner

## 2. Application Architecture
StudyMate AI uses a decoupled client-server architecture combined into a single deployable container for simplicity on AWS.

1.  **Frontend (Client):** A React Single Page Application (SPA) that handles the UI, routing, and user state. It communicates with the backend via RESTful APIs and Server-Sent Events (SSE) for streaming chat.
2.  **Backend (API):** A FastAPI service that handles document parsing (via PyMuPDF), SQLite database interactions, and orchestrates calls to the Anthropic API.
3.  **Docker Container:** A multi-stage Dockerfile first builds the React static files using Node.js, and then copies them into a lightweight Python container. FastAPI is configured to serve the API routes on `/api/*` and mount the React static files as a catch-all, exposing a single port (8000) for AWS App Runner.

## 3. Prompting Strategy & Frameworks
We used structured prompting with clear personas and enforced JSON schemas to ensure the AI returns programmatic, parsable data.

**Sample Prompt 1: Document Analyzer**
```text
Analyze the document and provide exactly the following three sections:
1. A concise summary of the overall document.
2. 5-8 key concepts/bullets explaining the core ideas.
3. 3-5 suggested follow-up questions the user can ask to study this material better.
Use clear Markdown formatting with headings for each section.
```

**Sample Prompt 2: Quiz Generation (Enforcing JSON)**
```text
Based on the following document, generate a quiz with exactly 5 multiple-choice questions and 2 short-answer questions.
Return the output STRICTLY as a valid JSON object matching this schema:
{
  "multiple_choice": [ { "id": "mc_1", "question": "...", "options": ["A","B","C","D"], "correct_answer": "A" } ],
  "short_answer": [ { "id": "sa_1", "question": "..." } ]
}
```

## 4. Phase-by-Phase Development Summary
*   **Phase 1: Backend & LLM Setup:** Integrated the Anthropic SDK, secured API keys via environment variables (dotenv), and updated the FastAPI configuration.
*   **Phase 2: Document Processing:** Implemented PDF parsing and updated the `/api/analyze` endpoint to adhere strictly to the rubric's summary format.
*   **Phase 3: Quiz Engine:** Created new `/api/quiz/generate` and `/api/quiz/grade` endpoints, utilizing strict JSON prompting to create structured quiz data.
*   **Phase 4: Frontend Adjustments:** Rebranded the existing React layout to "StudyMate AI", hid irrelevant template pages, and built the new `QuizPage.tsx` interface.
*   **Phase 5: Containerization:** Developed a multi-stage Dockerfile to build both the Vite frontend and Python backend, ensuring a small footprint for AWS.
*   **Phase 6: Deployment Prep:** Wrote the AWS App Runner deployment guide and finalized project documentation.

## 5. Challenges Encountered & Resolutions
1.  **Challenge:** Serving a React SPA and FastAPI backend from a single AWS App Runner service without setting up an external reverse proxy (like Nginx).
    **Resolution:** Utilized FastAPI's `StaticFiles` and a catch-all route (`@app.get("/{full_path:path}")`) to serve the compiled Vite `dist/index.html` alongside the `/api` routes natively.
2.  **Challenge:** The LLM sometimes returned conversational filler before the JSON payload during Quiz Generation, breaking the `json.loads()` parser.
    **Resolution:** Applied a strict `system_prompt` ("Output ONLY valid JSON, nothing else.") and instructed the model to adhere STRICTLY to the provided schema.

## 6. Key Learnings & Reflection
Building StudyMate AI highlighted the power of separating the orchestration layer (FastAPI) from the presentation layer (React) while keeping deployment simple (single Docker container). I learned the importance of strict prompt engineering when relying on LLMs for structured data (like Quizzes) rather than just free-text chat. Furthermore, utilizing AWS App Runner abstracted away the complexities of EC2 provisioning, allowing me to focus entirely on the application logic and containerization.
