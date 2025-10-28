import { getFavoriteRecords, deleteFavoriteRecord } from '../../utils/api';
import { AuthManager } from '../../utils/auth';

interface FavoriteRecord {
  id: string;
  title: string;
  content: string;
  type: 'full_result' | 'paragraph';
  sourceHistoryId?: string;
  createdAt: string;
  createdAtFormatted?: string;
}

interface FavoritesPageData {
  favorites: FavoriteRecord[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  showDeleteConfirm: boolean;
  deleteTargetId: string;
  filterType: 'all' | 'full_result' | 'paragraph';
}

Page({
  data: {
    favorites: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    totalCount: 0,
    showDeleteConfirm: false,
    deleteTargetId: '',
    filterType: 'all'
  } as FavoritesPageData,

  onLoad() {
    this.loadFavoriteRecords();
  },

  onShow() {
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

  async loadFavoriteRecords() {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 检查登录状态
      if (!AuthManager.isLoggedIn()) {
        wx.showModal({
          title: '请先登录',
          content: '查看收藏内容需要先登录账号',
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

      const result = await getFavoriteRecords(openid, this.data.page, this.data.pageSize);

      const newFavorites = result.favorites || [];
      const totalCount = result.total || 0;
      const hasMore = newFavorites.length === this.data.pageSize;

      // 格式化时间戳
      const formattedFavorites = newFavorites.map((favorite: FavoriteRecord) => ({
        ...favorite,
        createdAtFormatted: this.formatDateTime(favorite.createdAt)
      }));

      this.setData({
        favorites: this.data.page === 1 ? formattedFavorites : [...this.data.favorites, ...formattedFavorites],
        totalCount,
        hasMore,
        loading: false
      });

    } catch (error) {
      console.error('加载收藏记录失败:', error);
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
    await this.loadFavoriteRecords();
  },

  async refreshData() {
    this.setData({
      page: 1,
      hasMore: true,
      favorites: []
    });
    await this.loadFavoriteRecords();
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

  onFavoriteTap(event: any) {
    const favoriteId = event.currentTarget.dataset.id;
    const favorite = this.data.favorites.find(f => f.id === favoriteId);

    if (favorite) {
      if (favorite.sourceHistoryId) {
        // 如果有来源历史记录，跳转到历史记录详情
        wx.navigateTo({
          url: `/pages/result/result?fromHistory=true&recordId=${favorite.sourceHistoryId}`
        });
      } else {
        // 显示收藏内容详情
        this.showFavoriteDetail(favorite);
      }
    }
  },

  showFavoriteDetail(favorite: FavoriteRecord) {
    wx.showModal({
      title: favorite.title,
      content: favorite.content.length > 200 ? favorite.content.substring(0, 200) + '...' : favorite.content,
      showCancel: false,
      confirmText: '确定'
    });
  },

  onDeleteFavorite(event: any) {
    const favoriteId = event.currentTarget.dataset.id;
    this.setData({
      showDeleteConfirm: true,
      deleteTargetId: favoriteId
    });
  },

  async confirmDelete() {
    const openid = wx.getStorageSync('openid') || '';
    const favoriteId = this.data.deleteTargetId;

    try {
      await deleteFavoriteRecord(openid, favoriteId);

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      // 刷新列表
      this.refreshData();

    } catch (error) {
      console.error('删除收藏失败:', error);
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

  onFilterChange(event: any) {
    const filterType = event.currentTarget.dataset.type;
    this.setData({ filterType });
    this.refreshData();
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
      title: '我的生辰八字收藏',
      path: '/pages/favorites/favorites'
    };
  }
});