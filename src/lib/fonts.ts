import localFont from 'next/font/local'

export const inter = localFont({
  src: '../fonts/InterVariable.woff2',
  display: 'swap',
  variable: '--font-inter',
})

export const mono = localFont({
  src: [
    {
      path: '../fonts/JetBrainsMono-Variable.ttf',
      style: 'normal',
    },
    {
      path: '../fonts/JetBrainsMono-Italic-Variable.ttf',
      style: 'italic',
    },
  ],
  display: 'swap',
  variable: '--font-mono-custom',
  // 等宽字体只用于管理台/安全页；根布局会在所有路由预加载字体，关闭预加载避免公开页下载未使用的 TTF。
  preload: false,
})
