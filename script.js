/* Clean script (script.js) - selection + chat logic */
/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearchInput = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const toggleRTLBtn = document.getElementById("toggleRTL");
const directionLabel = document.getElementById("directionLabel");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Keep track of currently displayed products and user selections */
let currentProducts = []; // products currently shown in the grid (each has __pid)
let selectedProducts = []; // products chosen by the user (stores product objects with __pid)
let allProducts = []; // all loaded products for filtering
let currentCategory = ""; // currently selected category
let currentSearchTerm = ""; // currently typed search term

/* localStorage key for persisting selections */
const STORAGE_KEY = "loreal_selected_products";

/* Load selected products from localStorage */
function loadSelectedProductsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      selectedProducts = JSON.parse(stored);
      console.log(
        `Loaded ${selectedProducts.length} products from localStorage`
      );
    }
  } catch (err) {
    console.error("Error loading from localStorage:", err);
    selectedProducts = [];
  }
}

/* Save selected products to localStorage */
function saveSelectedProductsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
    console.log(`Saved ${selectedProducts.length} products to localStorage`);
  } catch (err) {
    console.error("Error saving to localStorage:", err);
  }
}

/* Clear all selections from memory and localStorage */
function clearAllSelections() {
  selectedProducts = [];
  saveSelectedProductsToStorage();
  renderSelectedProducts();
  updateGridSelectionStyles();
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  // Attach stable ids to products and save to currentProducts for lookups
  currentProducts = products.map((p, i) => {
    const pid = p.id ?? `${p.name.replace(/\s+/g, "-")}-${i}`;
    return Object.assign({}, p, { __pid: pid });
  });

  // Build the product card HTML. Each card gets a data-id attribute.
  productsContainer.innerHTML = currentProducts
    .map((product) => {
      const pid = product.__pid;
      const description = product.description || "No description available.";
      return `
      <div class="product-card" data-id="${pid}">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-brand">${product.brand ?? ""}</p>
          <button class="info-btn" aria-label="View product information" title="View description">
            <i class="fa-solid fa-circle-info"></i>
          </button>
        </div>
        <div class="product-description-overlay" role="tooltip">
          <button class="close-overlay" aria-label="Close description">&times;</button>
          <h4>${product.name}</h4>
          <p class="description-text">${description}</p>
        </div>
      </div>
    `;
    })
    .join("");

  // After rendering, update the grid to reflect any prior selections
  updateGridSelectionStyles();
}

/* Update the Selected Products panel based on selectedProducts array */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<p class="placeholder-message">No products selected</p>`;
    return;
  }

  // Each selected item has a remove button
  const itemsHTML = selectedProducts
    .map((p) => {
      const pid = p.__pid;
      return `
        <div class="selected-item" data-id="${pid}">
          <span class="product-name">${p.name}</span>
          <button class="remove-btn" aria-label="Remove ${p.name}">&times;</button>
        </div>
      `;
    })
    .join("");

  // Add a "Clear All" button if there are multiple items
  const clearAllBtn =
    selectedProducts.length > 1
      ? `<button class="clear-all-btn" aria-label="Clear all selections">Clear All</button>`
      : "";

  selectedProductsList.innerHTML = itemsHTML + clearAllBtn;
}

/* Helper to toggle selection state for a product id */
function toggleSelectionById(pid) {
  const alreadyIndex = selectedProducts.findIndex((p) => p.__pid === pid);

  if (alreadyIndex >= 0) {
    // Remove selection
    selectedProducts.splice(alreadyIndex, 1);
  } else {
    // Find product in the currently displayed list and add it
    const product = currentProducts.find((p) => p.__pid === pid);
    if (product) {
      selectedProducts.push(product);
    } else {
      // If product not currently displayed, add a minimal record
      selectedProducts.push({ name: pid, __pid: pid });
    }
  }

  // Update the UI list and grid highlighting
  renderSelectedProducts();
  updateGridSelectionStyles();

  // Save to localStorage whenever selection changes
  saveSelectedProductsToStorage();
}

/* Reflect selections visually in the product grid */
function updateGridSelectionStyles() {
  // Clear styles first then re-add for selected ones
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    const pid = card.getAttribute("data-id");
    const selected = selectedProducts.some((p) => p.__pid === pid);
    if (selected) {
      card.classList.add("selected");
      // Simple inline highlight for beginners (you can move this to CSS)
      card.style.border = "2px solid #2a9d8f";
      card.style.boxShadow = "0 0 6px rgba(42,157,143,0.25)";
    } else {
      card.classList.remove("selected");
      card.style.border = "";
      card.style.boxShadow = "";
    }
  });
}

/* Filter products based on category and search term */
function filterAndDisplayProducts() {
  let filteredProducts = allProducts;

  // Filter by category if one is selected
  if (currentCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === currentCategory
    );
  }

  // Filter by search term if user has typed something
  if (currentSearchTerm) {
    const searchLower = currentSearchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter((product) => {
      const nameMatch = product.name?.toLowerCase().includes(searchLower);
      const brandMatch = product.brand?.toLowerCase().includes(searchLower);
      const descMatch = product.description
        ?.toLowerCase()
        .includes(searchLower);
      return nameMatch || brandMatch || descMatch;
    });
  }

  // Show message if no results
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found. Try a different ${
          currentSearchTerm ? "search term" : "category"
        }.
      </div>
    `;
    return;
  }

  displayProducts(filteredProducts);
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  currentCategory = e.target.value;

  // Load all products if not already loaded
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  filterAndDisplayProducts();
});

