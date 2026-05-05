import type { AppLocale } from "@/i18n/locale";

type ImageSizeOption = {
  value: string;
  label: string;
};

export type ImagePageMessages = {
  localeTag: string;
  quotaLoading: string;
  unavailableValue: string;
  actions: {
    history: string;
    newConversation: string;
    newShort: string;
    clearHistory: string;
    cancel: string;
    confirmDelete: string;
    switchToEnglish: string;
    switchToChinese: string;
    switchLanguageAriaLabel: string;
  };
  sidebar: {
    loadingHistory: string;
    emptyHistory: string;
    deleteConversation: string;
    turns: (count: number) => string;
    running: (count: number) => string;
    queued: (count: number) => string;
  };
  composer: {
    imageSizeOptions: ImageSizeOption[];
    previewReferenceImage: (label: string) => string;
    referenceImageAlt: (label: string) => string;
    removeReferenceImage: (label: string) => string;
    editPlaceholder: string;
    generatePlaceholder: string;
    addReferenceImage: string;
    continueAddReferenceImage: string;
    uploadShort: string;
    continueShort: string;
    remainingQuota: string;
    activeTasks: (count: number) => string;
    count: string;
    ratio: string;
    generateMode: string;
    editMode: string;
    submitGenerate: string;
    submitEdit: string;
  };
  results: {
    emptyTitle: string;
    emptyDescription: string;
    turn: (index: number) => string;
    editMode: string;
    generateMode: string;
    reuseConfig: string;
    deletePrompt: string;
    deleteResults: string;
    regenerateAll: string;
    retryOne: string;
    referenceImages: string;
    previewReferenceImage: (label: string) => string;
    referenceImageAlt: (label: string) => string;
    addToEdit: string;
    images: (count: number) => string;
    waitingQueue: string;
    result: (index: number) => string;
    generatedResultAlt: (index: number) => string;
    generationFailed: string;
    queuedProcessing: string;
    processing: string;
  };
  status: {
    queued: string;
    generating: string;
    success: string;
    error: string;
  };
  dialogs: {
    clearHistoryTitle: string;
    deleteConversationTitle: string;
    deletePromptTitle: string;
    deleteResultsTitle: string;
    clearHistoryDescription: string;
    deleteConversationDescription: string;
    deletePromptDescription: string;
    deleteResultsDescription: string;
  };
  historyButton: (count: number) => string;
  toasts: {
    readReferenceImageFailed: string;
    readResultImageFailed: string;
    interruptedImagesMarkedFailed: string;
    missingRecoverableTaskId: string;
    someImagesFailed: (count: number) => string;
    readHistoryFailed: string;
    deleteConversationFailed: string;
    historyCleared: string;
    clearHistoryFailed: string;
    referenceImageAdded: string;
    missingEditableReferenceImage: string;
    noImageData: string;
    generationFailed: string;
    enterPrompt: string;
    uploadReferenceFirst: string;
    queuedInConversation: string;
    createdAndStarted: string;
    sentToConversation: string;
  };
  lightbox: {
    title: string;
    download: string;
    close: string;
    previous: string;
    next: string;
  };
};

