// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('FishNoval extension installed');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  if (request.action === 'fetch') {
    console.log('Background script received fetch request:', request.url);
    
    // 使用fetch发送请求
    fetch(request.url, {
      method: request.method || 'GET',
      headers: request.headers || {},
      mode: 'no-cors'
    })
    .then(response => {
      console.log('Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(text => {
      console.log('Fetch response text length:', text.length);
      console.log('Fetch response text preview:', text.substring(0, 100));
      sendResponse({ success: true, data: text });
    })
    .catch(error => {
      console.error('Fetch error:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // 保持消息通道开放
  }
}); 