/* Filter products as user types in search box */
productSearchInput.addEventListener("input", async (e) => {
  currentSearchTerm = e.target.value.trim();

  // Load all products if not already loaded
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  // If there's a search term but no category selected, search all products
  if (currentSearchTerm && !currentCategory) {
    currentCategory = ""; // Ensure we search across all categories
  }

  filterAndDisplayProducts();
});

/* ---------------- OpenAI Chat Integration ---------------- */
/* Notes for students:
   - Put your key in secrets.js as: const OPENAI_API_KEY = 'sk-...';
   - Do NOT commit secrets.js to git.
   - Directly calling the OpenAI API from the browser can be blocked by CORS
     or is insecure. For production use a server-side proxy.
*/

/* Simple messages array to keep chat context */
let messages = [
  {
    role: "system",
    content: `You are a helpful beauty and skincare advisor specializing in product recommendations and routine building. 

Your expertise covers:
- Skincare (cleansers, moisturizers, serums, treatments)
- Haircare (shampoos, conditioners, styling products)
- Makeup and cosmetics
- Fragrances and perfumes
- Men's grooming
- Suncare and UV protection

When users ask follow-up questions about their generated routine or any beauty-related topic, provide detailed, helpful answers. Reference the products and routine you've discussed when relevant.

If asked about topics completely unrelated to beauty, skincare, haircare, makeup, fragrance, or personal care, politely redirect the conversation back to your area of expertise.`,
  },
];

/* Helper to append chat messages to the UI */
function appendChat(role, text) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  div.innerText = `${role === "user" ? "You" : "Assistant"}: ${text}`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Cloudflare Worker URL - handles OpenAI API calls securely */
const workerUrl = "https://loreal-better-chatbot.huanzzhang1018.workers.dev/";

/* Call Cloudflare Worker to get chat response */
async function callOpenAI(messagesArray) {
  try {
    // Send messages to Cloudflare Worker (no API key needed in frontend!)
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

    // Read the assistant response from the worker
    const assistantMessage =
      data?.response || data?.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error("No assistant message in response");
    }

    return assistantMessage;
  } catch (err) {
    console.error(err);
    return `Error: ${err.message}`;
  }
}

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = chatForm.querySelector("input[name='userInput']");
  const text = input.value.trim();
  if (!text) return;

  // Add user's message to UI and messages array
  // The messages array maintains full conversation history,
  // including the system prompt, generated routine, and all follow-ups
  appendChat("user", text);
  messages.push({ role: "user", content: text });
  input.value = "";

  // Show a typing placeholder
  appendChat("assistant", "…thinking…");

  // Call OpenAI with full conversation history
  // This allows the AI to reference previous messages and the generated routine
  const assistantText = await callOpenAI(messages);

  // Remove last assistant placeholder and append real reply
  const lastAssistant = chatWindow.querySelector(
    ".chat-msg.assistant:last-child"
  );
  if (lastAssistant) lastAssistant.remove();
  appendChat("assistant", assistantText);

  // Save assistant reply in messages for context
  // This ensures future questions can reference this response
  messages.push({ role: "assistant", content: assistantText });
});

/* ---------------- UI Interaction Handlers ---------------- */

