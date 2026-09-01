const FRONTEND_URL = "http://localhost:5173";

// Cookies needed; CF_CLEARANCE is optional
const CF_CLEARANCE = { name: "cf_clearance", value: "" };
const SHIBSESSION = { name: "", value: "" };
const AWSALB = { name: "AWSALB", value: "" };
const AWSALBCORS = { name: "AWSALBCORS", value: "" };

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

        if (allCookiesPopulated()) {
            console.log("All good! Returning back to frontend");
            const stringifiedCookies = JSON.stringify([CF_CLEARANCE, SHIBSESSION, AWSALB, AWSALBCORS])
            replaceCurrentTabURL(`${FRONTEND_URL}/set-cookie?cookies=${encodeURIComponent(stringifiedCookies)}`)
        }
    }
});

function allCookiesPopulated() {
    return SHIBSESSION.value !== "" &&
           AWSALB.value !== "" &&
           AWSALBCORS.value !== "";
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