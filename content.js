let selectedElement = null;
let isVisible = true;
let novelContent = '';  // 添加全局变量声明
let currentPage = 0;    // 添加全局变量声明
let contentBuffer = ''; // 用于接收分块内容
let isReceivingContent = false; // 标记是否正在接收内容
const PAGE_SIZE = 20; // 改为20个字符一页

// 创建小说显示容器
const novelContainer = document.createElement('div');
novelContainer.style.cssText = `
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  padding: 10px;
  z-index: 10000;
  max-width: 300px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: none;
`;
document.body.appendChild(novelContainer);

// 创建高亮覆盖层
const highlightOverlay = document.createElement('div');
highlightOverlay.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9999;
  display: none;
  pointer-events: none;
`;
document.body.appendChild(highlightOverlay);

// 创建提示文本
const selectionHint = document.createElement('div');
selectionHint.style.cssText = `
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #4CAF50;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 10000;
  display: none;
  font-family: Arial, sans-serif;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
`;
selectionHint.textContent = '点击选择要显示小说的位置 (按ESC取消)';
document.body.appendChild(selectionHint);

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startElementSelection") {
    startElementSelection();
  } else if (request.action === "startContentUpdate") {
    // 开始接收新内容
    contentBuffer = '';
    isReceivingContent = true;
  } else if (request.action === "contentChunk") {
    // 接收内容块
    if (isReceivingContent) {
      contentBuffer += request.chunk;
    }
  } else if (request.action === "endContentUpdate") {
    // 内容接收完成
    if (isReceivingContent) {
      novelContent = contentBuffer;
      currentPage = 0;
      contentBuffer = '';
      isReceivingContent = false;
      if (selectedElement) {
        displayContent();
      }
    }
  }
});

// 监听键盘事件
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.shiftKey) {
    switch (event.key) {
      case 'ArrowRight':
        nextPage();
        break;
      case 'ArrowLeft':
        prevPage();
        break;
      case 'J':
      case 'j':
        enableFeature();
        break;
      case 'K':
      case 'k':
        disableFeature();
        break;
    }
  }
});

function startElementSelection() {
  // 重置状态
  selectedElement = null;
  isVisible = true;
  
  // 显示选择界面
  document.body.style.cursor = 'crosshair';
  highlightOverlay.style.display = 'block';
  selectionHint.style.display = 'block';
  
  // 添加事件监听器
  document.addEventListener('click', handleElementSelection, true);
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('keydown', handleKeyDown, true);
}

function handleMouseMove(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  if (element) {
    const rect = element.getBoundingClientRect();
    highlightOverlay.style.background = `
      linear-gradient(to right, 
        rgba(0, 0, 0, 0.3) 0%, 
        rgba(0, 0, 0, 0.3) ${rect.left}px, 
        rgba(76, 175, 80, 0.3) ${rect.left}px, 
        rgba(76, 175, 80, 0.3) ${rect.right}px, 
        rgba(0, 0, 0, 0.3) ${rect.right}px, 
        rgba(0, 0, 0, 0.3) 100%
      ),
      linear-gradient(to bottom, 
        rgba(0, 0, 0, 0.3) 0%, 
        rgba(0, 0, 0, 0.3) ${rect.top}px, 
        rgba(76, 175, 80, 0.3) ${rect.top}px, 
        rgba(76, 175, 80, 0.3) ${rect.bottom}px, 
        rgba(0, 0, 0, 0.3) ${rect.bottom}px, 
        rgba(0, 0, 0, 0.3) 100%
      )
    `;
  }
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    cancelSelection();
  }
}

function cancelSelection() {
  // 移除选择界面
  document.body.style.cursor = '';
  highlightOverlay.style.display = 'none';
  selectionHint.style.display = 'none';
  
  // 移除事件监听器
  document.removeEventListener('click', handleElementSelection, true);
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

function handleElementSelection(event) {
  event.preventDefault();
  event.stopPropagation();
  
  // 保存选中的元素
  selectedElement = event.target;
  
  // 移除选择界面
  cancelSelection();
  
  // 显示小说内容
  showNovelContent();
}

function displayContent() {
  if (selectedElement && novelContent) {
    const start = currentPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, novelContent.length);
    const pageContent = novelContent.substring(start, end);
    selectedElement.textContent = pageContent;
  }
}

function showNovelContent() {
  if (selectedElement) {
    // 保存原始内容
    if (!selectedElement.dataset.originalContent) {
      selectedElement.dataset.originalContent = selectedElement.textContent;
    }
    
    // 显示小说内容或原始内容
    if (isVisible && novelContent) {
      displayContent();
    } else {
      selectedElement.textContent = selectedElement.dataset.originalContent;
    }
  }
}

function nextPage() {
  if (novelContent) {
    const newPage = currentPage + 1;
    const maxPages = Math.ceil(novelContent.length / PAGE_SIZE);
    
    if (newPage < maxPages) {
      currentPage = newPage;
      chrome.storage.local.set({ currentPage: newPage });
      displayContent();
    }
  }
}

function prevPage() {
  if (novelContent) {
    const newPage = currentPage - 1;
    
    if (newPage >= 0) {
      currentPage = newPage;
      chrome.storage.local.set({ currentPage: newPage });
      displayContent();
    }
  }
}

function enableFeature() {
  isVisible = true;
  showNovelContent();
}

function disableFeature() {
  isVisible = false;
  showNovelContent();
}

// 加载小说内容
function loadNovelContent() {
  // 从chrome.storage中只加载当前页码
  chrome.storage.local.get(['currentPage'], function(result) {
    currentPage = result.currentPage || 0;
    if (selectedElement && novelContent) {
      displayContent();
    }
  });
}

// 初始化时加载内容
loadNovelContent(); 