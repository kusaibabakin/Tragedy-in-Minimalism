const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('tragedyEditor', {
  saveStory: async (story) => {
    return ipcRenderer.invoke('story:save', story);
  },
  importSceneVideo: async ({ sceneId, sourcePath }) => {
    return ipcRenderer.invoke('scene-video:import', { sceneId, sourcePath });
  },
  listAvailableVideos: async () => {
    return ipcRenderer.invoke('videos:list');
  },
  getPathForDroppedFile: (file) => {
    if (!file) return '';
    try {
      return webUtils.getPathForFile(file) || '';
    } catch (_err) {
      return '';
    }
  }
});
