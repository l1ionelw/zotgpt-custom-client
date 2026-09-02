
const FRONTEND_URL = "http://localhost:5173";

// Cookies needed; CF_CLEARANCE is optional
const CF_CLEARANCE = { name: "cf_clearance", value: "" };
const SHIBSESSION = { name: "", value: "" };
const AWSALB = { name: "AWSALB", value: "" };
const AWSALBCORS = { name: "AWSALBCORS", value: "" };
let SIPHONED_CHATID = "";

chrome.cookies.onChanged.addListener((changeInfo) => {
    if (!changeInfo.removed && changeInfo.cookie.domain === "chat.zotgpt.uci.edu") {
        const cookie = changeInfo.cookie;
        console.log(`[ZotGPT Auth Extension] New or updated cookie found: ${cookie.name}:${cookie.value}`);
        console.log(changeInfo);

        if (cookie.name.startsWith("_shibsession_")) {
            SHIBSESSION.name = cookie.name;
            SHIBSESSION.value = cookie.value;
        }
        if (cookie.name === AWSALB.name) AWSALB.value = cookie.value;
        if (cookie.name === AWSALBCORS.name) AWSALBCORS.value = cookie.value;
        if (cookie.name === CF_CLEARANCE.name) CF_CLEARANCE.value = cookie.value;

        if (everythingPopulated()) {
            console.log("All good! Returning back to frontend");
            const stringifiedCookies = JSON.stringify([CF_CLEARANCE, SHIBSESSION, AWSALB, AWSALBCORS])
            replaceCurrentTabURL(`${FRONTEND_URL}/set-cookie?cookies=${encodeURIComponent(stringifiedCookies)}&freshChatId=${SIPHONED_CHATID}`)
        }
    }
});

function everythingPopulated() {
    return SHIBSESSION.value !== "" &&
           AWSALB.value !== "" &&
           AWSALBCORS.value !== "" && 
           SIPHONED_CHATID !== "";
}

function replaceCurrentTabURL(url) {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (!tabs.length) {
            console.log("ERROR: cant find da current tab");
            return;
        }

        chrome.tabs.update(tabs[0].id, {
            url: url,
        });
    });
}

// -------------

// tab listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const url = new URL(changeInfo.url);
    console.log(`Tab ${tabId} URL changed to: ${url.href}`);
    const urlpath = url.pathname; // /chat/<chatid>
    const chatId = urlpath.split("chat/")[1];
    if (chatId !== undefined) {
        // match
        SIPHONED_CHATID = chatId;
    } // no check here cuz the cookies get updated like 20 million times a sec so above will handle it
  }
});