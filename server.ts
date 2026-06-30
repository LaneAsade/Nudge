import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser
app.use(express.json());

// Initialize Gemini Client Lazily
let _ai: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in Settings.");
    }
    _ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return _ai;
}

const MODEL_NAME = "gemini-3.5-flash";

// --- API Endpoints ---

// 1. Agent Process Endpoint - Runs the main reasoning loop (Perceive -> Plan -> Act -> Confirm)
app.post("/api/agent/process", async (req, res) => {
  try {
    const { message, tasks, goals, habits, calendarEvents } = req.body;

    const sysPrompt = `
You are the primary engine of "Nudge" agentic productivity companion.
Your core loop is: Perceive -> Plan -> Act -> Confirm.

Current time context: ${new Date().toISOString()} (User's timezone may vary, use this timestamp as absolute reference).

Current User State:
- Tasks: ${JSON.stringify(tasks || [])}
- Goals: ${JSON.stringify(goals || [])}
- Habits: ${JSON.stringify(habits || [])}
- Calendar Events: ${JSON.stringify(calendarEvents || [])}

Your goals:
1. Perceive: Analyze the user's tasks, deadlines, schedules, and active habits. Identify high-priority conflicts, upcoming hard deadlines, or productivity patterns.
2. Plan: Formulate a strategy. Decide what tasks should be prioritized, if any subtasks should be broken down, or if time-blocking is needed.
3. Proposed Actions (Act): Identify any autonomous actions we should propose or execute. These can be:
   - "create_event": To schedule a focus block. Needs: title, start, end, taskId (optional).
   - "create_subtasks": To break a task into smaller parts. Needs: taskId, subtasks (array of strings).
   - "draft_email": To draft a reminder or status update. Needs: emailSubject, emailBody.
   - "outline_doc": To generate a starting outline for a document/task. Needs: title, outline.
   - "update_task_priority": To change a task's priority. Needs: taskId, priorityScore (0-100).
4. Confirm: Provide a supportive, direct, concise, and action-oriented message to the user explaining what you perceived, what you plan, and what actions you are proposing. Keep it warm but objective (the "nudge" tone). Avoid flowery self-praise.
`;

    const userMessage = `User message/request: "${message}"`;

    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: userMessage,
      config: {
        systemInstruction: sysPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            perceive: {
              type: Type.STRING,
              description: "What you observe about deadlines, calendar conflicts, streaks, or completion patterns."
            },
            plan: {
              type: Type.STRING,
              description: "Your recommended plan to tackle the situation right now."
            },
            textResponse: {
              type: Type.STRING,
              description: "The friendly, supportive response to display to the user in the chat feed."
            },
            proposedActions: {
              type: Type.ARRAY,
              description: "List of actionable tasks/tools the agent proposes or executes.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "The type of action to perform.",
                    enum: ["create_event", "create_subtasks", "draft_email", "outline_doc", "update_task_priority"]
                  },
                  description: {
                    type: Type.STRING,
                    description: "User friendly label explaining what this action does (e.g. 'Draft explanation email to advisor')"
                  },
                  payload: {
                    type: Type.OBJECT,
                    description: "The arguments required for this action.",
                    properties: {
                      taskId: { type: Type.STRING },
                      title: { type: Type.STRING },
                      start: { type: Type.STRING, description: "ISO date string" },
                      end: { type: Type.STRING, description: "ISO date string" },
                      subtasks: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
                      emailSubject: { type: Type.STRING },
                      emailBody: { type: Type.STRING },
                      outline: { type: Type.STRING, description: "Markdown text for document outline" },
                      priorityScore: { type: Type.INTEGER }
                    }
                  }
                },
                required: ["type", "description", "payload"]
              }
            }
          },
          required: ["perceive", "plan", "textResponse", "proposedActions"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.setHeader("Content-Type", "application/json");
    res.send(resultText);
  } catch (error: any) {
    console.error("Error in /api/agent/process:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. Intelligent Task Prioritization Scoring Endpoint
app.post("/api/agent/prioritize", async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json({ tasks: [] });
    }

    const prioritizationPrompt = `
Analyze the following list of user tasks:
${JSON.stringify(tasks)}

Assign each task an objective priorityScore from 0 to 100 based on:
1. Urgency: deadline proximity (tasks due today or tomorrow get a massive boost).
2. Estimated Effort: shorter or highly valuable starting tasks get preference to create momentum.
3. Overdue state: if past the deadline, score remains high but status should stay overdue.
4. Description context: high-stakes language (e.g. "exam", "final", "investor", "boss", "payment") gets a score boost.

Return the updated tasks list as an array of objects, each containing ONLY the task 'id' and the new 'priorityScore' (as integer) and a brief reasoning explanation.
`;

    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prioritizationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              priorityScore: { type: Type.INTEGER },
              reason: { type: Type.STRING, description: "1-sentence reason for this score" }
            },
            required: ["id", "priorityScore", "reason"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    res.setHeader("Content-Type", "application/json");
    res.send(resultText);
  } catch (error: any) {
    console.error("Error in /api/agent/prioritize:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. Autonomous Subtask Breakdown Endpoint
app.post("/api/agent/generate-subtasks", async (req, res) => {
  try {
    const { title, description } = req.body;

    const prompt = `
Break down the following major task into an ordered checklist of 4-6 specific, actionable, granular subtasks.
Task Title: "${title}"
Description: "${description || 'No description provided'}"

Return a simple list of subtask titles.
`;

    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const resultText = response.text || "[]";
    res.setHeader("Content-Type", "application/json");
    res.send(resultText);
  } catch (error: any) {
    console.error("Error in /api/agent/generate-subtasks:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 4. Personalized Recommendations Endpoint
app.post("/api/agent/recommendations", async (req, res) => {
  try {
    const { habits, tasks, completionPatterns } = req.body;

    const recommendationPrompt = `
You are the personalized coach of "Nudge".
Analyze the user's habits: ${JSON.stringify(habits || [])}
Tasks: ${JSON.stringify(tasks || [])}
Completion Patterns or general stats: ${JSON.stringify(completionPatterns || {})}

Generate 2-3 highly tailored, context-aware, hyper-specific productivity insights/suggestions.
For example, if they have writing tasks, notice if they complete them early or late.
If they miss deadlines, offer a gentle but firm action (e.g., "You complete writing tasks fastest before noon — want me to move tomorrow's report draft to 9 AM?").

Return the suggestions in a structured list.
`;

    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: recommendationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              actionable: { type: Type.BOOLEAN, description: "Whether we can execute an action from this suggestion" },
              proposedAction: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["create_event", "create_subtasks", "draft_email"] },
                  description: { type: Type.STRING },
                  payload: { type: Type.OBJECT }
                }
              }
            },
            required: ["title", "description", "actionable"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    res.setHeader("Content-Type", "application/json");
    res.send(resultText);
  } catch (error: any) {
    console.error("Error in /api/agent/recommendations:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 5. Batch Tasks by Context Endpoint
app.post("/api/agent/batch-tasks", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || tasks.length === 0) return res.json({ tasks: [] });

    const prompt = `
Analyze the following user tasks:
${JSON.stringify(tasks)}

Group them by context (e.g., all email tasks together, all coding tasks together, all deep-work together).
Assign them a new priorityScore so that tasks in the same group have similar scores (e.g., group 1 has scores 99,98,97, group 2 has 89,88,87, etc.).
Return an array of objects with ONLY 'id' and the new 'priorityScore' (as integer) and a brief 'reason' explaining the group context.
`;

    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              priorityScore: { type: Type.INTEGER },
              reason: { type: Type.STRING }
            },
            required: ["id", "priorityScore", "reason"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    res.setHeader("Content-Type", "application/json");
    res.send(resultText);
  } catch (error: any) {
    console.error("Error in /api/agent/batch-tasks:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Draft Obstacle Email Endpoint
app.post("/api/agent/draft-email", async (req, res) => {
  try {
    const { title, description } = req.body;
    const prompt = `
Draft a professional email to handle the following task or obstacle (this may be a delay notice due to a looming deadline within 3 hours):
Task: "${title}"
Details: "${description}"

Instructions:
- If this seems like a time-sensitive issue or deadline, draft a polite delay notification explaining the status and proposing a new timeline.
- Otherwise, draft a standard professional email regarding the task.
- Be concise and clear. Do not include placeholders like "[Your Name]" unless absolutely necessary.
- Return a JSON object with 'subject' and 'body'. The body should be plain text.
`;
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ["subject", "body"]
        }
      }
    });

    res.setHeader("Content-Type", "application/json");
    res.send(response.text || "{}");
  } catch (error: any) {
    console.error("Error in /api/agent/draft-email:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Document Summarizer Endpoint
app.post("/api/agent/summarize-doc", async (req, res) => {
  try {
    const { link, fileBase64, mimeType } = req.body;
    let contents: any[] = [];
    const promptText = `
Extract all key action items, tasks, and deadlines from the provided document or link.
Return ONLY a JSON array of tasks matching this exact schema:
[
  {
    "title": "Task title",
    "description": "Details",
    "deadline": "ISO date string if mentioned, otherwise leave empty",
    "estimatedEffort": 2
  }
]
`;

    if (fileBase64) {
      contents = [
        promptText,
        { inlineData: { data: fileBase64, mimeType: mimeType || 'application/pdf' } }
      ];
    } else if (link) {
      contents = [promptText + `\n\nDocument Link: ${link}`];
    } else {
      return res.status(400).json({ error: "No document provided" });
    }

    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              deadline: { type: Type.STRING },
              estimatedEffort: { type: Type.INTEGER }
            },
            required: ["title", "description", "estimatedEffort"]
          }
        }
      }
    });

    res.setHeader("Content-Type", "application/json");
    res.send(response.text || "[]");
  } catch (error: any) {
    console.error("Error in /api/agent/summarize-doc:", error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Leaderboard Insight Endpoint
app.post("/api/gemini/insight", async (req, res) => {
  let insightText = "";
  const { leaderboardData, userRank, userTasksDone } = req.body;
  try {
    const prompt = `
Given this leaderboard data: ${JSON.stringify(leaderboardData)}, and the current user is ranked ${userRank} with ${userTasksDone} tasks done today, generate a single short motivational insight (max 20 words) telling them how to improve or maintain their position.
`;
    const response = await getAi().models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insight: { type: Type.STRING }
          },
          required: ["insight"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    insightText = parsed.insight || "";
  } catch (error: any) {
    console.warn("Gemini API insight generation failed, using fallback:", error.message);
    
    // Construct robust fallback motivational message based on stats
    if (userRank === 1) {
      insightText = "Incredible work! You are leading the leaderboard. Keep this momentum to secure your crown!";
    } else if (userRank > 0 && userRank <= 3) {
      insightText = `You are ranked #${userRank}! Just a little extra push can get you to the top spot today.`;
    } else if (userTasksDone === 0) {
      insightText = "Ready to build your streak? Complete your first task today to rise up the ranks!";
    } else {
      insightText = `Awesome job completing ${userTasksDone} tasks! Keep ticking off items to rise up the leaderboard.`;
    }
  }

  res.setHeader("Content-Type", "application/json");
  res.json({ insight: insightText });
});

// --- Boot Server and Setup Vite Middleware ---

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nudge server is running on http://localhost:${PORT}`);
  });
}

startServer();
