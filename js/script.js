// Main function to initialize the chat interface
function initChat() {
    // Get all required DOM elements
    const chatToggle = document.getElementById('chatToggle');
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const sendButton = document.getElementById('sendMessage');
    const openIcon = document.querySelector('.open-icon');
    const closeIcon = document.querySelector('.close-icon');
    let rentalsData = [];

    // Keep the full conversation history to send with every request.
    const conversationHistory = [
        {
            role: 'assistant',
            content: 'Hi! I can help match you to the perfect offbeat rental. First question: what kind of vibe are you looking for (spooky, cozy, funny, surreal, or something else)?'
        }
    ];

    // Load rental data once so the assistant can use it for recommendations.
    async function loadRentalsData() {
        if (rentalsData.length > 0) {
            return;
        }

        const response = await fetch('./rentals.json');

        if (!response.ok) {
            throw new Error('Could not load rental data.');
        }

        const data = await response.json();
        rentalsData = data.rentals || [];
    }

    // Toggle chat visibility and swap icons
    chatToggle.addEventListener('click', function() {
        chatBox.classList.toggle('active');
        openIcon.style.display = chatBox.classList.contains('active') ? 'none' : 'block';
        closeIcon.style.display = chatBox.classList.contains('active') ? 'block' : 'none';
    });

    // Add a message bubble to the UI.
    function addMessageToChat(role, content) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', role === 'user' ? 'user' : 'bot');
        messageElement.textContent = content;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Send the full conversation to OpenAI and get the assistant response.
    async function getAssistantResponse() {
        await loadRentalsData();

        const messagesForApi = [
            {
                role: 'system',
                content: `You are Offbeat Assistant for a vacation rental site.\n\nFollow this conversation flow:\n1) Ask 2-3 short, simple questions to learn the user's preferences (for example: vibe, preferred location, and desired rating).\n2) Ask only one question at a time and keep each question friendly and brief.\n3) After you have enough info, recommend the top 2-3 rentals from the provided data.\n4) For each recommendation, include: rental name, location, rating, and a one-sentence reason it matches the user's answers.\n5) If information is missing, make a best effort recommendation and say what assumption you made.\n6) Use only the rentals in the provided data.\n\nFormatting and tone rules:\n- Keep the tone natural, warm, and conversational.\n- Use line breaks for readability.\n- When giving recommendations, format as a bullet list using '-' with one rental per bullet.\n- Keep each bullet concise (2-3 short lines max).\n\nRentals data:\n${JSON.stringify(rentalsData)}`
            },
            ...conversationHistory
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: messagesForApi,
                max_completion_tokens: 800,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || 'Unable to get a response right now.');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    // Handle user input and process messages
    async function handleUserInput(e) {
        e.preventDefault();
        const message = userInput.value.trim();

        if (!message) {
            return;
        }

        if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
            addMessageToChat('assistant', 'Please add your OpenAI API key in js/secrets.js first.');
            return;
        }

        userInput.value = '';
        addMessageToChat('user', message);
        conversationHistory.push({ role: 'user', content: message });

        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        try {
            const assistantReply = await getAssistantResponse();
            addMessageToChat('assistant', assistantReply);
            conversationHistory.push({ role: 'assistant', content: assistantReply });
        } catch (error) {
            addMessageToChat('assistant', `Sorry, something went wrong: ${error.message}`);
        } finally {
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
        }
    }

    // Listen for form submission
    chatForm.addEventListener('submit', handleUserInput);
}

// Initialize the chat interface
initChat();
