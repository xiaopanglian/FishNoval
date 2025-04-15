document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('novelFile');
  const selectFileBtn = document.getElementById('selectFile');
  const selectElementBtn = document.getElementById('selectElement');
  const statusDiv = document.getElementById('status');
  const novelPathDiv = document.getElementById('novelPath');
  const pathText = document.getElementById('pathText');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const fileInfo = document.getElementById('fileInfo');

  // 加载保存的小说路径
  chrome.storage.local.get(['novelPath'], function(result) {
    if (result.novelPath) {
      novelPathDiv.style.display = 'block';
      pathText.textContent = result.novelPath;
    } else {
      novelPathDiv.style.display = 'none';
    }
  });

  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        // 显示文件信息和进度条
        progressContainer.style.display = 'block';
        fileInfo.textContent = `正在加载: ${file.name} (${formatFileSize(file.size)})`;
        
        // 使用Promise包装文件读取
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          let content = '';
          const chunkSize = 1024 * 1024; // 1MB chunks
          let offset = 0;
          
          reader.onload = function(e) {
            content += e.target.result;
            offset += e.target.result.length;
            
            // 更新进度
            const progress = Math.min(100, Math.round((offset / file.size) * 100));
            progressBar.style.width = progress + '%';
            progressBar.textContent = progress + '%';
            
            if (offset < file.size) {
              // 继续读取下一块
              const blob = file.slice(offset, offset + chunkSize);
              reader.readAsText(blob);
            } else {
              // 文件读取完成
              resolve(content);
            }
          };
          
          reader.onerror = function() {
            reject(new Error('文件读取失败'));
          };
          
          // 开始读取第一块
          const firstChunk = file.slice(0, chunkSize);
          reader.readAsText(firstChunk);
        });
        
        // 文件读取完成后，只保存文件路径
        const filePath = file.webkitRelativePath || file.name;
        await new Promise((resolve) => {
          chrome.storage.local.set({
            novelPath: filePath,
            currentPage: 0
          }, resolve);
        });
        
        // 更新UI
        novelPathDiv.style.display = 'block';
        pathText.textContent = filePath;
        
        // 重置进度条状态
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressContainer.style.display = 'none';
        fileInfo.textContent = '';
        
        showStatus('小说文件已加载', 'success');
        
        // 通知content script更新内容，分块发送
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (tabs[0]) {
            // 先发送开始信号
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "startContentUpdate",
              totalSize: content.length
            });

            // 分块发送内容
            const chunkSize = 1024 * 1024; // 1MB chunks
            for (let i = 0; i < content.length; i += chunkSize) {
              const chunk = content.slice(i, i + chunkSize);
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "contentChunk",
                chunk: chunk,
                index: i,
                totalSize: content.length
              });
            }

            // 发送完成信号
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "endContentUpdate"
            });
          }
        });
        
      } catch (error) {
        // 发生错误时重置进度条状态
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
        progressContainer.style.display = 'none';
        fileInfo.textContent = '';
        showStatus('加载小说文件失败: ' + error.message, 'error');
      }
    }
  });

  selectElementBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "startElementSelection"});
      window.close();
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}); 