# StudyMate AI - Project Concept Note

**Project Title:** StudyMate AI
**Course:** Vibe Coding: Building & Deploying an AI Web Application on AWS

## Problem Statement
Students often struggle to quickly synthesize large volumes of study material, identify key concepts, and effectively test their understanding. Traditional study methods are time-consuming and lack personalized, immediate feedback. 

## Target User & Use Case
**Target User:** High school and college students, lifelong learners, and professionals preparing for certifications.
**Use Case:** A user uploads a textbook chapter, lecture notes (PDF), or pastes an article. They instantly receive a concise summary and key concepts. They can then chat with the AI to ask clarifying questions ("explain like I'm 5"). Finally, they can request an AI-generated quiz, take the quiz within the app, and receive immediate AI-graded feedback on their short answers.

## Key Features
1. **Document Analyzer:** Secure PDF and text processing that extracts summaries, 5-8 key concepts, and suggested follow-up study questions.
2. **AI Tutor Chat:** A context-aware chat interface scoped to the uploaded document, featuring token-by-token streaming responses for real-time interaction.
3. **AI Quiz Generator & Grader:** Automatically creates tailored quizzes (5 multiple-choice, 2 short-answer) from the material. The AI evaluates short answers based on the document's context and provides a score with detailed feedback.
4. **Responsive UI:** A modern, dark-mode friendly React frontend that works seamlessly on desktop and mobile.

## Expected User Experience & Outcomes
Users will experience a polished, professional web application with clear loading states, graceful error handling, and no visible stack traces. By using StudyMate AI, students will reduce the time spent passively reading materials and increase active recall through immediate, personalized quizzing and AI tutoring, leading to better retention and test outcomes.

## Technical Architecture (High-Level)
- **Frontend:** React (Vite), styled with Vanilla CSS / Tailwind, deployed as static assets.
- **Backend:** FastAPI (Python 3.11+), uvicorn.
- **AI Integration:** Anthropic Claude API (`claude-3-5-sonnet-20240620`).
- **Deployment:** Containerized via Docker (multi-stage build) and hosted on AWS App Runner.