/* Handle product description overlays */
productsContainer.addEventListener("click", (evt) => {
  // Show description overlay when info button is clicked
  const infoBtn = evt.target.closest(".info-btn");
  if (infoBtn) {
    evt.stopPropagation(); // Prevent card selection
    const card = infoBtn.closest(".product-card");
    const overlay = card.querySelector(".product-description-overlay");
    overlay.classList.add("visible");
    return;
  }

  // Close overlay when close button is clicked
  const closeBtn = evt.target.closest(".close-overlay");
  if (closeBtn) {
    evt.stopPropagation(); // Prevent card selection
    const overlay = closeBtn.closest(".product-description-overlay");
    overlay.classList.remove("visible");
    return;
  }

  // Close overlay if clicking on the overlay background itself
  if (evt.target.classList.contains("product-description-overlay")) {
    evt.target.classList.remove("visible");
    return;
  }

  // Select/unselect product when clicking the card (but not overlay or buttons)
  const card = evt.target.closest(".product-card");
  if (!card) return;
  // Don't toggle selection if clicking inside the overlay
  if (evt.target.closest(".product-description-overlay")) return;

  const pid = card.getAttribute("data-id");
  toggleSelectionById(pid);
});

/* Allow removing items directly from the Selected Products list */
selectedProductsList.addEventListener("click", (evt) => {
  // Handle "Clear All" button click
  const clearAllBtn = evt.target.closest(".clear-all-btn");
  if (clearAllBtn) {
    if (
      confirm(
        `Are you sure you want to clear all ${selectedProducts.length} selected products?`
      )
    ) {
      clearAllSelections();
    }
    return;
  }

  // If user clicked the remove button, find the selected item's id
  const removeBtn = evt.target.closest(".remove-btn");
  if (!removeBtn) return;
  const item = removeBtn.closest(".selected-item");
  if (!item) return;
  const pid = item.getAttribute("data-id");
  toggleSelectionById(pid);
});

/* Generate Routine button - sends selected products to OpenAI */
generateRoutineBtn.addEventListener("click", async () => {
  // Check if any products are selected
  if (selectedProducts.length === 0) {
    appendChat(
      "assistant",
      "Please select at least one product to generate a routine."
    );
    return;
  }

  // Prepare selected products data (only the fields we need)
  const productsData = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand || "Unknown",
    category: p.category || "Unknown",
    description: p.description || "No description available",
  }));

  // Create a detailed prompt with the selected products
  const routinePrompt = `I have selected the following products:

${productsData
  .map(
    (p, i) =>
      `${i + 1}. ${p.name} by ${p.brand} (${p.category})
   Description: ${p.description}`
  )
  .join("\n\n")}

Please create a detailed skincare/beauty routine using these products. Include:
- The order in which to use them (morning and/or evening)
- How to apply each product
- Any tips for best results
- How often to use each product`;

  // Add the routine request to messages
  messages.push({ role: "user", content: routinePrompt });

  // Show user message in chat
  appendChat(
    "user",
    `Generate a routine for my ${selectedProducts.length} selected product${
      selectedProducts.length > 1 ? "s" : ""
    }`
  );

  // Show thinking indicator
  appendChat("assistant", "…creating your personalized routine…");

  // Call OpenAI with the routine request
  const assistantText = await callOpenAI(messages);

  // Remove thinking indicator
  const lastAssistant = chatWindow.querySelector(
    ".chat-msg.assistant:last-child"
  );
  if (lastAssistant) lastAssistant.remove();

  // Display the generated routine
  appendChat("assistant", assistantText);

  // Save assistant reply to messages for context
  messages.push({ role: "assistant", content: assistantText });
});

/* ---------------- RTL Language Support ---------------- */

// RTL toggle functionality
toggleRTLBtn.addEventListener("click", () => {
  const html = document.documentElement;
  const currentDir = html.getAttribute("dir");

  if (currentDir === "rtl") {
    // Switch to LTR
    html.setAttribute("dir", "ltr");
    html.setAttribute("lang", "en");
    directionLabel.textContent = "RTL";
    localStorage.setItem("preferredDirection", "ltr");
  } else {
    // Switch to RTL
    html.setAttribute("dir", "rtl");
    html.setAttribute("lang", "ar"); // Arabic as example RTL language
    directionLabel.textContent = "LTR";
    localStorage.setItem("preferredDirection", "rtl");
  }
});

// Load saved direction preference on page load
function loadDirectionPreference() {
  const savedDir = localStorage.getItem("preferredDirection");
  if (savedDir === "rtl") {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
    directionLabel.textContent = "LTR";
  }
}

/* ---------------- Page Initialization ---------------- */

// Load direction preference first
loadDirectionPreference();

// Load saved selections from localStorage on page load
loadSelectedProductsFromStorage();

// Render the selected products list (will show saved items if any)
renderSelectedProducts();

// Expose small helpers to console for manual testing
window.__lb_currentProducts = () => currentProducts;
window.__lb_selectedProducts = () => selectedProducts;
window.__lb_clearAll = clearAllSelections; // Helper to clear all from console
