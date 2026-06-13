const SERVER = 'https://veloo.page';
let windowId = null;
chrome.action.onClicked.addListener(() => {
    if (windowId !== null) {
        chrome.windows.get(windowId, (win) => {
            if (chrome.runtime.lastError || !win) {
                openWindow();
            }
            else {
                chrome.windows.update(windowId, { focused: true });
            }
        });
    }
    else {
        openWindow();
    }
});
function openWindow() {
    chrome.windows.create({ url: chrome.runtime.getURL('popup.html'), type: 'popup', width: 560, height: 820 }, (win) => { if (win?.id != null)
        windowId = win.id; });
}
chrome.windows.onRemoved.addListener((id) => {
    if (id === windowId)
        windowId = null;
});
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_RESULT') {
        chrome.storage.local.get('lastResult', (data) => sendResponse(data['lastResult'] ?? null));
        return true;
    }
    if (msg.type === 'CLEAR_RESULT') {
        chrome.storage.local.remove('lastResult');
    }
});
export {};
