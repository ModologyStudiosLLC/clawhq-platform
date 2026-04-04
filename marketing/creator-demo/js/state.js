/**
 * CreatorCore Suite — State Management
 */

class StateManager {
  constructor() {
    this.state = {
      user: {
        name: 'Creator',
        plan: 'Pro',
        avatar: null
      },
      agents: [],
      analytics: {
        revenue: { monthly: 12847, change: 12.3 },
        subscribers: { count: 34200, change: 8.7 },
        engagement: { rate: 4.2, change: -0.3 },
        content: { published: 247, drafts: 18 }
      },
      settings: {
        theme: 'dark',
        notifications: true,
        autoPublish: false,
        aiAssist: true,
        crossPost: true
      },
      dashboard: {
        timeRange: '30d',
        agents: this.getDefaultAgents()
      }
    };
    this.listeners = {};
    this.loadFromStorage();
  }

  getDefaultAgents() {
    return [
      { id: 'content-gen', name: 'Content Generator', icon: '✦', color: 'purple', status: 'active', desc: 'Generates blog posts, social media content, newsletters, and scripts using your brand voice and content guidelines.', capabilities: ['Blog Posts', 'Social Media', 'Newsletters', 'Video Scripts', 'Product Descriptions'], metrics: { tasks: 1247, success: 98.2, avgTime: '2.3s' } },
      { id: 'brand-voice', name: 'Brand Voice', icon: '◈', color: 'blue', status: 'active', desc: 'Maintains consistent brand voice across all content. Learns from your existing content and enforces style guidelines.', capabilities: ['Voice Analysis', 'Style Enforcement', 'Tone Adjustment', 'Brand Guidelines', 'Consistency Checks'], metrics: { tasks: 856, success: 99.1, avgTime: '0.8s' } },
      { id: 'audience', name: 'Audience Analyst', icon: '◉', color: 'green', status: 'active', desc: 'Analyzes audience behavior, engagement patterns, and content preferences to optimize your content strategy.', capabilities: ['Engagement Analysis', 'Audience Segmentation', 'Peak Time Detection', 'Content Scoring', 'Trend Prediction'], metrics: { tasks: 2103, success: 97.8, avgTime: '1.5s' } },
      { id: 'scheduler', name: 'Smart Scheduler', icon: '◎', color: 'amber', status: 'active', desc: 'Automatically schedules content across platforms for optimal engagement. Adapts to audience activity patterns.', capabilities: ['Cross-Platform Scheduling', 'Optimal Timing', 'Queue Management', 'Timezone Handling', 'Conflict Resolution'], metrics: { tasks: 4521, success: 99.7, avgTime: '0.3s' } },
      { id: 'trend', name: 'Trend Scout', icon: '◇', color: 'pink', status: 'syncing', desc: 'Monitors trending topics, hashtags, and content formats in your niche. Alerts you to opportunities before they peak.', capabilities: ['Trend Detection', 'Hashtag Research', 'Viral Prediction', 'Competitor Monitoring', 'Topic Suggestions'], metrics: { tasks: 892, success: 94.5, avgTime: '3.1s' } },
      { id: 'optimizer', name: 'SEO Optimizer', icon: '◆', color: 'cyan', status: 'active', desc: 'Optimizes content for search engines and platform algorithms. Handles keyword research, meta tags, and readability.', capabilities: ['Keyword Research', 'Meta Optimization', 'Readability Scoring', 'Schema Markup', 'SERP Analysis'], metrics: { tasks: 634, success: 96.8, avgTime: '1.9s' } },
      { id: 'editor', name: 'Copy Editor', icon: '◐', color: 'purple', status: 'active', desc: 'Reviews and polishes content for grammar, clarity, and engagement. Maintains your brand voice while improving quality.', capabilities: ['Grammar Check', 'Clarity Enhancement', 'Engagement Optimization', 'Fact Verification', 'Readability Improvement'], metrics: { tasks: 1589, success: 99.4, avgTime: '1.2s' } },
      { id: 'analytics', name: 'Revenue Analyst', icon: '◑', color: 'green', status: 'active', desc: 'Tracks revenue across all channels, identifies growth opportunities, and forecasts future earnings based on trends.', capabilities: ['Revenue Tracking', 'Growth Forecasting', 'Channel Analysis', 'Conversion Optimization', 'ROI Calculation'], metrics: { tasks: 342, success: 98.9, avgTime: '2.7s' } },
      { id: 'social', name: 'Social Manager', icon: '◒', color: 'blue', status: 'syncing', desc: 'Manages social media presence across platforms. Handles posting, engagement, community management, and DM triage.', capabilities: ['Multi-Platform Posting', 'Comment Management', 'DM Triage', 'Community Building', 'Engagement Tracking'], metrics: { tasks: 3247, success: 97.2, avgTime: '0.9s' } },
      { id: 'email', name: 'Email Agent', icon: '◓', color: 'amber', status: 'active', desc: 'Manages email marketing campaigns, automations, and subscriber segmentation. Writes and optimizes email content.', capabilities: ['Campaign Creation', 'Automation Setup', 'Segmentation', 'A/B Testing', 'Deliverability Optimization'], metrics: { tasks: 187, success: 98.5, avgTime: '4.2s' } },
      { id: 'video', name: 'Video Strategist', icon: '◔', color: 'pink', status: 'active', desc: 'Plans video content strategy, generates scripts and storyboards, and optimizes for YouTube, TikTok, and Reels.', capabilities: ['Script Writing', 'Storyboarding', 'Thumbnail Concepts', 'SEO Titles', 'Content Calendar'], metrics: { tasks: 234, success: 95.7, avgTime: '5.1s' } },
      { id: 'ip', name: 'IP Protector', icon: '◕', color: 'cyan', status: 'active', desc: 'Monitors for content theft, handles DMCA claims, manages licensing agreements, and tracks IP portfolio value.', capabilities: ['Theft Detection', 'DMCA Filing', 'License Management', 'Portfolio Tracking', 'Revenue from IP'], metrics: { tasks: 567, success: 99.8, avgTime: '1.1s' } }
    ];
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.state);
  }

  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.state);
    target[last] = value;
    this.emit('change', { key, value });
    this.saveToStorage();
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('creatorcore-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(this.state.settings, parsed.settings || {});
      }
    } catch (e) {}
  }

  saveToStorage() {
    try {
      localStorage.setItem('creatorcore-state', JSON.stringify({
        settings: this.state.settings
      }));
    } catch (e) {}
  }
}

window.CreatorState = new StateManager();
