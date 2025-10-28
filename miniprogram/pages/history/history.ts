import { getHistoryRecords, deleteHistoryRecord } from '../../utils/api';
import { AuthManager } from '../../utils/auth';

interface HistoryRecord {
  id: string;
  name: string;
  birthday: string;
  gender: string;
  location: {
    province: string;
    city: string;
    district: string;
  };
  baziData: any;
  aiResult: string;
  createdAt: string;
  type: 'calculation';
}

interface HistoryPageData {
  records: HistoryRecord[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  showDeleteConfirm: boolean;
  deleteTargetId: string;
}

Page({
  data: {
    records: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    totalCount: 0,
    showDeleteConfirm: false,
    deleteTargetId: ''
  } as HistoryPageData,

  onLoad() {
    this.loadHistoryRecords();
  },

  onShow() {
    // 从其他页面返回时刷新数据
    this.refreshData();
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreRecords();
    }
  },

  async loadHistoryRecords() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 检查登录状态
      if (!AuthManager.isLoggedIn()) {
        wx.showModal({
          title: '请先登录',
          content: '查看历史记录需要先登录账号',
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
        return;
      }

      const openid = AuthManager.getOpenid();
      if (!openid) {
        await this.getOpenid();
      }

      const result = await getHistoryRecords(openid, this.data.page, this.data.pageSize);

      const newRecords = result.records || [];
      const totalCount = result.total || 0;
      const hasMore = newRecords.length === this.data.pageSize;

      // 格式化时间戳
      const formattedRecords = newRecords.map((record: HistoryRecord) => ({
        ...record,
        createdAtFormatted: this.formatDateTime(record.createdAt)
      }));

      this.setData({
        records: this.data.page === 1 ? formattedRecords : [...this.data.records, ...formattedRecords],
        totalCount,
        hasMore,
        loading: false
      });

    } catch (error) {
      console.error('加载历史记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  async loadMoreRecords() {
    const nextPage = this.data.page + 1;
    this.setData({ page: nextPage });
    await this.loadHistoryRecords();
  },

  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      records: []
    });
    await this.loadHistoryRecords();
    wx.stopPullDownRefresh();
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

  onRecordTap(event: any) {
    const recordId = event.currentTarget.dataset.id;
    const record = this.data.records.find(r => r.id === recordId);

    if (record) {
      // 跳转到结果页面，重新展示测算结果
      wx.navigateTo({
        url: `/pages/result/result?fromHistory=true&recordId=${recordId}`
      });
    }
  },

  onDeleteRecord(event: any) {
    const recordId = event.currentTarget.dataset.id;
    this.setData({
      showDeleteConfirm: true,
      deleteTargetId: recordId
    });
  },

  async confirmDelete() {
    const openid = wx.getStorageSync('openid') || '';
    const recordId = this.data.deleteTargetId;

    try {
      await deleteHistoryRecord(openid, recordId);

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      // 刷新列表
      this.refreshData();

    } catch (error) {
      console.error('删除记录失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }

    this.setData({
      showDeleteConfirm: false,
      deleteTargetId: ''
    });
  },

  cancelDelete() {
    this.setData({
      showDeleteConfirm: false,
      deleteTargetId: ''
    });
  },

  formatDateTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? '刚刚' : `${minutes}分钟前`;
      }
      return `${hours}小时前`;
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  },

  navigateToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onShareAppMessage() {
    return {
      title: '我的生辰八字测算记录',
      path: '/pages/history/history'
    };
  }
});