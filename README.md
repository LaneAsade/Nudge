# Nudge

> An AI-powered productivity dashboard that turns deadlines, documents, goals, habits, and daily tasks into an organized, actionable plan.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Nudge-facc15?style=for-the-badge&logo=googlechrome&logoColor=black)](https://the-last-minute-life-saver-202640251550.asia-southeast1.run.app/)

## Overview

Nudge is an intelligent productivity assistant that helps users manage tasks, deadlines, habits, goals, documents, and calendar events from one dashboard.

Unlike a traditional to-do list, Nudge analyzes the user's workload and recommends useful actions. It can identify urgent tasks, propose focus sessions, summarize uploaded documents, extract action items, and help users plan their day.

Important actions remain under the user's control. Users can review, edit, approve, or reject AI-generated suggestions before they are executed.

## Problem

Students and professionals often manage their work across disconnected tools:

- Task managers
- Calendars
- Emails
- Notes and documents
- Habit trackers
- Deadline reminders

This fragmentation makes it harder to decide what to do first, how much time to allocate, and whether important deadlines are being overlooked.

Nudge brings these workflows together and provides context-aware assistance for planning and execution.

## Features

### Intelligent Task Management

Create, organize, prioritize, and track tasks from one dashboard.

### AI Agent Control

The integrated AI agent can propose actions such as:

- Reprioritizing tasks
- Blocking focus time
- Preparing reminder plans
- Drafting emails
- Identifying urgent deadlines
- Suggesting the next best action

Users can review and approve actions before they are executed.

### Goal Tracking

Create long-term goals and monitor progress through visual indicators.

### Habit Monitoring

Track recurring habits, maintain streaks, and review daily completion progress.

### Calendar Integration

View upcoming events and connect tasks with scheduled focus sessions.

### AI Document Summarizer

Upload documents and use Nudge to:

- Generate concise summaries
- Extract key information
- Detect deadlines
- Identify action items
- Suggest related tasks
- Prepare tasks for addition to the dashboard

### Productivity Insights

Monitor:

- Completed tasks
- Remaining tasks
- Active goals
- Habit streaks
- Energy level
- Priority distribution
- Daily progress

### Leaderboard

Compare productivity progress and encourage consistency through healthy competition.

## Example Workflow

1. Upload an internship or assignment document.
2. Nudge summarizes it and identifies a deadline.
3. Review the extracted action items.
4. Approve the creation of a related task.
5. Let Nudge prioritize it based on urgency.
6. Review a proposed calendar focus block.
7. Edit or approve the schedule.
8. Generate a related email or reminder.
9. Track the updated task and goal progress.

## Product Principles

### Context-Aware Assistance

Nudge considers deadlines, goals, task status, available time, and user activity before making recommendations.

### Human Approval

AI-generated actions should not be executed without user awareness.

### Actionable Outputs

Nudge converts information into practical next steps instead of only displaying generic advice.

### Unified Productivity

Tasks, goals, habits, documents, and calendars are managed in one connected workspace.

## Application Sections

- **Landing Page** — Introduces Nudge and its main capabilities.
- **Active Overview** — Summarizes tasks, goals, habits, deadlines, and productivity metrics.
- **Tasks** — Displays pending, completed, overdue, and prioritized tasks.
- **Agent Control** — Shows AI observations and proposed actions.
- **Calendar** — Displays events and recommended focus sessions.
- **Leaderboard** — Shows productivity rankings.
- **Document Summarizer** — Extracts summaries, deadlines, and action items.

### Deployment

- Platform: Google Cloud Run
- Live app: [Nudge](https://the-last-minute-life-saver-202640251550.asia-southeast1.run.app/)

## Security and Privacy

- Never expose API keys in frontend code.
- Validate uploaded files.
- Restrict accepted file types and sizes.
- Encrypt sensitive data in transit and at rest.
- Request only the permissions required by integrations.
- Allow users to revoke connected services.
- Require confirmation before executing AI-generated actions.
- Clearly explain whether documents are stored or deleted.
- Provide an undo mechanism for important actions.
- Avoid logging private document contents or authentication tokens.

## Current Limitations

- Calendar synchronization may require configuration.
- Email actions may generate drafts instead of sending messages.
- AI-generated schedules may require manual adjustment.
- The leaderboard may use demonstration data.
- Document extraction accuracy may depend on file quality.
- Some metrics may be illustrative.

## Roadmap

- Editable previews for AI-generated actions
- Better calendar synchronization states
- Undo support for executed actions
- Improved loading and error feedback
- Better mobile responsiveness
- Reduced nested scrolling
- Customizable dashboard modules
- Team and study-group leaderboards
- Notification preferences
- Document-retention controls
- Improved accessibility
- Goal and habit analytics
- Integration tests for agent workflows

Recommended test areas:

- Task creation and updates
- Goal and habit progress
- AI response validation
- Document upload restrictions
- Action approval and rejection
- Calendar conflict detection
- Authentication and authorization
- Error and loading states
- Responsive layouts
- Keyboard navigation

## Deployment

The current application is deployed using Google Cloud Run.

A production deployment should include:

- Secure environment variables
- Production database configuration
- HTTPS
- CORS restrictions
- File-upload limits
- Authentication callback URLs
- Logging and monitoring
- Health checks
- Rate limiting
- Error tracking

## License

This project is licensed under the MIT License.

