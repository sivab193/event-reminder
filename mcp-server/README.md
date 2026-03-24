# Event Reminder MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes the Event Reminder Firestore database to AI agents. Allows querying upcoming events and listing all tracked events for a user.

## Setup

```bash
npm install
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FIREBASE_CREDENTIALS` | ✅ | Path to `serviceAccountKey.json` |

If `FIREBASE_CREDENTIALS` is not set, the server looks for `../serviceAccountKey.json` (project root).

## Usage

```bash
# Direct
npm start

# Or via npx
npx event-reminder-mcp
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "event-reminder": {
      "command": "node",
      "args": ["/path/to/mcp-server/index.js"],
      "env": {
        "FIREBASE_CREDENTIALS": "/path/to/serviceAccountKey.json"
      }
    }
  }
}
```

## Available Tools

| Tool | Description | Parameters |
|---|---|---|
| `get_all_birthdays` | List all tracked events for a user | `userId` (required) |
| `get_upcoming_birthdays` | Get events within the next N days | `userId` (required), `days` (default: 30) |
