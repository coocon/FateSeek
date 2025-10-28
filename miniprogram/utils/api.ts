import { request } from './request';

const BASE_URL = 'https://api.your-domain.com';
const CLOUD_BASE_URL = 'https://express-bqn8-195847-5-1342530313.sh.run.tcloudbase.com';

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

// 历史记录接口类型
interface HistoryRecord {
  id: string;
  openid: string;
  name: string;
  birthday: string;
  gender: string;
  location: LocationInfo;
  baziData: any;
  aiResult: string;
  createdAt: string;
  type: 'calculation';
}

// 收藏记录接口类型
interface FavoriteRecord {
  id: string;
  openid: string;
  historyId?: string;
  title: string;
  content: string;
  type: 'full_result' | 'paragraph';
  sourceHistoryId?: string;
  createdAt: string;
}

export const createOrder = (birthday: string) => {
  return request({
    url: `${BASE_URL}/orders`,
    method: 'POST',
    data: { birthday }
  });
};

// 云开发API - 历史记录管理
export const saveHistoryRecord = (record: Omit<HistoryRecord, 'id' | 'openid' | 'createdAt'>) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/history",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "save",
      ...record
    }
  });
};

export const getHistoryRecords = (openid: string, page: number = 1, limit: number = 10) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/history",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "list",
      openid,
      page,
      limit
    }
  });
};

export const deleteHistoryRecord = (openid: string, recordId: string) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/history",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "delete",
      openid,
      recordId
    }
  });
};

// 云开发API - 收藏管理
export const saveFavoriteRecord = (record: Omit<FavoriteRecord, 'id' | 'openid' | 'createdAt'>) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/favorite",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "save",
      ...record
    }
  });
};

export const getFavoriteRecords = (openid: string, page: number = 1, limit: number = 10) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/favorite",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "list",
      openid,
      page,
      limit
    }
  });
};

export const deleteFavoriteRecord = (openid: string, recordId: string) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/favorite",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "delete",
      openid,
      recordId
    }
  });
};

// VIP相关API
export const createVIPOrder = (openid: string, productType: 'monthly' | 'quarterly' | 'yearly') => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/vip",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "createOrder",
      openid,
      productType
    }
  });
};

export const getVIPOrders = (openid: string, page: number = 1, limit: number = 10) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/vip",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "getOrders",
      openid,
      page,
      limit
    }
  });
};

export const updateVIPMembership = (openid: string, orderData: any) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/vip",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      action: "updateMembership",
      openid,
      orderData
    }
  });
};

// VIP分析内容API
export const getVIPAnalysis = (openid: string, featureType: string, analysisData: any) => {
  return wx.cloud.callContainer({
    config: {
      env: "prod-8gsdy8r72a4d286b"
    },
    path: "/api/vip-analysis",
    header: {
      "X-WX-SERVICE": "express-bqn8"
    },
    method: "POST",
    data: {
      openid,
      featureType,
      analysisData
    }
  });
};