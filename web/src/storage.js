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
    return JSON.parse(localStorage.getItem("zot-gpt-chats"));
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
}

// only call when the user has actually typed a new message in a new obtained chat id 
export async function createNewChat(chatId, role, message) {
    localStorage.setItem(chatId, JSON.stringify([{ role, message }]));
}

export async function getChatThread(chatId) {
    JSON.parse(localStorage.getItem(chatId));
}





