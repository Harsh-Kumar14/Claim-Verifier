// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {tavily} from '@tavily/core';
import { Chat } from '@google/genai';

import type { FunctionDeclaration } from '@google/genai';

dotenv.config();
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ""
});
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

const getResults = async (query: string) => {
    try {
        const results = await tvly.search(query, { maxResults: 3 });
        return results;
    } catch (error) {
        console.error('Error searching with Tavily:', error);
        throw new Error('Failed to search for information');
    }
}

const getResult: FunctionDeclaration = {
    name: 'getResult',
    description: 'It searches the web for the latest information on a given item.',
    parametersJsonSchema: {
        type: 'object',
        properties: {
            itemName: { type: 'string', description: 'It is the text or phrase to search for.' },
        },
        required: ['itemName']
    }
}


// const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
// const { TavilySearchResults } = require("@langchain/community/tools/tavily_search");
// const { AgentExecutor, createReactAgent } = require("langchain/agents");
// const { pull } = require("langchain/hub");
// const { PromptTemplate } = require("@langchain/core/prompts");

// --- 1. Initialize Models and Tools ---
const app = express();
// --- 3. Set up the API Endpoint ---
app.use(cors());
app.use(express.json());
const port = 3001;


// --- 2. Create the Agent ---
async function createVeritasAgent(text: string) {

    const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
            tools: [{functionDeclarations: [getResult]}],
        }
    })
    // This prompt is the "brain" of our agent. It tells it its purpose, how to reason, and what tools it has.
    const promptTemplate = `
        You are 'Veritas Sentinel', an Agentic AI system designed to combat misinformation during crises by continuously monitoring and fact-checking emerging claims.
        
        MISSION:
        --------
        Your core mission is to detect emerging misinformation, verify facts through multiple reliable sources, and provide clear, contextual updates to help the public make informed decisions during crisis situations. You serve as a real-time truth verification system that bridges the gap between rumors and verified information.

        CRISIS CONTEXT AWARENESS:
        -------------------------
        - Prioritize information from official government agencies, emergency services, and established news organizations
        - Consider the urgency and potential harm of misinformation during crisis situations
        - Focus on information that could affect public safety, emergency response, or community well-being
        - Be sensitive to the emotional state of people during crises while maintaining factual accuracy

        TOOLS AVAILABLE:
        ----------------
        You have access to real-time web search capabilities to gather the latest information from:
        - Government agencies and official sources
        - Verified news outlets and journalists
        - Emergency services and public health organizations
        - Scientific institutions and research bodies
        - Social media monitoring for emerging claims

        VERIFICATION PROCESS:
        --------------------
        1. Rapidly assess the claim for potential crisis relevance and public impact
        2. Cross-reference multiple authoritative sources using your search tool
        3. Evaluate source credibility, recency, and consistency of information
        4. Consider the context and potential consequences of the misinformation
        5. Provide clear, actionable information that helps public understanding

        RESPONSE FORMAT:
        ----------------
        CRITICAL: You MUST respond with ONLY a raw JSON object. 
        - NO markdown code blocks (no triple backticks with json or without)
        - NO comments or explanations
        - NO additional text before or after the JSON
        - Start directly with { and end with }
        
        JSON Structure:
        {
          "claim": "The original user claim (exactly as submitted)",
          "status": "Verified" | "False" | "Partially True" | "Unconfirmed" | "Outdated",
          "confidence": "High" | "Medium" | "Low",
          "summary": "Clear, contextual explanation suitable for public consumption during crisis. Explain the current factual situation, why this status was determined, and any relevant context for decision-making.",
          "public_guidance": "Specific actionable guidance for the public based on verified facts",
          "sources": ["Primary authoritative source URL", "Secondary verification URL", "Additional context URL"],
          "last_verified": "Current timestamp of verification",
          "crisis_relevance": "High" | "Medium" | "Low"
        }

        COMMUNICATION PRINCIPLES:
        ------------------------
        - Use clear, jargon-free language accessible to all education levels
        - Provide context that helps people understand WHY something is true/false
        - Include actionable guidance when relevant to public safety
        - Maintain empathy while being factually precise
        - Address potential confusion or related misconceptions
        
        Begin verification process:

        CLAIM TO VERIFY:
        {input}
    `;

    const result = await runAgent(chat, promptTemplate.replace('{input}', text));
    console.log(result);
    return result;
}





const runAgent = async (chat: Chat, prompt: string, useTools: boolean = true) => {
  const result = await chat.sendMessage({message: prompt});
  const call = result.functionCalls?.[0];

  if (call && useTools && call.args && call.name) {
    console.log(`[Agent Action] Calling tool: ${call.name} with args:`, call.args);
    
    let apiResult;

    apiResult = await getResults(call.args.itemName as string);
    console.log(`[Tool Result]`, apiResult);
    
    const nextResult = await chat.sendMessage({
        message:[
            { 
                functionResponse: { 
                    name: call.name, 
                    response: { result: apiResult }
                } 
            }
        ]
    });   
    return nextResult.text;
  }
return result.text;
};

app.post('/verify-claim', async (req, res) => {
    const { claim } = req.body;
    if (!claim) {
        return res.status(400).json({ error: 'Claim is required' });
    }
    try {
        const verification = await createVeritasAgent(claim);
        res.json({ verification });
    } catch (error) {
        console.error('Error verifying claim:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Agentic server running on http://localhost:${port}`);
});