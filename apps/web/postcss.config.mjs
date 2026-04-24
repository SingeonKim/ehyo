/**
 * Tailwind CSS v4는 @tailwindcss/postcss 플러그인으로 동작한다.
 * 별도 tailwind.config.js 파일 없이 app/globals.css의 @theme 블록이 설정 역할을 한다.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
