import { VIPManager, VIP_PRODUCTS, VIP_FEATURES, TRIAL_CONFIG } from '../../utils/vip';
import { createVIPOrder, getVIPOrders } from '../../utils/api';
import { AuthManager } from '../../utils/auth';

interface VIPPageData {
  membershipInfo: {
    isVIP: boolean;
    isTrial: boolean;
    memberType: string;
    remainingDays: number;
    features: string[];
  };
  canStartTrial: boolean;
  showPaymentModal: boolean;
  selectedProduct: any;
  orders: any[];
  loading: boolean;
  VIP_FEATURES: any[];
  VIP_PRODUCTS: any;
}

Page({
  data: {
    membershipInfo: {
      isVIP: false,
      isTrial: false,
      memberType: 'free',
      remainingDays: 0,
      features: []
    },
    canStartTrial: false,
    showPaymentModal: false,
    selectedProduct: null,
    orders: [],
    loading: false,
    VIP_FEATURES: VIP_FEATURES,
    VIP_PRODUCTS: VIP_PRODUCTS
  } as VIPPageData,

  onLoad() {
    this.loadVIPStatus();
  },

  onShow() {
    this.loadVIPStatus();
  },

  onPullDownRefresh() {
    this.loadVIPStatus();
  },

  async loadVIPStatus() {
    this.setData({ loading: true });

    try {
      // 检查登录状态
      if (!AuthManager.isLoggedIn()) {
        wx.showModal({
          title: '请先登录',
          content: '使用VIP功能需要先登录账号',
          confirmText: '去登录',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: '/pages/profile/profile'
              });
            }
          }
        });

        this.setData({ loading: false });
        wx.stopPullDownRefresh();
        return;
      }

      const openid = AuthManager.getOpenid();
      if (!openid) {
        await this.getOpenid();
      }

      const membershipInfo = await VIPManager.getMembershipInfo();
      const canStartTrial = await VIPManager.canStartTrial(openid);

      this.setData({
        membershipInfo,
        canStartTrial,
        loading: false
      });

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('加载VIP状态失败:', error);
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  async getOpenid() {
    try {
      const result = await wx.cloud.callContainer({
        config: {
          env: "prod-8gsdy8r72a4d286b"
        },
        path: "/api/auth",
        header: {
          "X-WX-SERVICE": "express-bqn8"
        },
        method: "POST",
        data: {
          action: "getOpenid"
        }
      });

      if (result.openid) {
        wx.setStorageSync('openid', result.openid);
      }
    } catch (error) {
      console.error('获取openid失败:', error);
    }
  },

  // 开始免费试用
  async startTrial() {
    if (!this.data.canStartTrial) {
      wx.showToast({
        title: '暂无试用资格',
        icon: 'none'
      });
      return;
    }

    try {
      const openid = wx.getStorageSync('openid') || '';
      const success = await VIPManager.startTrial(openid);

      if (success) {
        wx.showToast({
          title: '试用已开启',
          icon: 'success'
        });
        this.loadVIPStatus();
      } else {
        wx.showToast({
          title: '开启试用失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('开启试用失败:', error);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    }
  },

  // 选择VIP产品
  selectProduct(event: any) {
    const productType = event.currentTarget.dataset.type;
    const product = VIP_PRODUCTS[productType as keyof typeof VIP_PRODUCTS];

    this.setData({
      selectedProduct: product,
      showPaymentModal: true
    });
  },

  // 关闭支付弹窗
  closePaymentModal() {
    this.setData({
      showPaymentModal: false,
      selectedProduct: null
    });
  },

  // 确认支付
  async confirmPayment() {
    if (!this.data.selectedProduct) return;

    try {
      const openid = wx.getStorageSync('openid') || '';

      // 创建订单
      const orderResult = await createVIPOrder(
        openid,
        this.data.selectedProduct.id.replace('vip_', '') as 'monthly' | 'quarterly' | 'yearly'
      );

      if (orderResult.orderId) {
        // 调起微信支付
        const paymentResult = await this.requestPayment(orderResult.paymentParams);

        if (paymentResult) {
          wx.showToast({
            title: '支付成功',
            icon: 'success'
          });
          this.closePaymentModal();
          this.loadVIPStatus();
        }
      } else {
        wx.showToast({
          title: '创建订单失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('支付失败:', error);
      wx.showToast({
        title: '支付失败，请重试',
        icon: 'none'
      });
    }
  },

  // 发起微信支付
  requestPayment(paymentParams: any): Promise<boolean> {
    return new Promise((resolve) => {
      wx.requestPayment({
        ...paymentParams,
        success: () => {
          resolve(true);
        },
        fail: (error) => {
          console.error('支付失败:', error);
          resolve(false);
        }
      });
    });
  },

  // 查看功能详情
  showFeatureDetail(event: any) {
    const featureId = event.currentTarget.dataset.id;
    const feature = VIP_FEATURES.find(f => f.id === featureId);

    if (feature) {
      wx.showModal({
        title: feature.name,
        content: feature.description,
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 查看订单记录
  async viewOrders() {
    try {
      const openid = wx.getStorageSync('openid') || '';
      const result = await getVIPOrders(openid);

      if (result.orders && result.orders.length > 0) {
        this.setData({ orders: result.orders });
        this.showOrderList();
      } else {
        wx.showToast({
          title: '暂无订单记录',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取订单失败:', error);
      wx.showToast({
        title: '获取订单失败',
        icon: 'none'
      });
    }
  },

  showOrderList() {
    const orderList = this.data.orders.map((order: any) =>
      `${this.formatDate(order.createdAt)} - ${VIP_PRODUCTS[order.productType as keyof typeof VIP_PRODUCTS]?.name || order.productType} - ${this.getOrderStatusText(order.status)}`
    ).join('\n');

    wx.showModal({
      title: '订单记录',
      content: orderList || '暂无订单',
      showCancel: false,
      confirmText: '确定'
    });
  },

  formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('zh-CN');
  },

  getOrderStatusText(status: string) {
    const statusMap: { [key: string]: string } = {
      'pending': '待支付',
      'paid': '已支付',
      'cancelled': '已取消',
      'refunded': '已退款'
    };
    return statusMap[status] || status;
  },

  formatPrice(priceInCents: number) {
    return (priceInCents / 100).toFixed(1);
  },

  onShareAppMessage() {
    return {
      title: 'FateSeek VIP会员 - 获得深度命理分析',
      path: '/pages/vip/vip'
    };
  }
});