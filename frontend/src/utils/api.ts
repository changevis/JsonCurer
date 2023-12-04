import axios from './axios-config';

export const uploadJSONFile = (options?: any) => axios.request({
  ...options,
  url: '/uploadFile',
});

export const simChange = (options?: any) => axios.request({
  ...options,
  url: '/updateSchema',
});

export const getCaseData = (options?: any) => axios.request({
  ...options,
  url: '/showcase',
});

export const preview = (options?: any) => axios.request({
  ...options,
  url: '/transformationPreview',
});

export const showDecoration = (options?: any) => axios.request({
  ...options,
  url: '/showDecorations',
});
