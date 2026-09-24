import { onRequest as __api___path___js_onRequest } from "C:\\Users\\Edison\\Desktop\\闲鱼\\YXMYSBD\\huodao-bd\\publish\\functions\\api\\[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]