/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 卡通化设计的明亮色彩
        primary: '#FF6B6B', // 活泼的红色
        secondary: '#4ECDC4', // 清新的青色
        accent: '#FFD166', // 明亮的黄色
        success: '#06D6A0', // 成功绿色
        danger: '#EF476F', // 危险红色
        info: '#118AB2', // 信息蓝色
        light: '#F8F9FA', // 浅色背景
        dark: '#212529', // 深色文字
        // 积分系统专用色
        coin: '#FFC107', // 金币黄色
        diamond: '#00BCD4', // 钻石蓝色
        energy: '#FF5722', // 能量橙色
      },
      fontFamily: {
        sans: ['Comic Sans MS', 'Bubblegum Sans', 'system-ui', 'sans-serif'],
        display: ['"Comic Neue"', 'cursive'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};