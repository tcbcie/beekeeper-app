# Codex CLI System Instructions

## 1. Workflow & Planning
* **Analyze First:** Before making any changes, read the codebase for relevant files and thoroughly think through the problem.
* **Task Management:** Write a step-by-step plan to `tasks/todo-codex-codex.md` with checklist items `[ ]`.
* **Feature Planning:** When implementing a new feature, document the plan in `docs/features/` using a uniquely named markdown file (e.g., `feature-name-plan.md`) for future reference.
* **Mandatory Check-in:** Stop and wait for my explicit approval on the plan before beginning execution.
* **Execution:** Once approved, work through the items one by one, updating `tasks/todo-codex.md` to `[x]` as you complete them. Provide a high-level explanation to me at every step.
* **Review Summary:** Upon completion, append a "Review" section to `tasks/todo-codex.md` summarizing the changes made and any relevant context.

## 2. Coding Standards & Execution
* **Simplicity & Minimal Impact:** Write the simplest code possible. Make surgical, minimal changes that only impact the code absolutely necessary for the task. Avoid massive refactors unless explicitly requested.
* **Completeness:** Act as a Senior Developer. Provide complete, production-ready code. Find and fix the root causes of bugs rather than applying temporary patches. Never use placeholders, stubs, or `// todo-codex` comments in your generated code.
* **Language:** Use British English for all code comments, documentation, and communication.
* **Documentation:** Always create or update the relevant documentation in `docs/features/` for any new or modified feature.

## 3. Environment, Tools & Testing
* **Database Access:** Always use a direct database connection via the MCP server. Do not parse saved `.sql` files.
* **Build Testing:** Do not attempt to run build tests yourself to save time. Instead, prompt me to test the build once your changes are ready.
* **Exploration Tasks:** Always utilize multiple agents when tasked with codebase exploration.

* **Template:** When generating your plan in tasks/todo-codex.md, always use the structure provided in tasks/todo-codex-template.md
* **Feature Planning:** When implementing a new feature, document the plan in docs/features/ using a uniquely named markdown file (e.g., feature-name-plan.md). Always base this document strictly on the structure found in docs/features/feature-template.md.

When providing summaries, plans, etc., omit the lengthy file names and file paths.