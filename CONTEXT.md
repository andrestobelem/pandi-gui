# Pandi

Pandi is a desktop workspace where a Developer collaborates with a Coding Agent while keeping the interaction visible and controllable.

## Language

**Workspace**:
The directory that bounds the files and context available to a Session.
_Avoid_: Project, repository

**Developer**:
The person directing the Coding Agent through Pandi.
_Avoid_: User, operator

**Coding Agent**:
The software collaborator that receives Prompts and produces Responses or Tool Activity within a Workspace.
_Avoid_: Bot, assistant

**Session**:
The ongoing collaboration between a Developer and a Coding Agent within one Workspace.
_Avoid_: Chat, conversation

**Prompt**:
A Developer instruction submitted to the Coding Agent during a Session.
_Avoid_: Query, request

**Run**:
The lifecycle started by an accepted Prompt and completed when the Coding Agent settles, fails, or is aborted.
_Avoid_: Job, task

**Transcript**:
The ordered, visible record of Prompts, Responses, and Tool Activity in a Session.
_Avoid_: Chat history, message log

**Response**:
Natural-language output streamed by the Coding Agent during a Run.
_Avoid_: Answer, assistant message

**Tool Activity**:
A visible record of a tool invocation performed by the Coding Agent during a Run.
_Avoid_: Tool call, action log
