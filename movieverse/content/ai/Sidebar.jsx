"use client"

import { useState } from "react"
import { FiPlus, FiTrash2, FiEdit2, FiSearch } from "react-icons/fi"
import styles from "./sidebar.module.css"

export default function Sidebar({
  isOpen,
  onClose,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState("")

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRename = (chatId, currentTitle) => {
    setEditingId(chatId)
    setEditingTitle(currentTitle)
  }

  const saveRename = (chatId) => {
    if (editingTitle.trim()) {
      onRenameChat(chatId, editingTitle)
    }
    setEditingId(null)
  }

  return (
    <>
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
        <div className={styles.header}>
          <button onClick={onNewChat} className={styles.newBtn} title="New chat">
            <FiPlus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        <div className={styles.search}>
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.chatsList}>
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`${styles.chatItem} ${
                currentChatId === chat.id ? styles.active : ""
              }`}
            >
              {editingId === chat.id ? (
                <div className={styles.editForm}>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    autoFocus
                    className={styles.editInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(chat.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                  />
                  <button onClick={() => saveRename(chat.id)} className={styles.saveBtn}>
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className={styles.chatTitle}
                    title={chat.title}
                  >
                    {chat.title}
                  </button>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleRename(chat.id, chat.title)}
                      className={styles.actionBtn}
                      title="Rename"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteChat(chat.id)}
                      className={styles.actionBtn}
                      title="Delete"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
    </>
  )
}
