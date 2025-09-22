// 引入 Firebase Functions v2 的 HTTPS 功能（用于创建 HTTP/HTTPS 云函数）
const https = require("firebase-functions/v2/https");
// 引入全局配置设置函数（可统一设置区域、并发等）
const {setGlobalOptions} = require("firebase-functions/v2");
// 引入 Secret 管理（从 GCP Secret Manager 读取机密）
const {defineSecret} = require("firebase-functions/params");
// 引入 CORS 中间件，{ origin: true } 表示允许请求源自动回显
const cors = require("cors")({origin: true});

// 声明一个名为 STRIPE_SK 的机密（Stripe 私钥），部署后用
const STRIPE_SK = defineSecret("STRIPE_SK");

// 统一设置云函数所在区域（需与前端调用的 URL 中 region 一致）
setGlobalOptions({region: "us-central1"});

// 导出一个 HTTPS 云函数：createPaymentIntent
// - 通过 onRequest 暴露 HTTP 接口（POST）
// - 声明依赖的机密：{ secrets: [STRIPE_SK] }，保证运行时可读取私钥
exports.createPaymentIntent = https.onRequest(
    {secrets: [STRIPE_SK]},
    (req, res) => {
      // 使用 CORS 中间件处理跨域
      cors(req, res, async () => {
        // 处理浏览器的预检请求（OPTIONS）
        if (req.method === "OPTIONS") {
          res.set("Access-Control-Allow-Origin", "*");
          res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
          res.set("Access-Control-Allow-Headers", "Content-Type");
          // 204 表示无内容，结束预检
          res.status(204).send("");
          return;
        }

        try {
          // 仅允许 POST，其它方法返回 405
          if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
          }

          // 读取请求体
          const b = req.body || {};
          // 金额（注意：Stripe 期望的是“最小货币单位”，
          const amt = Number(b.amount);
          // 货币代码，默认 AUD
          const cur = b.currency || "AUD";

          // 基础校验：必须有金额，且 >= 50（即 0.50 AUD）
          if (!amt || amt < 50) {
            res.status(400).json({error: "Invalid amount"});
            return;
          }

          // 在函数体内初始化 Stripe（此时 Secret 已可用）
          const stripe = require("stripe")(STRIPE_SK.value());

          // 创建 Payment Intent，开启自动支付方式（支持卡等）
          const pi = await stripe.paymentIntents.create({
            amount: amt,
            currency: cur,
            automatic_payment_methods: {enabled: true},
          });
          res.set("Access-Control-Allow-Origin", "*");
          // 返回给前端的 clientSecret，前端用它来 confirm 支付
          res.json({clientSecret: pi.client_secret});
        } catch (e) {
          // 打印错误日志，便于在 Firebase 控制台或 CLI 查看
          console.error(e);
          // 返回通用服务端错误
          res.status(500).json({error: "server_error"});
        }
      });
    },
);
