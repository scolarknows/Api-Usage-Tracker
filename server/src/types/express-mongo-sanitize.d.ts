declare module 'express-mongo-sanitize' {
  import type { RequestHandler } from 'express';

  function mongoSanitize(options?: { replaceWith?: string; allowDots?: boolean }): RequestHandler;
  export default mongoSanitize;
}
