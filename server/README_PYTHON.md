# Python 客户端使用说明

## 安装依赖

```bash
pip install -r requirements.txt
```

或直接安装：

```bash
pip install requests urllib3
```

## 基本使用

### 导入客户端

```python
from translation_client import TranslationClient, TranslationConfig, TranslationMethod

client = TranslationClient(base_url="http://localhost:3001")
```

### 单文本翻译

```python
# 使用免费 GTX API
result = client.translate(
    text="Hello, world!",
    target_language="zh",
    source_language="en",
    translation_method="gtxFreeAPI",
)

print(result.result)  # 你好，世界！

# 使用 DeepSeek
config = TranslationConfig(
    apiKey="your-api-key",
    model="deepseek-chat",
    temperature=0.7,
)

result = client.translate(
    text="Hello, world!",
    target_language="zh",
    source_language="en",
    translation_method="deepseek",
    config=config,
)

print(result.result)
```

### 批量翻译

```python
texts = ["Hello", "World", "How are you?", "Good morning"]

result = client.batch_translate(
    texts=texts,
    target_language="zh",
    source_language="en",
    translation_method="gtxFreeAPI",
)

if result.success:
    for i, (orig, trans) in enumerate(zip(texts, result.results)):
        print(f"{i+1}. {orig} → {trans}")
```

### 异步批量翻译（带进度跟踪）

```python
texts = ["Hello", "World", "How are you?"] * 100  # 大批量

try:
    job = client.translate_async(
        texts=texts,
        target_language="zh",
        source_language="en",
        translation_method="gtxFreeAPI",
        poll_interval=1.0,  # 每秒轮询一次
        timeout=300,         # 5分钟超时
    )

    print(f"翻译完成")
    print(f"任务ID: {job.jobId}")
    print(f"结果数量: {len(job.result or [])}")

except TranslationClientError as e:
    print(f"翻译失败: {e}")
```

### 上传字幕文件

```python
from pathlib import Path
from io import BytesIO

# 方式1: 使用文件路径
with open("subtitle.srt", "rb") as f:
    result = client.upload_subtitle(f, filename="subtitle.srt")

# 方式2: 使用 BytesIO
content = Path("subtitle.srt").read_bytes()
file_obj = BytesIO(content)

result = client.upload_subtitle(
    file_obj,
    file_type="srt",  # 可选，不指定则自动检测
    filename="subtitle.srt",
)

if result.success:
    print(f"文件类型: {result.fileType}")
    print(f"总行数: {result.totalLines}")
    print(f"内容行: {result.contentLines[:5]}...")  # 显示前5行
```

### 生成双语字幕

```python
original_lines = ["Hello", "World", "How are you?"]
translated_lines = ["你好", "世界", "你好吗？"]

content = client.generate_bilingual_subtitle(
    original_lines=original_lines,
    translated_lines=translated_lines,
    file_type="srt",
    bilingual_subtitle=True,
)

# 保存到文件
with open("bilingual.srt", "wb") as f:
    f.write(content)
```

### 任务管理

```python
# 获取所有任务
jobs = client.get_all_jobs()
for job in jobs:
    print(f"{job.jobId}: {job.status} ({job.progress}%)")

# 查询特定任务状态
job = client.get_job_status("job_1234567890_abc123")
print(f"状态: {job.status}")
print(f"进度: {job.progress}%")

# 删除任务
success = client.delete_job("job_1234567890_abc123")
print(f"删除成功: {success}")
```

### 健康检查

```python
# 基础健康检查
is_healthy = client.health_check()
print(f"服务器状态: {'正常' if is_healthy else '异常'}")

# 获取服务器信息
info = client.get_server_info()
print(f"版本: {info.version}")
print(f"环境: {info.environment}")
print(f"缓存大小: {info.cache['size']}/{info.cache['max']}")
print(f"支持功能: {list(info.features.keys())}")
```

### 获取翻译服务列表

```python
services = client.get_translation_services()
print(f"支持的翻译服务 ({len(services)} 个):")

for service in services:
    print(f"  - {service.label} ({service.value})")
    if service.docs:
        print(f"    文档: {service.docs}")
    if service.apiKeyUrl:
        print(f"    API Key: {service.apiKeyUrl}")
```

### 测试翻译服务

```python
# 测试 GTX 免费 API（不需要配置）
success = client.test_translation("gtxFreeAPI")
print(f"GTX API 测试: {'成功' if success else '失败'}")

# 测试 DeepSeek（需要 API Key）
config = TranslationConfig(apiKey="your-api-key")
success = client.test_translation(
    translation_method="deepseek",
    config=config,
)
print(f"DeepSeek 测试: {'成功' if success else '失败'}")

# 测试时使用自定义提示词
success = client.test_translation(
    translation_method="deepseek",
    config=config,
    sys_prompt="你是一位专业翻译家",
    user_prompt="将以下内容翻译成${targetLanguage}：${content}",
)
```

