import streamlit as st
import requests
import json
from datetime import datetime
import uuid

# Configuration
BACKEND_URL = "http://localhost:8000"

# Page config
st.set_page_config(
    page_title="SharedLM Chat",
    page_icon="🤖",
    layout="wide"
)

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []
if "user_id" not in st.session_state:
    st.session_state.user_id = f"user_{uuid.uuid4().hex[:8]}"
if "current_model" not in st.session_state:
    st.session_state.current_model = "openai"

# Helper functions
def call_backend(endpoint, data=None, method="GET"):
    """Call backend API"""
    try:
        if method == "GET":
            response = requests.get(f"{BACKEND_URL}{endpoint}")
        else:
            response = requests.post(f"{BACKEND_URL}{endpoint}", json=data)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Backend error: {response.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to backend. Make sure it's running on localhost:8000")
        return None
    except Exception as e:
        st.error(f"Error: {str(e)}")
        return None

def send_message(message, model_choice):
    """Send message to backend and get response"""
    data = {
        "user_id": st.session_state.user_id,
        "message": message,
        "model_choice": model_choice
    }
    
    response = call_backend("/chat", data, "POST")
    if response:
        return response["reply"], response["used_model"], response["memories"]
    return None, None, None

def search_memories(query):
    """Search memories for debugging"""
    data = {
        "user_id": st.session_state.user_id,
        "query": query,
        "limit": 10
    }
    
    response = call_backend("/memory/search", data, "POST")
    if response:
        return response["memories"]
    return []

# UI Layout
st.title("🤖 SharedLM Chat Interface")
st.caption("Unified chat with shared memory across LLMs")

# Sidebar
with st.sidebar:
    st.header("Settings")
    
    # User ID
    st.subheader("User ID")
    new_user_id = st.text_input("User ID", value=st.session_state.user_id)
    if st.button("Update User ID"):
        st.session_state.user_id = new_user_id
        st.session_state.messages = []  # Clear messages for new user
        st.rerun()
    
    # Model Selection
    st.subheader("Model Selection")
    model_choice = st.selectbox(
        "Choose Model",
        ["openai", "anthropic"],
        index=0 if st.session_state.current_model == "openai" else 1
    )
    
    if model_choice != st.session_state.current_model:
        st.session_state.current_model = model_choice
        st.info(f"Switched to {model_choice}")
    
    # Memory Debug
    st.subheader("Memory Debug")
    if st.button("Search My Memories"):
        memories = search_memories("")
        if memories:
            st.write("**Your Memories:**")
            for i, memory in enumerate(memories, 1):
                st.write(f"{i}. {memory}")
        else:
            st.write("No memories found")
    
    # Clear Chat
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.rerun()
    
    # Backend Status
    st.subheader("Backend Status")
    health = call_backend("/health")
    if health:
        st.success("✅ Backend Connected")
    else:
        st.error("❌ Backend Disconnected")

# Main Chat Interface
st.header("Chat")

# Display messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.write(message["content"])
        if message["role"] == "assistant":
            st.caption(f"Model: {message.get('model', 'unknown')}")
            if message.get("memories"):
                with st.expander("Retrieved Memories"):
                    for memory in message["memories"]:
                        st.write(f"• {memory}")

# Chat input
if prompt := st.chat_input("Type your message here..."):
    # Add user message
    st.session_state.messages.append({
        "role": "user",
        "content": prompt,
        "timestamp": datetime.now()
    })
    
    # Display user message
    with st.chat_message("user"):
        st.write(prompt)
    
    # Get response from backend
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            reply, used_model, memories = send_message(prompt, st.session_state.current_model)
            
            if reply:
                st.write(reply)
                st.caption(f"Model: {used_model}")
                
                # Show retrieved memories
                if memories:
                    with st.expander("Retrieved Memories"):
                        for memory in memories:
                            st.write(f"• {memory}")
                
                # Add assistant message to session
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": reply,
                    "model": used_model,
                    "memories": memories,
                    "timestamp": datetime.now()
                })
            else:
                st.error("Failed to get response from backend")

# Footer
st.markdown("---")
st.caption(f"User ID: {st.session_state.user_id} | Current Model: {st.session_state.current_model}")