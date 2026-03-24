#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const credPath = process.env.FIREBASE_CREDENTIALS || path.join(__dirname, "..", "serviceAccountKey.json");

if (fs.existsSync(credPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.error(`Firebase credentials not found at ${credPath}. Please create serviceAccountKey.json at project root.`);
  process.exit(1);
}

const db = admin.firestore();

const server = new Server(
  {
    name: "event-reminder-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_upcoming_birthdays",
        description: "Get upcoming birthdays for a specific user within the next X days",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "The Firebase User ID of the user whose birthdays to query"
            },
            days: {
              type: "number",
              description: "Number of days to look ahead (default: 30)"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_all_birthdays",
        description: "List all tracked birthdays for a specific user",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "The Firebase User ID"
            }
          },
          required: ["userId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_all_birthdays") {
    const userId = request.params.arguments.userId;
    const snapshot = await db.collection("birthdays").where("userId", "==", userId).get();
    
    const birthdays = snapshot.docs.map(doc => doc.data());
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(birthdays, null, 2)
        }
      ]
    };
  }

  if (request.params.name === "get_upcoming_birthdays") {
    const userId = request.params.arguments.userId;
    const days = request.params.arguments.days || 30;
    
    const snapshot = await db.collection("birthdays").where("userId", "==", userId).get();
    const birthdays = snapshot.docs.map(doc => doc.data());
    
    const today = new Date();
    const upcoming = birthdays.filter(b => {
      const [year, month, day] = b.birthdate.split('-');
      // Create a date for the birthday THIS year
      let bDate = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
      
      // If the birthday already passed this year, look at next year
      if (bDate < today && bDate.toDateString() !== today.toDateString()) {
        bDate.setFullYear(today.getFullYear() + 1);
      }
      
      const diffTime = Math.abs(bDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      return diffDays <= days;
    });

    // Sort by soonest
    upcoming.sort((a, b) => {
      const getDays = (bday) => {
        const [_, month, day] = bday.birthdate.split('-');
        let d = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));
        if (d < today && d.toDateString() !== today.toDateString()) d.setFullYear(today.getFullYear() + 1);
        return d.getTime();
      };
      return getDays(a) - getDays(b);
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(upcoming, null, 2)
        }
      ]
    };
  }

  throw new Error("Tool not found");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Event Reminder MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