## 使用 With 语句

```python
with TranslationClient(base_url="http://localhost:3001") as client:
    # 执行多个翻译操作
    result1 = client.translate("Hello", "zh")
    result2 = client.translate("World", "zh")
    print(result1.result)
    print(result2.result)
# 自动关闭连接
```

## 错误处理

```python
from translation_client import TranslationClientError

try:
    result = client.translate(
        text="Hello, world!",
        target_language="zh",
        translation_method="deepseek",
        config=TranslationConfig(apiKey="invalid-key"),
    )
except TranslationClientError as e:
    print(f"翻译失败: {e.message}")
    print(f"HTTP 状态码: {e.status_code}")
```

## 配置说明

### TranslationConfig 参数

| 参数 | 类型 | 说明 |
|-----|------|------|
| apiKey | str | API 密钥 |
| region | str | 区域（用于 Azure 等） |
| url | str | 自定义 API 端点 |
| model | str | 模型名称 |
| apiVersion | str | API 版本 |
| temperature | float | 温度参数（0-1） |
| batchSize | int | 批处理大小 |
| contextWindow | int | 上下文窗口大小 |
| sysPrompt | str | 系统提示词 |
| userPrompt | str | 用户提示词 |
| useRelay | bool | 是否使用中转服务 |
| enableThinking | bool | 是否启用思考模式 |
| domains | str | 领域设置（Qwen-MT） |
| useCache | bool | 是否使用缓存 |
| maxConcurrent | int | 最大并发数 |

### TranslationClient 初始化参数

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| base_url | str | "http://localhost:3001" | 服务器地址 |
| timeout | int | 300 | 请求超时（秒） |
| max_retries | int | 3 | 最大重试次数 |

### 代理配置

Python 客户端会自动使用系统环境变量中的代理设置：

```bash
# 设置代理
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
export NO_PROXY=localhost,127.0.0.1

# 运行 Python 客户端
python translation_client.py
```

或在代码中设置：

```python
import os

os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"
os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7890"

client = TranslationClient(base_url="http://localhost:3001")
```

## 翻译方法常量

使用 `TranslationMethod` 枚举来避免字符串拼写错误：

```python
from translation_client import TranslationMethod

client.translate(
    text="Hello",
    target_language="zh",
    translation_method=TranslationMethod.DEEPSEEK.value,  # "deepseek"
)

# 或直接使用字符串
client.translate(
    text="Hello",
    target_language="zh",
    translation_method="deepseek",
)
```

可用方法：
- 机器翻译: `GTX_FREE_API`, `GOOGLE`, `DEEPL`, `AZURE`, `DEEPLX`, `QWEN_MT`
- LLM APIs: `DEEPSEEK`, `OPENAI`, `CLAUDE`, `GEMINI`, `QWEN`, `MOONSHOT`, `ZHIPU`, `DOUBAO`, `GROK`, `MISTRAL`, `PERPLEXITY`
- 聚合服务: `OPENROUTER`, `GROQ`, `SILICONFLOW`, `NVIDIA`, `AZURE_OPENAI`, `CUSTOM_LLM`

## 完整示例

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from translation_client import TranslationClient, TranslationConfig, TranslationMethod

def main():
    # 创建客户端
    client = TranslationClient(base_url="http://localhost:3001")

    # 检查服务器状态
    if not client.health_check():
        print("服务器不可用！")
        return

    print("✓ 服务器可用")

    # 获取支持的服务
    services = client.get_translation_services()
    print(f"✓ 支持 {len(services)} 个翻译服务")

    # 单文本翻译
    print("\n--- 单文本翻译 ---")
    result = client.translate(
        text="The quick brown fox jumps over the lazy dog.",
        target_language="zh",
        source_language="en",
        translation_method=TranslationMethod.GTX_FREE_API.value,
    )
    print(f"原文: The quick brown fox jumps over the lazy dog.")
    print(f"译文: {result.result}")

    # 批量翻译
    print("\n--- 批量翻译 ---")
    texts = [
        "Good morning",
        "Good afternoon",
        "Good evening",
        "Good night",
    ]

    batch = client.batch_translate(
        texts=texts,
        target_language="zh",
        source_language="en",
        translation_method=TranslationMethod.GTX_FREE_API.value,
    )

    if batch.success:
        for orig, trans in zip(texts, batch.results or []):
            print(f"{orig} → {trans}")

    # 关闭客户端
    client.close()

if __name__ == "__main__":
    main()
```

## 运行示例

```bash
# 运行示例代码
python translation_client.py
```