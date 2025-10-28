// VIP会员系统相关接口和类型定义

export interface VIPMembership {
  id: string;
  openid: string;
  memberType: 'free' | 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'expired' | 'trial';
  startDate: string;
  endDate: string;
  trialEndDate?: string; // 免费试用期结束时间
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VIPFeature {
  id: string;
  name: string;
  description: string;
  type: 'five_elements' | 'career' | 'health' | 'psychology';
  isFree: boolean;
  icon: string;
}

export interface VIPOrder {
  id: string;
  openid: string;
  productType: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
  paidAt?: string;
}

// VIP产品配置
export const VIP_PRODUCTS = {
  monthly: {
    id: 'vip_monthly',
    name: '月度VIP会员',
    price: 990, // 9.9元，单位分
    duration: 30, // 天数
    description: '享受30天VIP高级分析功能'
  },
  quarterly: {
    id: 'vip_quarterly',
    name: '季度VIP会员',
    price: 2690, // 26.9元
    duration: 90,
    description: '享受90天VIP高级分析功能'
  },
  yearly: {
    id: 'vip_yearly',
    name: '年度VIP会员',
    price: 8900, // 89元
    duration: 365,
    description: '享受365天VIP高级分析功能'
  }
};

// VIP功能列表 - 合规优化版本
export const VIP_FEATURES: VIPFeature[] = [
  {
    id: 'five_elements_learning',
    name: '传统文化学习',
    description: '五行文化知识学习、传统理论普及、文化体验指导',
    type: 'five_elements',
    isFree: false,
    icon: '📚'
  },
  {
    id: 'career_development',
    name: '职业素养提升',
    description: '职业规划方法、技能提升建议、学习指导、积极发展',
    type: 'career',
    isFree: false,
    icon: '🎯'
  },
  {
    id: 'health_education',
    name: '中医文化学习',
    description: '中医养生文化、健康生活方式、预防保健知识',
    type: 'health',
    isFree: false,
    icon: '🍃'
  },
  {
    id: 'psychology_guidance',
    name: '积极心理健康教育',
    description: '积极心理学知识、情绪管理方法、压力调节技巧',
    type: 'psychology',
    isFree: false,
    icon: '💭'
  }
];

// 免费试用配置
export const TRIAL_CONFIG = {
  enabled: true,
  duration: 3, // 3天
  features: VIP_FEATURES.map(f => f.id) // 试用期间可使用所有VIP功能
};

export class VIPManager {

  // 检查用户VIP状态
  static async checkVIPStatus(openid: string): Promise<VIPMembership | null> {
    try {
      const result = await wx.cloud.callContainer({
        config: {
          env: "prod-8gsdy8r72a4d286b"
        },
        path: "/api/vip",
        header: {
          "X-WX-SERVICE": "express-bqn8"
        },
        method: "POST",
        data: {
          action: "checkStatus",
          openid
        }
      });

      return result.membership || null;
    } catch (error) {
      console.error('检查VIP状态失败:', error);
      return null;
    }
  }

  // 开始免费试用
  static async startTrial(openid: string): Promise<boolean> {
    try {
      const result = await wx.cloud.callContainer({
        config: {
          env: "prod-8gsdy8r72a4d286b"
        },
        path: "/api/vip",
        header: {
          "X-WX-SERVICE": "express-bqn8"
        },
        method: "POST",
        data: {
          action: "startTrial",
          openid,
          duration: TRIAL_CONFIG.duration
        }
      });

      return result.success || false;
    } catch (error) {
      console.error('开始试用失败:', error);
      return false;
    }
  }

  // 检查是否可以使用VIP功能
  static async canUseFeature(featureId: string, openid?: string): Promise<boolean> {
    if (!openid) {
      openid = wx.getStorageSync('openid') || '';
    }

    if (!openid) {
      return false;
    }

    try {
      const vipStatus = await this.checkVIPStatus(openid);

      if (!vipStatus) {
        // 没有VIP记录，检查是否可以开始试用
        return await this.canStartTrial(openid);
      }

      // 检查VIP状态
      const now = new Date();
      const endDate = new Date(vipStatus.endDate);

      // 检查是否在试用期内
      if (vipStatus.status === 'trial' && vipStatus.trialEndDate) {
        const trialEndDate = new Date(vipStatus.trialEndDate);
        return now <= trialEndDate;
      }

      // 检查VIP是否有效
      return vipStatus.status === 'active' && now <= endDate;

    } catch (error) {
      console.error('检查功能权限失败:', error);
      return false;
    }
  }

  // 检查是否可以开始试用
  static async canStartTrial(openid: string): Promise<boolean> {
    try {
      const result = await wx.cloud.callContainer({
        config: {
          env: "prod-8gsdy8r72a4d286b"
        },
        path: "/api/vip",
        header: {
          "X-WX-SERVICE": "express-bqn8"
        },
        method: "POST",
        data: {
          action: "canStartTrial",
          openid
        }
      });

      return result.canStart || false;
    } catch (error) {
      console.error('检查试用资格失败:', error);
      return false;
    }
  }

  // 获取VIP会员信息
  static async getMembershipInfo(openid?: string): Promise<{
    isVIP: boolean;
    isTrial: boolean;
    memberType: string;
    remainingDays: number;
    features: string[];
  }> {
    if (!openid) {
      openid = wx.getStorageSync('openid') || '';
    }

    const defaultInfo = {
      isVIP: false,
      isTrial: false,
      memberType: 'free',
      remainingDays: 0,
      features: []
    };

    if (!openid) {
      return defaultInfo;
    }

    try {
      const vipStatus = await this.checkVIPStatus(openid);

      if (!vipStatus) {
        return defaultInfo;
      }

      const now = new Date();
      let endDate = new Date(vipStatus.endDate);
      let isTrial = vipStatus.status === 'trial';

      // 如果在试用期内，使用试用结束时间
      if (isTrial && vipStatus.trialEndDate) {
        endDate = new Date(vipStatus.trialEndDate);
      }

      const isActive = (vipStatus.status === 'active' || isTrial) && now <= endDate;
      const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        isVIP: isActive,
        isTrial,
        memberType: vipStatus.memberType,
        remainingDays,
        features: isActive ? VIP_FEATURES.map(f => f.id) : []
      };

    } catch (error) {
      console.error('获取会员信息失败:', error);
      return defaultInfo;
    }
  }
}