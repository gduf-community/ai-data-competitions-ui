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
})
