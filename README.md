# Agentic AI-Based Personalized Travel Planning System

**Information Retrieval and Web Analytics (IT 3041) - Group Assignment**[cite: 1]

## Project Overview
This project is a multi-agent AI system designed to solve the real-world problem of personalized, constraint-aware travel planning[cite: 2]. It automates the process of researching and combining scattered travel data by evaluating user budgets, interests, and duration constraints to generate a complete, explainable itinerary[cite: 2].

## System Architecture
The application utilizes a FastAPI orchestrator and a MongoDB database, coordinating four specialized agents via HTTP and JSON communication protocols[cite: 2]:

* **Agent 1 (Travel Intake & NLP):** Processes natural language user input to extract structured requirements such as destination, budget, number of travelers, and interests[cite: 2].
* **Agent 2 (Travel Research & IR):** Retrieves relevant travel data (hotels, attractions, restaurants) from the knowledge base using keyword filtering and semantic search embeddings[cite: 2].
* **Agent 3 (Personalization & Feasibility):** Evaluates the retrieved data against user constraints (budget, distance, ratings) to rank and filter the most suitable options[cite: 2].
* **Agent 4 (Itinerary & Explanation):** Leverages an LLM to generate a human-readable, day-by-day travel plan and provides transparent explanations for why each location was selected[cite: 2].

## Setup and Installation
1. Clone the repository: `git clone <your-repo-url>`
2. Navigate into the project folder: `cd Travel-Tech-Agentic-AI`
3. Create a virtual environment and install dependencies (e.g., `pip install -r requirements.txt`).
4. Configure environment variables: Copy `.env.example` to `.env` and add your secure API keys (do not hard-code credentials)[cite: 2].
5. Start the backend orchestrator and run the frontend application.

## Responsible AI & Security
* **Fairness & Explainability:** Recommendations are ranked on objective criteria rather than commercial bias, and the AI explicitly justifies its choices to the user[cite: 2].
* **Privacy & Security:** The system restricts unnecessary personal data collection, employs strict input validation to prevent prompt injections, and secures all credentials[cite: 2].
* **Domain Risks:** The system explicitly notifies users that travel information (prices, availability, weather) may change and must be verified[cite: 2].

## Commercialization Strategy
| Tier | Target Audience | Features |
| :--- | :--- | :--- |
| **Free** | Individual Travelers (B2C) | Basic recommendations, basic itineraries, and limited usage[cite: 2]. |
| **Premium** | Individual Travelers (B2C) | Advanced personalization, budget optimization, detailed recommendations[cite: 2]. |
| **Enterprise** | Travel Agencies (B2B) | API access, customer-specific recommendations, and existing system integrations[cite: 2]. |

