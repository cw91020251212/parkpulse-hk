export const isStaticPages = import.meta.env.MODE === 'pages';

export function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
