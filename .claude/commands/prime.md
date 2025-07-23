---
allowed-tools: Bash, Read
description: Load context for a new agent session by analyzing codebase structure and README
---

# Prime

This command loads essential context for a new agent session by examining the codebase structure and reading the project README.

## Instructions
- Run `git ls-files` to understand the codebase structure and file organization
- Read the README.md to understand the project purpose, setup instructions, and key information
- Exclude the following files from your context:
  - .gitignore
  - .claude/
  - .claude/commands/
  - .claude/commands/prime.md
  - .env
  - .env.local
  - .env.development.local
  - .env.test.local
  - .env.production.local
  - Labels.json
- Provide a concise overview of the project based on the gathered context

## Context
- Codebase structure git accessible: !`git ls-files`
- Project README: @README.md
- Documentation:
  - docs/AI_CONTENT_PROCESSING_SOLUTION.md
  - docs/IMPLEMENTATION_SUMMARY.md
  - specs/Technical Specifications.md
  - specs/DOCKER-SETUP.md
  - specs/CLAUDE.md