const IMAGE_PAGE_MESSAGES: Record<AppLocale, ImagePageMessages> = {
  zh: {
    localeTag: "zh-CN",
    quotaLoading: "加载中...",
    unavailableValue: "--",
    actions: {
      history: "历史记录",
      newConversation: "新建对话",
      newShort: "新建",
      clearHistory: "清空历史记录",
      cancel: "取消",
      confirmDelete: "确认删除",
      switchToEnglish: "English",
      switchToChinese: "中文",
      switchLanguageAriaLabel: "切换图片页面语言",
    },
    sidebar: {
      loadingHistory: "正在读取会话记录",
      emptyHistory: "还没有图片记录，输入提示词后会在这里显示。",
      deleteConversation: "删除会话",
      turns: (count) => `${count} 轮`,
      running: (count) => `处理中 ${count}`,
      queued: (count) => `排队 ${count}`,
    },
    composer: {
      imageSizeOptions: [
        { value: "", label: "未指定" },
        { value: "1:1", label: "1:1 (正方形)" },
        { value: "16:9", label: "16:9 (横版)" },
        { value: "4:3", label: "4:3 (横版)" },
        { value: "3:4", label: "3:4 (竖版)" },
        { value: "9:16", label: "9:16 (竖版)" },
      ],
      previewReferenceImage: (label) => `预览参考图 ${label}`,
      referenceImageAlt: (label) => `参考图 ${label}`,
      removeReferenceImage: (label) => `移除参考图 ${label}`,
      editPlaceholder: "描述你希望如何修改这张参考图，可直接粘贴图片",
      generatePlaceholder: "输入你想要生成的画面，也可直接粘贴图片",
      addReferenceImage: "上传参考图",
      continueAddReferenceImage: "继续添加参考图",
      uploadShort: "上传",
      continueShort: "继续",
      remainingQuota: "剩余额度",
      activeTasks: (count) => `${count} 个任务处理中`,
      count: "张数",
      ratio: "比例",
      generateMode: "文生图",
      editMode: "图生图",
      submitGenerate: "生成图片",
      submitEdit: "编辑图片",
    },
    results: {
      emptyTitle: "让想法变成图像",
      emptyDescription: "在同一窗口里保留本地历史与任务状态，并从已有结果图继续发起新的无状态编辑。",
      turn: (index) => `第 ${index} 轮`,
      editMode: "编辑图",
      generateMode: "文生图",
      reuseConfig: "复用配置",
      deletePrompt: "删除提示词记录",
      deleteResults: "删除生成结果",
      regenerateAll: "全部重新生成",
      retryOne: "重新生成这一张",
      referenceImages: "本轮参考图",
      previewReferenceImage: (label) => `预览参考图 ${label}`,
      referenceImageAlt: (label) => `参考图 ${label}`,
      addToEdit: "加入编辑",
      images: (count) => `${count} 张`,
      waitingQueue: "等待当前对话中的前序任务完成",
      result: (index) => `结果 ${index}`,
      generatedResultAlt: (index) => `生成结果 ${index}`,
      generationFailed: "生成失败",
      queuedProcessing: "已加入当前对话队列...",
      processing: "正在处理图片...",
    },
    status: {
      queued: "排队中",
      generating: "处理中",
      success: "已完成",
      error: "失败",
    },
    dialogs: {
      clearHistoryTitle: "清空历史记录",
      deleteConversationTitle: "删除对话",
      deletePromptTitle: "删除提示词记录",
      deleteResultsTitle: "删除生成结果",
      clearHistoryDescription: "确认删除全部图片历史记录吗？删除后无法恢复。",
      deleteConversationDescription: "确认删除这条图片对话吗？删除后无法恢复。",
      deletePromptDescription: "确认删除这条提示词记录吗？对应生成结果会保留。",
      deleteResultsDescription: "确认删除这条生成结果吗？对应提示词记录会保留。",
    },
    historyButton: (count) => `历史记录 (${count})`,
    toasts: {
      readReferenceImageFailed: "读取参考图失败",
      readResultImageFailed: "读取结果图失败",
      interruptedImagesMarkedFailed: "页面刷新或任务中断，未完成的图片已标记为失败",
      missingRecoverableTaskId: "页面刷新或任务中断，未找到可恢复的任务 ID",
      someImagesFailed: (count) => `其中 ${count} 张未成功生成`,
      readHistoryFailed: "读取会话记录失败",
      deleteConversationFailed: "删除会话失败",
      historyCleared: "已清空历史记录",
      clearHistoryFailed: "清空历史记录失败",
      referenceImageAdded: "已加入当前参考图，继续输入描述即可编辑",
      missingEditableReferenceImage: "未找到可用于继续编辑的参考图",
      noImageData: "未返回图片数据",
      generationFailed: "生成图片失败",
      enterPrompt: "请输入提示词",
      uploadReferenceFirst: "请先上传参考图",
      queuedInConversation: "已加入当前对话队列",
      createdAndStarted: "已创建新对话并开始处理",
      sentToConversation: "已发送到当前对话",
    },
    lightbox: {
      title: "图片预览",
      download: "下载图片",
      close: "关闭",
      previous: "上一张",
      next: "下一张",
    },
  },
  en: {
    localeTag: "en-US",
    quotaLoading: "Loading...",
    unavailableValue: "--",
    actions: {
      history: "History",
      newConversation: "New conversation",
      newShort: "New",
      clearHistory: "Clear history",
      cancel: "Cancel",
      confirmDelete: "Delete",
      switchToEnglish: "English",
      switchToChinese: "中文",
      switchLanguageAriaLabel: "Switch image page language",
    },
    sidebar: {
      loadingHistory: "Loading conversation history",
      emptyHistory: "No image history yet. Your prompts will show up here after you generate something.",
      deleteConversation: "Delete conversation",
      turns: (count) => `${count} turn${count === 1 ? "" : "s"}`,
      running: (count) => `Running ${count}`,
      queued: (count) => `Queued ${count}`,
    },
    composer: {
      imageSizeOptions: [
        { value: "", label: "Auto" },
        { value: "1:1", label: "1:1 (Square)" },
        { value: "16:9", label: "16:9 (Landscape)" },
        { value: "4:3", label: "4:3 (Landscape)" },
        { value: "3:4", label: "3:4 (Portrait)" },
        { value: "9:16", label: "9:16 (Portrait)" },
      ],
      previewReferenceImage: (label) => `Preview reference image ${label}`,
      referenceImageAlt: (label) => `Reference image ${label}`,
      removeReferenceImage: (label) => `Remove reference image ${label}`,
      editPlaceholder: "Describe how you want to edit this reference image. You can also paste an image.",
      generatePlaceholder: "Describe the image you want to create. You can also paste an image.",
      addReferenceImage: "Upload reference",
      continueAddReferenceImage: "Add more references",
      uploadShort: "Upload",
      continueShort: "Add more",
      remainingQuota: "Quota left",
      activeTasks: (count) => `${count} task${count === 1 ? "" : "s"} running`,
      count: "Count",
      ratio: "Aspect",
      generateMode: "Text to image",
      editMode: "Image to image",
      submitGenerate: "Generate image",
      submitEdit: "Edit image",
    },
    results: {
      emptyTitle: "Turn ideas into images",
      emptyDescription: "Keep local history and task status in one place, then continue stateless edits from any image you already generated.",
      turn: (index) => `Turn ${index}`,
      editMode: "Image edit",
      generateMode: "Text to image",
      reuseConfig: "Reuse config",
      deletePrompt: "Delete prompt record",
      deleteResults: "Delete generated results",
      regenerateAll: "Regenerate all",
      retryOne: "Retry this image",
      referenceImages: "Reference images",
      previewReferenceImage: (label) => `Preview reference image ${label}`,
      referenceImageAlt: (label) => `Reference image ${label}`,
      addToEdit: "Use for edit",
      images: (count) => `${count} image${count === 1 ? "" : "s"}`,
      waitingQueue: "Waiting for earlier tasks in this conversation to finish",
      result: (index) => `Result ${index}`,
      generatedResultAlt: (index) => `Generated result ${index}`,
      generationFailed: "Generation failed",
      queuedProcessing: "Added to this conversation queue...",
      processing: "Processing image...",
    },
    status: {
      queued: "Queued",
      generating: "Processing",
      success: "Done",
      error: "Failed",
    },
    dialogs: {
      clearHistoryTitle: "Clear history",
      deleteConversationTitle: "Delete conversation",
      deletePromptTitle: "Delete prompt record",
      deleteResultsTitle: "Delete generated results",
      clearHistoryDescription: "Delete all image history? This cannot be undone.",
      deleteConversationDescription: "Delete this image conversation? This cannot be undone.",
      deletePromptDescription: "Delete this prompt record? The generated results will be kept.",
      deleteResultsDescription: "Delete these generated results? The prompt record will be kept.",
    },
    historyButton: (count) => `History (${count})`,
    toasts: {
      readReferenceImageFailed: "Failed to read the reference image",
      readResultImageFailed: "Failed to read the generated image",
      interruptedImagesMarkedFailed: "The page refreshed or the task was interrupted, so unfinished images were marked as failed",
      missingRecoverableTaskId: "The page refreshed or the task was interrupted, and no recoverable task ID was found",
      someImagesFailed: (count) => `${count} image${count === 1 ? "" : "s"} failed to generate`,
      readHistoryFailed: "Failed to read conversation history",
      deleteConversationFailed: "Failed to delete the conversation",
      historyCleared: "History cleared",
      clearHistoryFailed: "Failed to clear history",
      referenceImageAdded: "Added to the current reference set. Keep typing to continue editing.",
      missingEditableReferenceImage: "No reference image is available for continued editing",
      noImageData: "No image data was returned",
      generationFailed: "Failed to generate the image",
      enterPrompt: "Enter a prompt first",
      uploadReferenceFirst: "Upload a reference image first",
      queuedInConversation: "Added to the current conversation queue",
      createdAndStarted: "Started a new conversation",
      sentToConversation: "Sent to the current conversation",
    },
    lightbox: {
      title: "Image preview",
      download: "Download image",
      close: "Close",
      previous: "Previous image",
      next: "Next image",
    },
  },
};

export function getImagePageMessages(locale: AppLocale) {
  return IMAGE_PAGE_MESSAGES[locale];
}
