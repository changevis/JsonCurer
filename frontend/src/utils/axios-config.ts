import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

const baseURL = '/backend';

interface RequestItem {
  config: AxiosRequestConfig,
  controller: AbortController,
}

const instance = axios.create({
  baseURL,
  method: 'POST',
  headers: {
    'Content-Type':
      'multipart/form-data;charset=utf-8;boundary=OCqxMF6-JxtxoMDHmoG5W5eY9MGRsTBp',
    // 'Access-Control-Allow-Origin': '*',
  },
});

const pendingRequests: Array<RequestItem> = []; // 储存当前全部的请求

instance.interceptors.request.use((config) => {
  // 如果相同的请求地址已经存在于request列表中，说明上一次的需要cancel
  const index = pendingRequests.findIndex((request) => request.config.url === config.url);
  if (index !== -1) {
    pendingRequests[index].controller.abort();
  }

  // 新出现的添加
  const controller = new AbortController();
  // eslint-disable-next-line no-param-reassign
  config.signal = controller.signal;
  pendingRequests.push({ controller, config });
  return config;
}, (error: any) => Promise.reject(error));

instance.interceptors.response.use((response) => { // 无论请求成功或失败，pending状态都已结束，维护pending列表
  const index = pendingRequests.findIndex((request) => request.config === response.config);
  if (index !== -1) {
    pendingRequests.splice(index, 1);
  }
  return response;
}, (error) => {
  const index = pendingRequests.findIndex((request) => request.config === error.config);
  if (index !== -1) {
    pendingRequests.splice(index, 1);
  }
  return Promise.reject();
});

export default instance;
