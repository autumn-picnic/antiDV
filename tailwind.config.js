/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    typography: require('./typography'),
    extend: {
      fontFamily: {
        sans: ['PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
      },
      colors: {
        // 小安暖色系統
        warm: {
          50: '#FBF8F4', // 米白背景
          100: '#F5E6D3', // 暖沙色（AI 消息氣泡）
          200: '#EDD4B8',
          300: '#E3C09A',
          400: '#D9AC7C',
          500: '#C8905A', // 暖棕強調
        },
        coral: {
          50: '#FDF2EC',
          100: '#FAE0CC',
          200: '#F5C9A8',
          300: '#EEB082',
          400: '#E8A87C', // 珊瑚橘（用戶消息氣泡 / CTA）
          500: '#D98B5A',
          600: '#C26F3A',
        },
        safe: {
          50: '#EEF7F5',
          100: '#CCE9E3',
          300: '#7CB9A8', // 安全綠（提示、標籤）
          500: '#4A9585',
          700: '#2C6B5E',
        },
        // 保持 primary 映射到珊瑚橘，讓現有組件無縫過渡
        primary: {
          50: '#FDF2EC',
          100: '#FAE0CC',
          200: '#F5C9A8',
          300: '#EEB082',
          600: '#E8A87C',
          700: '#D98B5A',
        },
        // 暖灰替換冷灰
        gray: {
          50: '#FAF8F6',
          100: '#F2EDE8',
          200: '#E6DDD5',
          300: '#D4C8BC',
          400: '#B5A898',
          500: '#8F7E6E',
          700: '#5C4D3E',
          800: '#3D3028',
          900: '#231A12',
        },
        blue: {
          500: '#FAE0CC',
        },
        green: {
          50: '#EEF7F5',
          100: '#CCE9E3',
          800: '#2C6B5E',
        },
        yellow: {
          100: '#FDF6E3',
          800: '#7A5C00',
        },
        purple: {
          50: '#FAF6FF',
        },
        indigo: {
          25: '#FDF8F5',
          100: '#FAE0CC',
          600: '#E8A87C',
        },
      },
      screens: {
        mobile: '100px',
        // => @media (min-width: 100px) { ... }
        tablet: '640px', // 391
        // => @media (min-width: 600px) { ... }
        pc: '769px',
        // => @media (min-width: 769px) { ... }
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
