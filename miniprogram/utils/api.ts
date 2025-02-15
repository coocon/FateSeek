import { request } from './request';

const BASE_URL = 'https://api.your-domain.com';

interface CalculationParams {
  birthday: string;
  orderId: string;
}

interface LocationInfo {
  province: string;
  city: string;
  district: string;
}

interface FortuneParams {
  birthday: string;
  location: LocationInfo;
}

export const createOrder = (birthday: string) => {
  return request({
    url: `${BASE_URL}/orders`,
    method: 'POST',
    data: { birthday }
  });
};

export const getCalculationResult = (orderId: string) => {
  return request({
    url: `${BASE_URL}/calculations/${orderId}`,
    method: 'GET'
  });
};

// 硅基流动API调用
export const callSiliconAPI = (params: FortuneParams) => {
  return request({
    url: 'https://api.siliconflow.com/v1/fortune',
    method: 'POST',
    data: params
  });
};