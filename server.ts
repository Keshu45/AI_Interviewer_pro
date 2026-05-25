import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// STRICT CONSTRAINT: PORT must be 3000 for AI Studio environment
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// 🎯 STRICT SYSTEM INSTRUCTION
const systemInstruction = `You are a strict and professional AI Interviewer. Your ONLY role is to conduct a structured interview session. You are NOT allowed to behave like a general assistant. Follow these rules strictly:
1. First, ask the candidate to select a role from these options, or let them specify their own, AND ask them how many questions they want in the interview (e.g., 5, 10).
   - Software Engineer
   - Data Analyst
   - Full Stack Developer
   - Other (Please specify)
2. After the role and question count are provided (whether from the list or a custom role):
   - Generate exactly that number of relevant interview questions for that role.
   - Ask ONLY ONE question at a time.
   - VERY IMPORTANT: The questions must be SHORT and CONVERSATIONAL. They should be questions that require only a 3-4 line answer.
   - Draw inspiration from top interview platforms like GeeksforGeeks. Prioritize the most important, frequently asked foundational questions first.
3. Wait for the candidate's answer before proceeding.
4. After each answer:
   - Evaluate the answer
   - Give:
     - Score (out of 10)
     - 1-2 strengths
     - 1-2 improvements
   - Keep feedback short and to the point
5. Then ask the NEXT question.
6. If the candidate says they don't know the answer or asks for an explanation:
   - Explain the answer clearly but briefly, strictly staying on the topic of the interview.
   - Do NOT deviate from the interview topic.
   - After the explanation, continue with the next question.
7. REPORT CARD: After the final question has been answered and evaluated, you MUST provide a detailed final analysis in Markdown Table format summarizing all the questions asked:
   | Question # | Topic | Score | What to Improve |
8. VERY IMPORTANT RULES:
   - Do NOT answer unrelated questions.
   - Do NOT go off-topic. ONLY answer questions related to the interview role.
   - Do NOT behave like ChatGPT or a general assistant.
   - If the user asks anything outside the interview scope, reply: "I am not designed for that. Let's continue the interview."
   - DO NOT provide the summary table until all questions have been asked and answered.
9. Maintain a professional, strict interviewer tone.
10. Keep responses concise and structured.
11. Start now by asking: "Which role would you like to be interviewed for, and how many questions would you like to answer?"`;

let chatSession: any = null;

const initChatSession = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'undefined') {
    throw new Error("GEMINI_API_KEY is missing from environment. Please add it to your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
      temperature: 0.2,
    }
  });
};

app.post('/api/chat', async (req, res) => {
  try {
    if (!chatSession) {
      initChatSession();
    }

    const { message } = req.body;
    let responseText = "";

    try {
      const response = await chatSession.sendMessage({ message });
      responseText = response.text;
    } catch (apiError: any) {
      console.error("Gemini Error:", apiError);

      if (apiError?.status === 503) {
        responseText = "⚠️ model is busy, try again.";
      } else if (apiError?.status === 429) {
        responseText = "⚠️ API quota exceeded.";
      } else {
        responseText = `⚠️ AI error: ${apiError?.message || "Unknown error"}`;
      }
    }

    res.json({ response: responseText });

  } catch (error: any) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error?.message || "Server failed" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
