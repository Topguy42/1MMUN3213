"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FiSend, FiMenu, FiX, FiPlus, FiEdit2, FiTrash2, FiCopy, FiRefreshCw, FiSquare, FiChevronDown, FiSearch, FiPaperclip } from "react-icons/fi"
import ChatMessage from "./ChatMessage"
import Sidebar from "./Sidebar"
import styles from "./ai.module.css"

const APIEndpoint = "https://api.openai.com/v1/chat/completions"

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chats, setChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [attachedFiles, setAttachedFiles] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const abortControllerRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadChats()
  }, [])

  useEffect(() => {
    if (currentChatId) {
      const chat = chats.find(c => c.id === currentChatId)
      if (chat) {
        setMessages(chat.messages)
      }
    }
  }, [currentChatId, chats])

  const loadChats = () => {
    try {
      const saved = localStorage.getItem("ai_chats")
      if (saved) {
        const parsed = JSON.parse(saved)
        setChats(parsed)
        if (parsed.length > 0 && !currentChatId) {
          setCurrentChatId(parsed[0].id)
        }
      } else {
        createNewChat()
      }
    } catch (e) {
      console.error("Failed to load chats:", e)
      createNewChat()
    }
  }

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setMessages([])
  }

  const saveChat = useCallback((chatId, newMessages) => {
    setChats(prev => {
      const updated = prev.map(chat => {
        if (chat.id === chatId) {
          const title = newMessages[0]?.content.slice(0, 50) || "New Chat"
          return { ...chat, messages: newMessages, title }
        }
        return chat
      })
      localStorage.setItem("ai_chats", JSON.stringify(updated))
      return updated
    })
  }, [])

  const renameChat = (chatId, newTitle) => {
    setChats(prev => {
      const updated = prev.map(c => c.id === chatId ? { ...c, title: newTitle } : c)
      localStorage.setItem("ai_chats", JSON.stringify(updated))
      return updated
    })
  }

  const deleteChat = (chatId) => {
    setChats(prev => {
      const updated = prev.filter(c => c.id !== chatId)
      localStorage.setItem("ai_chats", JSON.stringify(updated))
      if (currentChatId === chatId) {
        if (updated.length > 0) {
          setCurrentChatId(updated[0].id)
        } else {
          createNewChat()
        }
      }
      return updated
    })
    setShowDeleteConfirm(false)
  }

  const getApiKey = () => {
    if (typeof window !== "undefined") {
      const key = localStorage.getItem("ai_api_key")
      if (!key) {
        const userKey = prompt("Please enter your OpenAI API key (saved locally):")
        if (userKey) {
          localStorage.setItem("ai_api_key", userKey)
          return userKey
        }
        return null
      }
      return key
    }
    return null
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && attachedFiles.length === 0 || loading) return

    const apiKey = getApiKey()
    if (!apiKey) {
      alert("API key required. Please provide your OpenAI API key.")
      return
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: [],
      files: attachedFiles,
    }

    if (input.trim()) {
      userMessage.content.push({ type: "text", text: input })
    }

    for (const file of attachedFiles) {
      if (file.type === "image") {
        userMessage.content.push({
          type: "image_url",
          image_url: { url: file.data },
        })
      }
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setAttachedFiles([])
    setLoading(true)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(APIEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-vision",
          messages: newMessages.map(m => ({
            role: m.role,
            content: Array.isArray(m.content) ? m.content : m.content,
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "",
      }
      let updatedMessages = [...newMessages, assistantMessage]

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const json = JSON.parse(data)
              const content = json.choices[0]?.delta?.content || ""
              if (content) {
                assistantMessage.content += content
                updatedMessages = [
                  ...newMessages,
                  { ...assistantMessage },
                ]
                setMessages(updatedMessages)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      saveChat(currentChatId, updatedMessages)
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error:", error)
        const errorMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, something went wrong. Please check your API key and try again.",
        }
        const errorMessages = [...newMessages, errorMessage]
        setMessages(errorMessages)
        saveChat(currentChatId, errorMessages)
      }
    } finally {
      setLoading(false)
    }
  }

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setLoading(false)
  }

  const regenerateResponse = async () => {
    if (messages.length === 0 || loading) return
    const lastUserIndex = messages.length - 2
    if (lastUserIndex < 0) return

    const userMessages = messages.slice(0, lastUserIndex + 1)
    setMessages(userMessages)
    setLoading(true)

    const apiKey = getApiKey()
    if (!apiKey) return

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(APIEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo",
          messages: userMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "",
      }
      let updatedMessages = [...userMessages, assistantMessage]

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const json = JSON.parse(data)
              const content = json.choices[0]?.delta?.content || ""
              if (content) {
                assistantMessage.content += content
                updatedMessages = [...userMessages, { ...assistantMessage }]
                setMessages(updatedMessages)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      saveChat(currentChatId, updatedMessages)
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    const newFiles = []

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          newFiles.push({
            id: Date.now() + Math.random(),
            name: file.name,
            type: "image",
            data: event.target.result,
          })
          setAttachedFiles(prev => [...prev, ...newFiles])
        }
        reader.readAsDataURL(file)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachedFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={setCurrentChatId}
          onNewChat={createNewChat}
          onRenameChat={renameChat}
          onDeleteChat={(id) => {
            setDeleteTarget(id)
            setShowDeleteConfirm(true)
          }}
        />

        {/* Main Chat Area */}
        <div className={styles.mainContent}>
          {/* Header */}
          <div className={styles.header}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={styles.menuBtn}
              title="Toggle sidebar"
            >
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <h1 className={styles.title}>AI Assistant</h1>
            <button
              onClick={createNewChat}
              className={styles.newChatBtn}
              title="New chat"
            >
              <FiPlus size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>✨</div>
                <h2 className={styles.emptyTitle}>Start a conversation</h2>
                <p className={styles.emptyText}>Type a message below to begin. No account needed.</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCopy={() => copyToClipboard(message.content)}
                />
              ))
            )}
            {loading && (
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Actions */}
          {messages.length > 0 && !loading && messages[messages.length - 1]?.role === "assistant" && (
            <div className={styles.actions}>
              <button
                onClick={regenerateResponse}
                className={styles.actionBtn}
                title="Regenerate response"
              >
                <FiRefreshCw size={16} />
                Regenerate
              </button>
              <button
                onClick={() => copyToClipboard(messages[messages.length - 1].content)}
                className={styles.actionBtn}
                title="Copy response"
              >
                <FiCopy size={16} />
                Copy
              </button>
            </div>
          )}

          {/* File Attachments Preview */}
          {attachedFiles.length > 0 && (
            <div style={{
              padding: "12px",
              borderTop: "1px solid #313e50",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}>
              {attachedFiles.map(file => (
                <div
                  key={file.id}
                  style={{
                    position: "relative",
                    borderRadius: "4px",
                    overflow: "hidden",
                    backgroundColor: "#1a1625",
                  }}
                >
                  <img
                    src={file.data}
                    alt={file.name}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachedFile(file.id)}
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0",
                    }}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage} className={styles.inputForm}>
            <div className={styles.inputWrapper}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className={styles.input}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.attachBtn}
                disabled={loading}
                title="Attach image"
              >
                <FiPaperclip size={20} />
              </button>
              {loading ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  className={`${styles.sendBtn} ${styles.stopBtn}`}
                  title="Stop generating"
                >
                  <FiSquare size={20} />
                </button>
              ) : (
                <button
                  type="submit"
                  className={styles.sendBtn}
                  disabled={!input.trim() && attachedFiles.length === 0 || loading}
                  title="Send message"
                >
                  <FiSend size={20} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Delete Chat</h3>
            <p>Are you sure? This cannot be undone.</p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteChat(deleteTarget)}
                className={styles.modalDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
