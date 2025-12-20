I apologize for the confusion. The link I provided was an internal system path that doesn't work when searched in a browser, as shown in your screenshot.

Here is the **full content of the file**. You can copy the text inside the code block below, paste it into a text editor (like Notepad, TextEdit, or VS Code), and save it as Beekeeping\_App\_Architecture.md.

Markdown

\# Beekeeping App: AI Architecture & Implementation Strategy

\#\# 1\. High-Level Concept: The Hybrid RAG Approach

To effectively utilize both structured data (hives, inspections, weather) and unstructured data (books, studies, notes), you cannot rely on a single data topology. The correct approach is a **\*\*Hybrid RAG (Retrieval-Augmented Generation)\*\*** system governed by an **\*\*Intelligent Router\*\***.

\#\#\# The "Router" Pattern  
A central "Brain" (LLM) intercepts user queries and decides how to answer:

1\.  **\*\*Track A: The Private "Apiary" Data (Structured/SQL)\*\***  
    \* **\*\*Data:\*\*** Inspections, harvest logs, queen details, location.  
    \* **\*\*Mechanism:\*\*** **\*\*Text-to-SQL\*\***. The LLM generates database queries (e.g., \`SELECT weight FROM hives WHERE id=1\`).  
    \* **\*\*Why:\*\*** Ensures 100% accuracy for specific numbers (dates, weights, counts).

2\.  **\*\*Track B: The Knowledge Base (Unstructured/Vector)\*\***  
    \* **\*\*Data:\*\*** Books, scientific articles, PDF guides.  
    \* **\*\*Mechanism:\*\*** **\*\*Vector Search (Semantic)\*\***. The LLM retrieves relevant paragraphs based on meaning.  
    \* **\*\*Why:\*\*** Allows the user to ask "How do I treat mites?" and get answers based on vetted literature.

3\.  **\*\*Track C: The "Messy" Middle (Inspection Notes)\*\***  
    \* **\*\*Data:\*\*** Free-text user notes ("Bees looked angry").  
    \* **\*\*Mechanism:\*\*** **\*\*Hybrid Search\*\*** (SQL Filter by User \+ Vector Search on text).

\---

\#\# 2\. Technical Stack & Architecture

**\*\*Stack:\*\*** Next.js, React, TypeScript, Tailwind CSS, Supabase.

\#\#\# Database Design (Supabase)  
Supabase acts as the single source of truth, handling both relational data and vector embeddings via the \`pgvector\` extension.

**\*\*A. Structured Data (Existing Tables)\*\***  
Standard tables with **\*\*Row Level Security (RLS)\*\*** enabled to strictly isolate user data.  
\* \`hives\`, \`apiaries\`, \`inspections\`

**\*\*B. Unstructured Data (New Vector Table)\*\***  
A table to store chunks of text from books and studies.

\`\`\`sql  
create extension vector;

create table knowledge\_base (  
  id bigserial primary key,  
  content text,             \-- The paragraph text  
  metadata jsonb,           \-- {"source": "The Hive", "topic": "Diseases"}  
  embedding vector(1536)    \-- OpenAI Embedding  
);

### **The "Brain" (Next.js API Route)**

A single API route (e.g., /api/chat) using Vercel AI SDK acts as the orchestrator:

1. **Classification:** A cheap LLM (gpt-4o-mini) tags the user intent (SQL vs. Knowledge).  
2. **Execution (Parallel):**  
   * *If SQL:* Convert prompt to JSON parameters \-\> Execute Supabase Query.  
   * *If Knowledge:* Convert prompt to Embedding \-\> Execute Supabase RPC (Vector Match).  
3. **Synthesis:** Combine retrieved data \+ context \+ user question \-\> Final Answer.

## ---

**3\. Data Ingestion (The "Training" Myth)**

You do **not** fine-tune (train) the model on your books. You **index** them. This prevents hallucinations and allows for instant updates.

### **The Ingestion Pipeline (Admin Script)**

A TypeScript script runs offline to populate the knowledge\_base.

**Workflow:**

1. **Load:** Read PDF/Text files.  
2. **Split:** Chunk text into \~1000 character segments (paragraphs).  
3. **Embed:** Send chunks to OpenAI API to get a vector array.  
4. **Store:** Save the text \+ vector into Supabase.

**Sample Code Logic (to be implemented via the Settings page):**

TypeScript

import { OpenAIEmbeddings } from '@langchain/openai';  
import { RecursiveCharacterTextSplitter } from 'langchain/text\_splitter';

// Split text into digestible chunks  
const splitter \= new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });  
const chunks \= await splitter.splitDocuments(docs);

// Generate vectors and save to Supabase  
for (const chunk of chunks) {  
  const embedding \= await embeddings.embedQuery(chunk.pageContent);  
  await supabase.from('knowledge\_base').insert({   
    content: chunk.pageContent,   
    embedding: embedding   
  });  
}

## ---

**4\. Cost Analysis & Pricing**

AI apps incur **COGS (Cost of Goods Sold)** per interaction.

### **Developer Costs (Estimates per 1,000 queries)**

* **Routing (gpt-4o-mini):** \~$0.03 (Negligible).  
* **RAG/Knowledge (gpt-4o-mini):** \~$0.90 (Cheap).  
* **Complex SQL/Reasoning (gpt-4o):** \~$10.00 \- $25.00 (Expensive).  
* **Storage:** Vector storage in Supabase is extremely cheap (megabytes, not gigabytes).

### **Pricing Strategy: "Freemium with Tokens"**

Since costs are variable, you must limit usage of the "Smart" model.

1. **Free Tier:**  
   * Manual logging features.  
   * Limit: 5 "Smart" (SQL) queries/month.  
2. **Pro Tier ($9-$15/mo):**  
   * Unlimited manual logging & analytics.  
   * Limit: 100 "Smart" queries \+ Unlimited "Knowledge" queries.  
   * *Profit Margin:* \~$11/user (assuming average usage).

### **Cost Optimization Tips**

* **Use the Router:** Don't send "Hello" to GPT-4o. Use a tiny model to check intent first.  
* **Context Window:** Don't send the entire chat history forever. Summarize older messages.  
* **Image Analysis:** If users upload photos of frames for disease diagnosis, treat this as a Premium-only feature (images are expensive).