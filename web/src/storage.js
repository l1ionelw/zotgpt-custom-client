// internal localstorage manager

/*
localstorage
key = <chatid>
value = [{role: "user", message: "hi"}, {role: "assistant", message: "hello :D"}]

zot-gpt-chats = [{chatid: <chatid>, title: "greeting", createdAt: <js unix timestamp>, lastMessage: <js unix timestamp>}] so the program knows what chat ids exist

philisophy - always read from the store in case there was an update from another tab
when theres a lotta messages seperating them by chatid means u dont update the entire history through one localhistory entry
spliting them up means we only update 1 chat data key value in localstorage so we don't read the entire history on a sync

concurrent writes arent handled by js or chromium storage api by default. must lock on writes, only reads is ok
*/

export async function getChatList() {
    const raw = localStorage.getItem("zot-gpt-chats");
    return raw ? JSON.parse(raw) : [];
}

// upserts a chat's entry in the zot-gpt-chats list, bumping lastMessage
async function updateChatMetadata(chatId, patch = {}) {
    await navigator.locks.request("chat-list-lock", async () => {
        const raw = localStorage.getItem("zot-gpt-chats");
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((c) => c.chatId === chatId); // chat id already exists? if so find it
        const now = Date.now();
        if (idx === -1) { // doesnt exist, create new. fallback to unnamed chat if no name 
            list.push({ chatId, title: "unnamed chat", createdAt: now, lastMessage: now, ...patch });
        } else { // exists? just apply patch
            list[idx] = { ...list[idx], ...patch, lastMessage: now };
        }
        localStorage.setItem("zot-gpt-chats", JSON.stringify(list));
    });
}


// role is user or assistant
export async function storeNewChatMessage(chatId, role, message) {
    // refresh history incase another tab changed it
    await navigator.locks.request(`chat-lock-${chatId}`, async () => {
        const raw = localStorage.getItem(chatId);
        const chatHistory = raw ? JSON.parse(raw) : [];
        chatHistory.push({ role, message });
        localStorage.setItem(chatId, JSON.stringify(chatHistory));
    });
    await updateChatMetadata(chatId);
}

// only call when the user has actually typed a new message in a new obtained chat id
export async function createNewChat(chatId, role, message) {
    localStorage.setItem(chatId, JSON.stringify([{ role, message }]));
    await updateChatMetadata(chatId, { title: message.slice(0, 40) });
}

export async function getChatThread(chatId) {
    const raw = localStorage.getItem(chatId);
    return raw ? JSON.parse(raw) : [];
}

// renames a chat's entry in the zot-gpt-chats list without touching lastMessage
// (so renaming doesn't reshuffle a list sorted by recency)
export async function renameChat(chatId, title) {
    await navigator.locks.request("chat-list-lock", async () => {
        const raw = localStorage.getItem("zot-gpt-chats");
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((c) => c.chatId === chatId);
        if (idx === -1) return;
        list[idx] = { ...list[idx], title };
        localStorage.setItem("zot-gpt-chats", JSON.stringify(list));
    });
}

// deletes a chat's message history and removes it from the zot-gpt-chats list
export async function deleteChat(chatId) {
    await navigator.locks.request(`chat-lock-${chatId}`, async () => {
        localStorage.removeItem(chatId);
    });
    await navigator.locks.request("chat-list-lock", async () => {
        const raw = localStorage.getItem("zot-gpt-chats");
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem("zot-gpt-chats", JSON.stringify(list.filter((c) => c.chatId !== chatId))
        );
    });
}





