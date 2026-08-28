declare module "cors";

declare global {
  namespace Express {
    interface Request {
      user?: import("./db.js").User;
    }
  }
}

export {};
