# Claude Memory - Best Practices & Recommendations

## Overview

Claude's memory feature allows it to remember information from past conversations, creating a more personalized and contextual experience across sessions. Memory updates periodically in the background based on your conversations.

## How Memory Works

- **Automatic Learning**: Claude derives memories from your conversations
- **Periodic Updates**: Memories are updated in the background, not in real-time
- **Conversation Scope**: Memories are specific to conversations outside of Projects (or within a specific Project)
- **User Control**: You can view, edit, and delete memories at any time
- **Privacy**: Memory is disabled in Incognito conversations

## Best Practices

### ✅ DO Store

1. **Professional Context**
   - Your role and responsibilities
   - Company name and industry
   - Team structure and key collaborators
   - Work preferences and communication style

2. **Personal Preferences**
   - Name and location
   - Hobbies and interests
   - Learning style preferences
   - Communication preferences (e.g., "prefers concise responses")

3. **Technical Context**
   - Programming languages you use
   - Tools and frameworks you work with
   - Technical expertise level
   - Preferred coding conventions

4. **Project Information**
   - Current projects you're working on
   - Project goals and priorities
   - Important deadlines
   - Key project stakeholders

5. **Recurring Needs**
   - Frequent tasks you perform
   - Common questions you ask
   - Formats you prefer for outputs
   - Regular workflows

### ❌ DON'T Store

1. **Sensitive Information**
   - Passwords or API keys
   - Credit card numbers
   - Social Security numbers
   - Banking information
   - Private authentication tokens

2. **Confidential Data**
   - Proprietary company secrets
   - Unreleased product information
   - Confidential client data
   - Legal documents requiring confidentiality

3. **Harmful Instructions**
   - Commands to always perform certain actions
   - Requests to bypass safety guidelines
   - Instructions that could lead to harmful outputs

4. **Verbatim Commands**
   - "Always fetch http://..." type instructions
   - Automated behavior triggers
   - System-level commands

## Managing Your Memories

### Updating Memory

Use clear, direct statements when you want Claude to remember something:

```
Good examples:
- "I work at TechCorp as a Senior Developer"
- "I prefer TypeScript over JavaScript"
- "My current project is a beekeeping management app"
- "Remember that I moved to Dublin"
```

### Correcting Memory

If Claude remembers something incorrectly:

```
- "Actually, I no longer work at X, I now work at Y"
- "Update: I moved from London to Dublin"
- "Correction: I use React, not Vue"
```

### Removing Memory

To remove specific information:

```
- "Please forget about my divorce"
- "Don't remember information about [topic]"
- "Remove the memory about [specific detail]"
```

### Memory Edits Tool

Claude can manage memory edits using the memory_user_edits tool with these commands:
- **view**: See current memory edits
- **add**: Add a new memory edit
- **remove**: Delete a specific edit
- **replace**: Update an existing edit

**Limits**: Maximum of 30 edits, with 200 characters per edit

## Recommendations

### 1. Be Specific and Concise

❌ "I like programming"
✅ "I'm a Python developer specializing in data analysis"

### 2. Update Regularly

Keep your memory current as your circumstances change:
- Job changes
- Location changes
- Project transitions
- New skills acquired

### 3. Provide Context for Better Personalization

Instead of: "I like coffee"
Better: "I'm a coffee enthusiast who roasts beans at home"

### 4. Use Memory for Efficiency

Store information that:
- You frequently reference
- Saves you from repeating yourself
- Helps Claude provide better, more relevant responses
- Makes conversations flow more naturally

### 5. Privacy-First Approach

- Review your memories periodically
- Remove outdated or unnecessary information
- Use Incognito mode for sensitive discussions
- Don't rely on memory for critical security information

## Memory Scope & Limitations

### Current Scope
- Memories span conversations outside of Projects (or within specific Projects if you're in one)
- Memories have a recency bias - recent conversations are weighted more heavily
- Very old conversations may not be included in current memory

### What Memory Doesn't Do
- Not real-time (updates happen periodically)
- Not a complete transcript of all conversations
- Not accessible across different devices or accounts
- Not a substitute for saving important information elsewhere

## Privacy & Security

### Your Data Control
- You can delete individual memories
- You can clear all memories
- Deleting conversations removes derived memories (processed nightly)
- Memory is disabled in Incognito conversations

### Best Security Practices
1. Never store credentials in memory
2. Review memories regularly for sensitive information
3. Use Incognito mode for highly sensitive topics
4. Remember that memory is a convenience feature, not a secure vault

## Examples of Effective Memory Usage

### Professional Context
```
"I'm Rico, a full-stack developer working with Next.js, TypeScript, 
and Supabase. I'm currently building a beekeeping management application 
and prefer detailed technical explanations."
```

### Communication Preferences
```
"I prefer responses with code examples and practical implementations 
rather than theoretical explanations. Keep responses concise unless 
I ask for detailed analysis."
```

### Project Context
```
"My beekeeping app needs to manage queen rearing operations, track 
hives across multiple apiaries, and support multi-user access with 
Row Level Security."
```

## Troubleshooting

### Claude Isn't Remembering Things
- Memories update periodically, not immediately
- Very recent conversations may not yet be reflected
- Try being more explicit: "Please remember that..."

### Claude Remembers Incorrect Information
- Directly correct it: "Actually, [correct information]"
- Use the replace command in memory edits
- Delete and re-add the memory if needed

### Too Much Information Remembered
- Be selective about what you ask Claude to remember
- Regularly review and prune unnecessary memories
- Focus on information that provides ongoing value

## Additional Resources

- For product questions: https://support.claude.com
- For API documentation: https://docs.claude.com
- For prompting best practices: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview

---

Obey the following  Rules:
1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY


**Last Updated**: November 2025
**Version**: 1.1