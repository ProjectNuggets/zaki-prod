
  # Build Zaki AI Chatbot

  This is a code bundle for Build Zaki AI Chatbot. The original project is available at https://www.figma.com/design/XKGhYrzRPmbrM7awYg7Nj3/Build-Zaki-AI-Chatbot.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Backend (required, for API access + signup)

  The ZAKI frontend now sends all API requests through the backend so the admin API key stays server-side.
  Signup uses email verification handled by the backend.

  1) Start the backend in `/home/papa-nova-01/Documents/ZAKI/backend`.
  2) Set `VITE_ZAKI_BACKEND_URL` to the backend URL (ex: `http://localhost:8787`).
  
