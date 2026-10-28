export type WechatChannel = 'official' | 'assistant'

interface WechatContact {
  label: string
  description: string
  qrSrc?: string
  account?: string
}

// Add the supplied, verified QR images under public/brand and set their paths here.
export const wechatContacts: Record<WechatChannel, WechatContact> = {
  official: { label: '微信公众号', description: '关注小安，了解我们的最新消息。', account: 'xiaoansupport', qrSrc: '/brand/wechat-official-qr.jpg' },
  assistant: { label: '微信小助手', description: '扫码添加小安的微信小助手。', account: 'wxid_goyhso1jvx0612', qrSrc: '/brand/wechat-assistant-qr.png' },
}

export const socialLinks = {
  xiaohongshu: 'https://xhslink.cn/o/3i2y7aOQJiQ',
  instagram: 'https://www.instagram.com/xiaoansupport?rpxt=MTVseXh5OWM2Z2Rybg==',
}
