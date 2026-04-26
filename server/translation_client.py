#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Subtitle Translation Server Python Client

使用示例:
    from translation_client import TranslationClient

    client = TranslationClient(base_url="http://localhost:3001")

    # 单文本翻译
    result = client.translate(
        text="Hello, world!",
        target_language="zh",
        source_language="en",
        translation_method="deepseek",
        config={"apiKey": "your-api-key"}
    )

    # 批量翻译
    results = client.batch_translate(
        texts=["Hello", "World", "How are you?"],
        target_language="zh",
        source_language="en",
        translation_method="deepseek",
        config={"apiKey": "your-api-key"}
    )

    # 上传字幕文件
    with open("subtitle.srt", "rb") as f:
        file_info = client.upload_subtitle(f)
"""

from typing import Any, Dict, List, Optional, Union, BinaryIO
from dataclasses import dataclass, field
from enum import Enum
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class TranslationMethod(str, Enum):
    """翻译服务枚举"""

    # 机器翻译
    GTX_FREE_API = "gtxFreeAPI"
    GOOGLE = "google"
    DEEPL = "deepl"
    AZURE = "azure"
    DEEPLX = "deeplx"
    QWEN_MT = "qwenMt"

    # LLM APIs
    DEEPSEEK = "deepseek"
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"
    QWEN = "qwen"
    MOONSHOT = "moonshot"
    ZHIPU = "zhipu"
    DOUBAO = "doubao"
    GROK = "grok"
    MISTRAL = "mistral"
    PERPLEXITY = "perplexity"

    # 聚合服务 & 自托管
    OPENROUTER = "openrouter"
    GROQ = "groq"
    SILICONFLOW = "siliconflow"
    NVIDIA = "nvidia"
    AZURE_OPENAI = "azureopenai"
    CUSTOM_LLM = "llm"


class SubtitleFormat(str, Enum):
    """字幕格式枚举"""

    SRT = "srt"
    VTT = "vtt"
    ASS = "ass"
    LRC = "lrc"


class JobStatus(str, Enum):
    """任务状态枚举"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TranslationConfig:
    """翻译配置"""

    apiKey: Optional[str] = None
    region: Optional[str] = None
    url: Optional[str] = None
    model: Optional[str] = None
    apiVersion: Optional[str] = None
    temperature: Optional[float] = None
    batchSize: Optional[int] = None
    contextWindow: Optional[int] = None
    sysPrompt: Optional[str] = None
    userPrompt: Optional[str] = None
    useRelay: Optional[bool] = None
    enableThinking: Optional[bool] = None
    domains: Optional[str] = None
    useCache: Optional[bool] = None
    maxConcurrent: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典，过滤掉 None 值"""
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class TranslationService:
    """翻译服务信息"""

    value: str
    label: str
    docs: Optional[str] = None
    apiKeyUrl: Optional[str] = None


@dataclass
class TranslateResponse:
    """翻译响应"""

    success: bool
    result: Optional[Union[str, List[str]]] = None
    error: Optional[str] = None
    progress: Optional[int] = None
    jobId: Optional[str] = None


@dataclass
class BatchTranslateResponse:
    """批量翻译响应"""

    success: bool
    results: Optional[List[str]] = None
    errors: Optional[List[Dict[str, Any]]] = None
    jobId: Optional[str] = None


@dataclass
class BatchTranslateError:
    """批量翻译错误"""

    index: int
    error: str


@dataclass
class JobInfo:
    """任务信息"""

    jobId: str
    status: JobStatus
    progress: int
    result: Optional[List[str]] = None
    error: Optional[str] = None
    createdAt: Optional[int] = None
    completedAt: Optional[int] = None


@dataclass
class UploadFileResponse:
    """文件上传响应"""

    success: bool
    fileType: Optional[str] = None
    contentLines: Optional[List[str]] = None
    totalLines: Optional[int] = None
    error: Optional[str] = None


@dataclass
class ServerInfo:
    """服务器信息"""

    status: str
    version: str
    environment: str
    cache: Dict[str, int]
    features: Dict[str, Any]


class TranslationClientError(Exception):
    """翻译客户端异常"""

    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class TranslationClient:
    """字幕翻译服务客户端"""

    def __init__(
        self,
        base_url: str = "http://localhost:3001",
        timeout: int = 300,
        max_retries: int = 3,
    ):
        """
        初始化客户端

        Args:
            base_url: 服务器基础 URL
            timeout: 请求超时时间（秒）
            max_retries: 最大重试次数
        """
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # 配置重试策略
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "DELETE"],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session = requests.Session()
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, BinaryIO]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        发送 HTTP 请求

        Args:
            method: HTTP 方法
            endpoint: API 端点
            data: 请求数据
            files: 文件数据
            params: 查询参数

        Returns:
            响应数据

        Raises:
            TranslationClientError: 请求失败时抛出
        """
        url = f"{self.base_url}{endpoint}"
        headers = {}

        if files:
            headers.pop("Content-Type", None)

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                files=files,
                params=params,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response.content else {}
            raise TranslationClientError(
                error_data.get("error", str(e)),
                status_code=e.response.status_code,
            ) from e
        except requests.exceptions.RequestException as e:
            raise TranslationClientError(str(e)) from e

    def health_check(self) -> bool:
        """
        健康检查

        Returns:
            服务器是否正常
        """
        try:
            response = self._request("GET", "/api/health")
            return response.get("status") == "ok"
        except TranslationClientError:
            return False

    def get_server_info(self) -> ServerInfo:
        """
        获取服务器信息

        Returns:
            服务器信息
        """
        response = self._request("GET", "/api/health/info")
        return ServerInfo(**response)

    def get_translation_services(self) -> List[TranslationService]:
        """
        获取支持的翻译服务

        Returns:
            翻译服务列表
        """
        response = self._request("GET", "/api/translate/services")
        return [TranslationService(**service) for service in response.get("services", [])]

    def get_service_config(self, method: str) -> Dict[str, Any]:
        """
        获取翻译服务的默认配置

        Args:
            method: 翻译方法

        Returns:
            服务配置
        """
        return self._request("GET", f"/api/translate/services/{method}/config")

    def test_translation(
        self,
        translation_method: str,
        config: Optional[TranslationConfig] = None,
        sys_prompt: Optional[str] = None,
        user_prompt: Optional[str] = None,
    ) -> bool:
        """
        测试翻译服务

        Args:
            translation_method: 翻译方法
            config: 翻译配置
            sys_prompt: 系统提示词
            user_prompt: 用户提示词

        Returns:
            测试是否成功
        """
        data: Dict[str, Any] = {
            "translationMethod": translation_method,
        }

        if config:
            data["config"] = config.to_dict()

        if sys_prompt:
            data["sysPrompt"] = sys_prompt

        if user_prompt:
            data["userPrompt"] = user_prompt

        response = self._request("POST", "/api/translate/test", data=data)
        return response.get("success", False)

    def translate(
        self,
        text: Union[str, List[str]],
        target_language: str,
        source_language: str = "auto",
        translation_method: str = "gtxFreeAPI",
        config: Optional[TranslationConfig] = None,
        use_cache: bool = True,
    ) -> TranslateResponse:
        """
        翻译文本

        Args:
            text: 要翻译的文本（字符串或列表）
            target_language: 目标语言
            source_language: 源语言（默认 auto 自动检测）
            translation_method: 翻译方法（默认 GTX 免费API）
            config: 翻译配置
            use_cache: 是否使用缓存

        Returns:
            翻译响应
        """
        data: Dict[str, Any] = {
            "text": text,
            "targetLanguage": target_language,
            "sourceLanguage": source_language,
            "translationMethod": translation_method,
            "useCache": use_cache,
        }

        if config:
            data["config"] = config.to_dict()

        response = self._request("POST", "/api/translate", data=data)
        return TranslateResponse(**response)

    def batch_translate(
        self,
        texts: List[str],
        target_language: str,
        source_language: str = "auto",
        translation_method: str = "gtxFreeAPI",
        config: Optional[TranslationConfig] = None,
        use_cache: bool = True,
        enable_progress: bool = False,
    ) -> BatchTranslateResponse:
        """
        批量翻译文本

        Args:
            texts: 要翻译的文本列表
            target_language: 目标语言
            source_language: 源语言（默认 auto 自动检测）
            translation_method: 翻译方法（默认 GTX 免费API）
            config: 翻译配置
            use_cache: 是否使用缓存
            enable_progress: 是否启用进度跟踪（异步）

        Returns:
            批量翻译响应
        """
        data: Dict[str, Any] = {
            "texts": texts,
            "targetLanguage": target_language,
            "sourceLanguage": source_language,
            "translationMethod": translation_method,
            "useCache": use_cache,
            "enableProgress": enable_progress,
        }

        if config:
            data["config"] = config.to_dict()

        response = self._request("POST", "/api/batch-translate", data=data)
        return BatchTranslateResponse(**response)

    def get_job_status(self, job_id: str) -> JobInfo:
        """
        获取任务状态

        Args:
            job_id: 任务 ID

        Returns:
            任务信息
        """
        response = self._request("GET", f"/api/batch-translate/jobs/{job_id}")
        return JobInfo(**response)

    def wait_for_job(
        self,
        job_id: str,
        poll_interval: float = 1.0,
        timeout: Optional[float] = None,
    ) -> JobInfo:
        """
        等待任务完成

        Args:
            job_id: 任务 ID
            poll_interval: 轮询间隔（秒）
            timeout: 超时时间（秒）

        Returns:
            任务信息

        Raises:
            TranslationClientError: 超时或任务失败时抛出
        """
        import time

        start_time = time.time()

        while True:
            if timeout and time.time() - start_time > timeout:
                raise TranslationClientError(f"Job timeout after {timeout} seconds")

            job = self.get_job_status(job_id)

            if job.status == JobStatus.COMPLETED:
                return job
            elif job.status == JobStatus.FAILED:
                raise TranslationClientError(f"Job failed: {job.error}")

            time.sleep(poll_interval)

    def translate_async(
        self,
        texts: List[str],
        target_language: str,
        source_language: str = "auto",
        translation_method: str = "gtxFreeAPI",
        config: Optional[TranslationConfig] = None,
        use_cache: bool = True,
        poll_interval: float = 1.0,
        timeout: Optional[float] = None,
    ) -> JobInfo:
        """
        异步批量翻译（带进度跟踪）

        Args:
            texts: 要翻译的文本列表
            target_language: 目标语言
            source_language: 源语言
            translation_method: 翻译方法
            config: 翻译配置
            use_cache: 是否使用缓存
            poll_interval: 轮询间隔
            timeout: 超时时间

        Returns:
            任务信息
        """
        response = self.batch_translate(
            texts=texts,
            target_language=target_language,
            source_language=source_language,
            translation_method=translation_method,
            config=config,
            use_cache=use_cache,
            enable_progress=True,
        )

        if not response.jobId:
            raise TranslationClientError("Failed to create translation job")

        return self.wait_for_job(response.jobId, poll_interval, timeout)

    def upload_subtitle(
        self,
        file: BinaryIO,
        file_type: Optional[SubtitleFormat] = None,
        filename: str = "subtitle",
    ) -> UploadFileResponse:
        """
        上传字幕文件

        Args:
            file: 文件对象
            file_type: 字幕格式（不指定则自动检测）
            filename: 文件名

        Returns:
            上传响应
        """
        files = {"file": (filename, file)}

        data: Dict[str, Any] = {}
        if file_type:
            data["fileType"] = file_type.value

        response = self._request("POST", "/api/upload", data=data, files=files)
        return UploadFileResponse(**response)

    def generate_bilingual_subtitle(
        self,
        original_lines: List[str],
        translated_lines: List[str],
        file_type: str = "srt",
        bilingual_subtitle: bool = True,
    ) -> bytes:
        """
        生成双语字幕

        Args:
            original_lines: 原始字幕行
            translated_lines: 翻译后的字幕行
            file_type: 字幕格式
            bilingual_subtitle: 是否生成双语字幕

        Returns:
            字幕文件内容（字节）
        """
        data = {
            "originalLines": original_lines,
            "translatedLines": translated_lines,
            "fileType": file_type,
            "bilingualSubtitle": bilingual_subtitle,
        }

        response = requests.post(
            f"{self.base_url}/api/upload/bilingual",
            json=data,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.content

    def get_all_jobs(self) -> List[JobInfo]:
        """
        获取所有任务

        Returns:
            任务列表
        """
        response = self._request("GET", "/api/jobs")
        return [JobInfo(**job) for job in response.get("jobs", [])]

    def delete_job(self, job_id: str) -> bool:
        """
        删除任务

        Args:
            job_id: 任务 ID

        Returns:
            是否删除成功
        """
        response = self._request("DELETE", f"/api/jobs/{job_id}")
        return response.get("success", False)

    def close(self):
        """关闭客户端会话"""
        self.session.close()

    def __enter__(self):
        """支持 with 语句"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """退出 with 语句时关闭会话"""
        self.close()


def main():
    """示例用法"""
    from pathlib import Path

    # 创建客户端
    with TranslationClient(base_url="http://localhost:3001") as client:
        # 健康检查
        if not client.health_check():
            print("服务器不可用")
            return

        print("服务器可用")

        # 获取服务器信息
        info = client.get_server_info()
        print(f"服务器版本: {info.version}")
        print(f"缓存状态: {info.cache}")

        # 获取支持的翻译服务
        services = client.get_translation_services()
        print(f"\n支持的翻译服务 ({len(services)} 个):")
        for service in services[:5]:  # 只显示前5个
            print(f"  - {service.label} ({service.value})")

        # 单文本翻译（使用免费的 GTX API）
        print("\n=== 单文本翻译 ===")
        result = client.translate(
            text="Hello, world!",
            target_language="zh",
            source_language="en",
            translation_method=TranslationMethod.GTX_FREE_API.value,
        )
        print(f"原文: Hello, world!")
        print(f"译文: {result.result}")

        # 批量翻译
        print("\n=== 批量翻译 ===")
        texts = ["Hello", "World", "How are you?", "Good morning", "Good night"]
        batch_result = client.batch_translate(
            texts=texts,
            target_language="zh",
            source_language="en",
            translation_method=TranslationMethod.GTX_FREE_API.value,
        )

        if batch_result.success:
            for i, (orig, trans) in enumerate(zip(texts, batch_result.results or [])):
                print(f"{i+1}. {orig} → {trans}")

        # 异步批量翻译（示例）
        print("\n=== 异步批量翻译 ===")
        try:
            job = client.translate_async(
                texts=["Hello", "World"],
                target_language="zh",
                source_language="en",
                translation_method=TranslationMethod.GTX_FREE_API.value,
                poll_interval=0.5,
                timeout=30,
            )
            print(f"任务 {job.jobId} 完成")
            print(f"进度: {job.progress}%")
            print(f"结果: {job.result}")
        except TranslationClientError as e:
            print(f"异步翻译失败: {e}")

        # 上传字幕文件
        print("\n=== 上传字幕文件 ===")
        # 创建示例 SRT 文件
        example_srt = """1
00:00:00,000 --> 00:00:02,000
Hello, world!

2
00:00:02,000 --> 00:00:04,000
This is a subtitle.

3
00:00:04,000 --> 00:00:06,000
Have a nice day!
"""

        from io import BytesIO

        file_obj = BytesIO(example_srt.encode("utf-8"))
        upload_result = client.upload_subtitle(file_obj, filename="example.srt")

        if upload_result.success:
            print(f"文件类型: {upload_result.fileType}")
            print(f"总行数: {upload_result.totalLines}")
            print(f"内容行数: {len(upload_result.contentLines or [])}")


if __name__ == "__main__":
    main()
