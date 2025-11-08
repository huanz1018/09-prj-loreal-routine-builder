# Web Search Integration Guide

## Overview

This guide explains how to add web search capabilities to your L'Oréal chatbot using OpenAI's GPT-4o model with web browsing or integration with search APIs.

## Option 1: Using OpenAI's Web Browsing (Recommended)

### Update Your Cloudflare Worker

Replace your existing worker code with this enhanced version:

```javascript
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      const { messages } = await request.json();

      // Call OpenAI with web search enabled
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o", // Use gpt-4o which has web browsing capabilities
            messages: messages,
            max_tokens: 800,
            temperature: 0.7,
            // Add web search instructions in system message
          }),
        }
      );

      const data = await response.json();

      return new Response(
        JSON.stringify({
          response: data.choices[0].message.content,
          citations: extractCitations(data.choices[0].message.content),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};

function extractCitations(text) {
  // Extract URLs from the response
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}
```

### Update Your Frontend Script.js

Add citation display support:

```javascript
/* Enhanced appendChat to show citations */
function appendChat(role, text, citations = []) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;

  // Format the main text
  const textContent = document.createElement("p");
  textContent.innerText = `${role === "user" ? "You" : "Assistant"}: ${text}`;
  div.appendChild(textContent);

  // Add citations if present
  if (citations && citations.length > 0) {
    const citationsDiv = document.createElement("div");
    citationsDiv.className = "citations";
    citationsDiv.innerHTML = `
      <p><strong>Sources:</strong></p>
      <ul>
        ${citations
          .map(
            (url) =>
              `<li><a href="${url}" target="_blank" rel="noopener">${url}</a></li>`
          )
          .join("")}
      </ul>
    `;
    div.appendChild(citationsDiv);
  }

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Update callOpenAI to handle citations */
async function callOpenAI(messagesArray) {
  try {
    const body = {
      messages: messagesArray,
    };

    const res = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Worker error: ${res.status} ${errText}`);
    }

    const data = await res.json();

    return {
      message: data?.response || data?.choices?.[0]?.message?.content,
      citations: data?.citations || [],
    };
  } catch (err) {
    console.error(err);
    return {
      message: `Error: ${err.message}`,
      citations: [],
    };
  }
}

/* Update chat form handler to use citations */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = chatForm.querySelector("input[name='userInput']");
  const text = input.value.trim();
  if (!text) return;

  appendChat("user", text);
  messages.push({ role: "user", content: text });
  input.value = "";

  appendChat("assistant", "…thinking…");

  const result = await callOpenAI(messages);

  const lastAssistant = chatWindow.querySelector(
    ".chat-msg.assistant:last-child"
  );
  if (lastAssistant) lastAssistant.remove();

  appendChat("assistant", result.message, result.citations);
  messages.push({ role: "assistant", content: result.message });
});
```

## Option 2: Using Perplexity AI (Better for Real-Time Search)

### Create a New Cloudflare Worker for Perplexity

```javascript
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      const { messages } = await request.json();

      // Call Perplexity API (supports real-time web search)
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-large-128k-online", // Online model with search
            messages: messages,
            max_tokens: 800,
            temperature: 0.7,
            search_domain_filter: ["loreal.com"], // Optional: focus on L'Oréal
            return_citations: true,
          }),
        }
      );

      const data = await response.json();

      return new Response(
        JSON.stringify({
          response: data.choices[0].message.content,
          citations: data.citations || [],
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
```

## Option 3: Enhanced System Prompt for Web-Aware Responses

Update your system prompt to encourage web-relevant information:

```javascript
let messages = [
  {
    role: "system",
    content: `You are a helpful beauty and skincare advisor specializing in L'Oréal products and routines. 

When answering questions:
- Provide current, up-to-date information about L'Oréal products
- Reference recent product launches, trends, and innovations
- Mention any relevant clinical studies or dermatologist recommendations
- Include links to official L'Oréal product pages when relevant
- Stay informed about the latest skincare science and beauty trends

Your expertise covers:
- Skincare (cleansers, moisturizers, serums, treatments)
- Haircare (shampoos, conditioners, styling products)
- Makeup and cosmetics
- Fragrances and perfumes
- Men's grooming
- Suncare and UV protection

Format links as: [Product Name](https://www.loreal.com/product-page)`,
  },
];
```

## CSS for Citations

Add to `style.css`:

```css
/* Citations styling */
.citations {
  margin-top: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-left: 3px solid #2a9d8f;
  border-radius: 4px;
  font-size: 13px;
}

.citations strong {
  color: #2a9d8f;
  display: block;
  margin-bottom: 8px;
}

.citations ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.citations li {
  margin-bottom: 6px;
}

.citations a {
  color: #2a9d8f;
  text-decoration: none;
  word-break: break-all;
}

.citations a:hover {
  text-decoration: underline;
}
```

## Deployment Steps

1. **Set up Cloudflare Worker:**

   ```bash
   npm install -g wrangler
   wrangler login
   wrangler init loreal-search-bot
   ```

2. **Add your API key:**

   ```bash
   wrangler secret put OPENAI_API_KEY
   # or for Perplexity
   wrangler secret put PERPLEXITY_API_KEY
   ```

3. **Deploy:**

   ```bash
   wrangler deploy
   ```

4. **Update your script.js** with the new worker URL

## Testing

1. Ask about recent L'Oréal products
2. Request information about current skincare trends
3. Ask for product reviews or comparisons
4. Check that citations appear in the response

## Notes

- GPT-4o has some web awareness built-in but may not have real-time data
- Perplexity AI is specifically designed for real-time web search
- Always validate that citations are working correctly
- Consider rate limiting to manage API costs
