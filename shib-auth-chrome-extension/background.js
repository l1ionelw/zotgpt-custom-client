chrome.cookies.onChanged.addListener((changeInfo) => {
    if (!changeInfo.removed) {
        console.log(`[ZotGPT Auth Extension] New or updated cookie found at ${changeInfo.cookie.domain}`);
        console.log(changeInfo);
    }
});